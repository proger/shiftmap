var jsfeat = require("jsfeat");
var profiler = require("./profiler.js");
var compatibility = require("./compatibility.js");
var prob = require("./prob.js")

var canvas, ctx, canvasWidth, canvasHeight;

function tick() {

    var img = document.getElementById("sourceImage");

    ctx.drawImage(img, 0, 0);
    var imageData = ctx.getImageData(0, 0, img.width, img.height);

    var gray_img = new jsfeat.matrix_t(img.width, img.height, jsfeat.U8_t | jsfeat.C1_t);
    var code = jsfeat.COLOR_RGBA2GRAY;
    jsfeat.imgproc.grayscale(imageData.data, img.width, img.height, gray_img, code);

    var blur_img = new jsfeat.matrix_t(img.width, img.height, jsfeat.U8_t | jsfeat.C1_t);
    jsfeat.imgproc.gaussian_blur(gray_img, blur_img, 9);
    var gradient = new jsfeat.matrix_t(img.width, img.height, jsfeat.F32_t | jsfeat.C2_t);
    jsfeat.imgproc.sobel_derivatives(blur_img, gradient);


    var magnitude = new jsfeat.matrix_t(img.width, img.height, jsfeat.F32_t | jsfeat.C1_t);

    for(i = 0; i < gradient.rows; i++){
        for(j = 0; j < gradient.cols; j++) {
            var idx = i * gradient.cols + j;
            magnitude.data[idx] = Math.sqrt(
                gradient.data[2 * idx] * gradient.data[2 * idx] +
                gradient.data[2 * idx + 1] * gradient.data[2 * idx + 1])
        }
    }

    // render result back to canvas
    var data_u32 = new Uint32Array(imageData.data.buffer);
    var alpha = (0xff << 24);
    var i = magnitude.cols*magnitude.rows, pix = 0;
    while(--i >= 0) {
        pix = 128 + Math.round(0.3 * magnitude.data[i]);
        data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
    }

    ctx.putImageData(imageData, 0, 0);

}

document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('canvas');
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    ctx = canvas.getContext('2d');

    ctx.fillStyle = "rgb(0,255,0)";
    ctx.strokeStyle = "rgb(0,255,0)";

    compatibility.requestAnimationFrame(tick);
});
