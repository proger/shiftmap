var jsfeat = require("jsfeat");

function countShiftmapDiscontinuties(shiftmap) {
    var count = 0;
    var dirs = [[ 0, -1],  // above
                [ 0,  1],  // bellow
                [-1,  0],  // left
                [ 1,  0]]; // right

    for(var i = 0; i < shiftmap.length; i++) {
        for(var j = 0; j < shiftmap[i].length; j++) {
            for(d = 0; d < dirs.length; d++){
                var ii = i + dirs[d][1],
                    jj = j + dirs[d][0];
               // Handle top and bottom rows
                if(ii < 0 || ii === shiftmap.length) {
                    continue;
                }
                // Handle left and right cols
                if (jj < 0 || jj === shiftmap[i].length) {
                    continue;
                }

               if(shiftmap[i][j][0] !== shiftmap[ii][jj][0] ||
                  shiftmap[i][j][1] !== shiftmap[ii][jj][1]) {
                   count++;
                }
            }
        }
    }

    return count;
}

// XXX: currently assumes this is the shiftmap is the same size as src?
function getColorAndGradDiscontinuties(src, shiftmap) {
    var res = applyShiftmap(src, shiftmap)

    var src_grad = getGradientMagnitude(src)
    var res_grad = getGradientMagnitude(res)

    var rgb_smoothness = 0.0, grad_smoothness = 0.0

    var dirs = [[ 0, -1], // above
                [ 0,  1], // bellow
                [-1,  0], // left
                [ 1,  0]] // right
    for(var i = 0; i < shiftmap.length; i++) {
        for(var j = 0; j < shiftmap[i].length; j++) {
            for(var d = 0; d < dirs.length; d++) {
                var res_ii = i + dirs[d][1], res_jj = j + dirs[d][0]
                // Handle top and bottom rows
                if(res_ii < 0 || res_ii === res.rows) {
                    continue;
                }
                // Handle left and right cols
                if (res_jj < 0 || res_jj === res.cols) {
                    continue;
                }

                var src_ii = i + shiftmap[i][j][1] + dirs[d][1]
                var src_jj = j + shiftmap[i][j][0] + dirs[d][0]
                // Handle top and bottom rows
                if(src_ii < 0 || src_ii >= src.rows) {
                    continue;
                }
                // Handle left and right cols
                if (src_jj < 0 || src_jj >= src.cols) {
                    continue;
                }

                var res_idx = 3 * (res_ii * res.cols + res_jj)
                var src_idx = 3 * (src_ii * src.cols + src_jj)

                var s = 0.0;
                for(var c = 0; c < 3; c++) {
                    s += Math.pow(src.data[src_idx + c] - res.data[res_idx + c] , 2)
                }
                rgb_smoothness += Math.sqrt(s)

                var res_idx = res_ii * res.cols + res_jj
                var src_idx = src_ii * src.cols + src_jj
                grad_smoothness += Math.sqrt(Math.pow(src_grad.data[src_idx] - res_grad.data[res_idx], 2))
            }
        }
    }

    return rgb_smoothness + 2.0 * grad_smoothness
}

function getGradientMagnitude(img) {
    var gray_img = new jsfeat.matrix_t(img.cols, img.rows, jsfeat.U8_t | jsfeat.C1_t);
    jsfeat.imgproc.grayscale(img.data, img.cols, img.rows, gray_img, jsfeat.COLOR_RGB2GRAY);

    var gradient = new jsfeat.matrix_t(img.cols, img.rows, jsfeat.F32_t | jsfeat.C2_t);
    jsfeat.imgproc.sobel_derivatives(gray_img, gradient);

    var magnitude = new jsfeat.matrix_t(img.cols, img.rows, jsfeat.F32_t | jsfeat.C1_t);

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

function applyShiftmap(src, shiftmap) {
    var dest = new jsfeat.matrix_t(shiftmap[0].length, shiftmap.length, jsfeat.U8_t | jsfeat.C3_t);
    for(var i = 0; i < shiftmap.length; i++) {
        for(var j = 0; j < shiftmap[i].length; j++) {
            var src_loc = [j + shiftmap[i][j][0],
                           i + shiftmap[i][j][1]]
            var dest_idx = 3 * (i * shiftmap[i].length + j)
            var src_idx = 3 * (src_loc[1] * src.cols + src_loc[0])

            dest.data[dest_idx] = src.data[src_idx];
            dest.data[dest_idx + 1] = src.data[src_idx + 1];
            dest.data[dest_idx + 2] = src.data[src_idx + 2];
        }
    }
    return dest;
}

module.exports = {
    countShiftmapDiscontinuties: countShiftmapDiscontinuties,
    getColorAndGradDiscontinuties: getColorAndGradDiscontinuties,
    applyShiftmap: applyShiftmap,
    getGradientMagnitude: getGradientMagnitude
};
