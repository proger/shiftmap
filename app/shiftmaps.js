var jsfeat = require("jsfeat");

function countShiftmapDiscontinuties(shiftmap) {
    var count = 0;
    var dirs = [[ 0, -1], // above
                [ 0,  1], // bellow
                [-1,  0], // left
                [ 1,  0]]; // right

    for(var i = 0; i < shiftmap.length; i++) {
        for(var j = 0; j < shiftmap[i].length; j++) {
            for(d = 0; d < dirs.length; d++){
                var ii = i + dirs[d][1], jj = j + dirs[d][0];
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
    applyShiftmap: applyShiftmap
};
