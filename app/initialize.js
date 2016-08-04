var jsfeat = require("jsfeat");
var profiler = require("./profiler.js");
var compatibility = require("./compatibility.js");
prob = require("./prob.js");

/// repopulates RGBA imageData buffer using the grayscale matrix (mutating)
function matrix2id_gray(matrix, imageData) {
    var data_u32 = new Uint32Array(imageData.data.buffer);
    var alpha = (0xff << 24);
    var i = matrix.cols*matrix.rows, pix = 0;
    while (--i >= 0) {
        pix = 128 + Math.round(0.3 * matrix.data[i]);
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

function withCanvasImageData(canvas, image, callback) {
    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    var imageData = ctx.getImageData(0, 0, image.width, image.height);
    callback(imageData);
    ctx.putImageData(imageData, 0, 0);
}

function getGradientMagnitude(img) {
    var w = img.width;
    var h = img.height;

    var gray_img = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    jsfeat.imgproc.grayscale(img.data, w, h, gray_img, jsfeat.COLOR_RGBA2GRAY);

    var blur_img = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    jsfeat.imgproc.gaussian_blur(gray_img, blur_img, 9);

    var gradient = new jsfeat.matrix_t(w, h, jsfeat.F32_t | jsfeat.C2_t);
    jsfeat.imgproc.sobel_derivatives(blur_img, gradient);

    var magnitude = new jsfeat.matrix_t(w, h, jsfeat.F32_t | jsfeat.C1_t);

    for (i = 0; i < gradient.rows; i++){
        for (j = 0; j < gradient.cols; j++) {
            var idx = i * gradient.cols + j;
            magnitude.data[idx] = Math.sqrt(
                gradient.data[2 * idx] * gradient.data[2 * idx] +
                    gradient.data[2 * idx + 1] * gradient.data[2 * idx + 1]);
        }
    }
    return magnitude;
}

function countShiftmapDiscontinuties(shiftmap) {
    var count = 0;
    var dirs = [{x:  0, y: -1}, // above
                {x:  0, y:  1}, // bellow
                {x: -1, y:  0}, // left
                {x:  1, y:  0}]; // right

    for(var i = 0; i < shiftmap.length; i++) {
        for(var j = 0; j < shiftmap[i].length; j++) {
            for(d = 0; d < dirs.length; d++){
                var ii = i + dirs[d].y, jj = j + dirs[d].x;
               // Handle top and bottom rows
                if(ii < 0 || ii === shiftmap.length) {
                    continue;
                }
                // Handle left and right cols
                if (jj < 0 || jj === shiftmap[i].length) {
                    continue;
                }

               if(shiftmap[i][j].x !== shiftmap[ii][jj].x ||
                  shiftmap[i][j].y !== shiftmap[ii][jj].y) {
                   count++;
                }
            }
        }
    }

    return count;
}

function applyShiftmap(src, shiftmap) {
    var dest = new jsfeat.matrix_t(shiftmap[0].length, shiftmap.length, jsfeat.U8_t | jsfeat.C3_t);
    for(var i = 0; i < shiftmap.length; i++) {
        for(var j = 0; j < shiftmap[i].length; j++) {
            var src_loc = {x: j + shiftmap[i][j].x,
                           y: i + shiftmap[i][j].y};
            var dest_idx = 3 * (i * shiftmap[i].length + j);
            var src_idx = 4 * (src_loc.y * src.width + src_loc.x);

            dest.data[dest_idx] = src.data[src_idx];
            dest.data[dest_idx + 1] = src.data[src_idx + 1];
            dest.data[dest_idx + 2] = src.data[src_idx + 2];
        }
    }
    return dest;
}

function tick() {
    var img = document.getElementById("sourceImage");

    withCanvasImageData(document.getElementById('canvas'), img, function(imageData) {
        var magnitude = getGradientMagnitude(imageData);
        matrix2id_gray(magnitude, imageData);
    });

    var shiftmap = new Array(50);
    for(var i = 0; i < shiftmap.length; i++) {
        shiftmap[i] = new Array(50);
        for(var j = 0; j < shiftmap[i].length; j++) {
            shiftmap[i][j] = {x: 100, y: 0};
        }
    }

    // var shiftmap = prob.monomap(imageData.width, imageData.height);
    // console.log("shiftmap: " + shiftmap);
    // console.log("shiftmap discontinuities: " + countShiftmapDiscontinuties(shiftmap));
    // withCanvasImageData(OffscreenCanvas(img.width, img.height), img, function(offid) {
    //     applyShiftmap(offid, shiftmap, imagedata);
    // });

    withCanvasImageData(document.getElementById('canvas'), img, function(imageData) {
        var dest = applyShiftmap(imageData, shiftmap);
        matrix2id_rgba(dest, imageData);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    compatibility.requestAnimationFrame(tick);
});
