var jsfeat = require("jsfeat");
var profiler = require("./profiler.js");
var compatibility = require("./compatibility.js");
var prob = require("./prob.js")

var stat = new profiler();
var canvas,ctx,canvasWidth,canvasHeight;

function demo_app(videoWidth, videoHeight) {
    canvasWidth  = canvas.width;
    canvasHeight = canvas.height;
    ctx = canvas.getContext('2d');

    ctx.fillStyle = "rgb(0,255,0)";
    ctx.strokeStyle = "rgb(0,255,0)";

    stat.add("grayscale");
}

function tick() {
    stat.new_frame();

    var myImage = document.getElementById("penguins");

    ctx.drawImage(myImage, 0, 0);
    var imageData = ctx.getImageData(0, 0, 640, 480);

    stat.start("grayscale");
    var gray_img = new jsfeat.matrix_t(640, 480, jsfeat.U8_t | jsfeat.C1_t);
    var code = jsfeat.COLOR_RGBA2GRAY;
    jsfeat.imgproc.grayscale(imageData.data, 640, 480, gray_img, code);
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
    demo_app();
    compatibility.requestAnimationFrame(tick);
});
