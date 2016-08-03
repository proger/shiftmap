var jsfeat = require("jsfeat");
var profiler = require("./profiler.js");
var compatibility = require("./compatibility.js");
var prob = require("./prob.js")

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
    var i = matrix.cols*matrox.rows;
    while (--i >= 0) {
        data_u32[i] = matrix.data[i];
    }
}

function withCanvasImageData(canvas, image, callback) {
    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    var imageData = ctx.getImageData(0, 0, image.width, image.height);
    callback(imageData);
    ctx.putImageData(imageData, 0, 0);
}

function tick() {
    var img = document.getElementById("sourceImage");

    withCanvasImageData(document.getElementById('canvas'), img, function(imageData) {
        var w = imageData.width,
            h = imageData.height;
        
        var gray_img = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(imageData.data, w, h, gray_img, jsfeat.COLOR_RGBA2GRAY);

        var blur_img = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.gaussian_blur(gray_img, blur_img, 9);
        
        var gradient = new jsfeat.matrix_t(w, h, jsfeat.F32_t | jsfeat.C2_t);
        jsfeat.imgproc.sobel_derivatives(blur_img, gradient);

        var magnitude = new jsfeat.matrix_t(w, h, jsfeat.F32_t | jsfeat.C1_t);

        for(i = 0; i < gradient.rows; i++){
            for(j = 0; j < gradient.cols; j++) {
                var idx = i * gradient.cols + j;
                magnitude.data[idx] = Math.sqrt(
                    gradient.data[2 * idx] * gradient.data[2 * idx] +
                        gradient.data[2 * idx + 1] * gradient.data[2 * idx + 1])
            }
        }

        matrix2id_gray(magnitude, imageData);
    });

    withCanvasImageData(document.getElementById('resample'), img, function(imageData) {
        var w = 300,
            h = imageData.height;

        var dest = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C3_t);
        jsfeat.imgproc.resample(imageData.data, dest, w, h); // XXX wtf
        
        matrix2id_rgba(dest, imageData);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    compatibility.requestAnimationFrame(tick);
});
