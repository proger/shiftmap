var jsfeat = require("jsfeat");
var profiler = require("./profiler.js");
var compatibility = require("./compatibility.js");
prob = require("./prob.js"); // global to be available from js console
var shiftmaps = require("./shiftmaps.js");

/// repopulates RGBA imageData buffer using the grayscale matrix (mutating)
function matrix2id_gray(matrix, imageData) {
    var data_u32 = new Uint32Array(imageData.data.buffer);
    var alpha = (0xff << 24);
    var i = matrix.cols*matrix.rows, pix = 0;
    while (--i >= 0) {
        pix = Math.round(0.3 * matrix.data[i]);
        data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
    }
}

/// copies a jsfeat matrix into an imageData buffer (mutating)
function matrix2id_rgba(matrix, imageData) {
    var data_u32 = new Uint32Array(imageData.data.buffer);
    var i, j;

    // Clean the canvas
    for(i = 0; i < data_u32.length; i++) {
        data_u32[i] = 0xff888888;
    }

    for (i = 0; i < matrix.rows; i++) {
        for (j = 0; j < matrix.cols; j++) {
            var m_idx = 3 * (i * matrix.cols + j);
            var r = matrix.data[m_idx + 0];
            var g = matrix.data[m_idx + 1];
            var b = matrix.data[m_idx + 2];
            var s_idx = (i * imageData.width + j);
            data_u32[s_idx] = (0xff << 24) | (b << 16) | (g << 8) | r;
        }
    }
}

function id2matrix_rgb(imageData) {
    var matrix = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8_t | jsfeat.C3_t);
    for(var i = 0; i < matrix.rows; i++) {
        for(var j = 0; j < matrix.cols; j++) {
            var dest_idx = 3 * (i * matrix.cols + j)
            var src_idx = 4 * (i * imageData.width + j)

            matrix.data[dest_idx] = imageData.data[src_idx]
            matrix.data[dest_idx + 1] = imageData.data[src_idx + 1]
            matrix.data[dest_idx + 2] = imageData.data[src_idx + 2]
        }
    }
    return matrix
}

function withCanvasImageData(canvas, image, callback) {
    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    var imageData = ctx.getImageData(0, 0, image.width, image.height);
    callback(imageData, function() {
        ctx.putImageData(imageData, 0, 0);
    });
}

function dumbShiftmap(w, h, _saliency, img_matrix, callback) {
  var shiftmap = new Array(h);
  for (var i = 0; i < shiftmap.length; i++) {
    shiftmap[i] = new Array(w);
    for (var j = 0; j < shiftmap[i].length; j++) {
      shiftmap[i][j] = [Math.min(100, (img_matrix.cols - j - 1)), 0];
    }
  }

  callback(null, shiftmap);
}

function tick() {
    var img = document.getElementById("sourceImage");

    withCanvasImageData(document.getElementById('canvas'), img, function(imageData, callback) {
        var img_matrix = id2matrix_rgb(imageData);
        var gradient = shiftmaps.getGradientMagnitude(img_matrix);

        var sf = null;
        sf = prob.monomap; // just comment out this one

        (sf || dumbShiftmap)(imageData.width/2,
                             imageData.height,
                             gradient,
                             img_matrix,
                             function(_error, shiftmap) {
            //console.log("shiftmap discontinuities: " + shiftmaps.countShiftmapDiscontinuties(shiftmap));
            //console.log("RGB and grad discontinuities: " + shiftmaps.getColorAndGradDiscontinuties(img_matrix, shiftmap));
            var dest = shiftmaps.applyShiftmap(img_matrix, shiftmap);
            matrix2id_rgba(dest, imageData);

            //matrix2id_gray(gradient, imageData);
            callback();
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    compatibility.requestAnimationFrame(tick);
});
