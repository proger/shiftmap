var jsfeat = require("jsfeat");
var profiler = require("./profiler.js");
var compatibility = require("./compatibility.js");
var prob = require("./prob.js")

var stat = new profiler();
var canvas, ctx, canvasWidth, canvasHeight;

function tick() {
    stat.new_frame();

    var img = document.getElementById("sourceImage");
    ctx.drawImage(img, 0, 0);
    var imageData = ctx.getImageData(0, 0, img.width, img.height);

    stat.start("grayscale");
    var gray_img = new jsfeat.matrix_t(img.width, img.height, jsfeat.U8_t | jsfeat.C1_t);
    jsfeat.imgproc.grayscale(imageData.data, img.width, img.height, gray_img, jsfeat.COLOR_RGBA2GRAY);
    stat.stop("grayscale");

    // render result back to canvas
    var data_u32 = new Uint32Array(imageData.data.buffer);
    var alpha = (0xff << 24);
    var i = gray_img.cols*gray_img.rows, pix = 0;
    while(--i >= 0) {
        pix = gray_img.data[i];
        data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
    }

    ctx.putImageData(imageData, 0, 0);

    $('#log').html(stat.log());
}

document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('canvas');    
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    ctx = canvas.getContext('2d');

    ctx.fillStyle = "rgb(0,255,0)";
    ctx.strokeStyle = "rgb(0,255,0)";

    stat.add("grayscale");
    
    compatibility.requestAnimationFrame(tick);
});
