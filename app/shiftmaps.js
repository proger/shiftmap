
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

module.exports = {
    countShiftmapDiscontinuties: countShiftmapDiscontinuties
};
