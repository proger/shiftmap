console.log("webppl vsn: " + webppl.version);

shiftmaps = require("./shiftmaps.js"); // global!

g_monomap_in = {};

g_cb = null;

// XXX: figure out how to compile this at build time
var monomap = function() {
    var w = g_monomap_in.width,
        h = g_monomap_in.height,
        saliency = g_monomap_in.saliency,
        img_matrix = g_monomap_in.img_matrix;

    var clamp = function(x,y) {
        // XXX: is it better to condition instead?
        return [Math.trunc(Math.min(Math.max(x, 0), w)),
                Math.trunc(Math.min(Math.max(y, 0), h))];
    };

    var model = function() {
        // the map is always monotone
        var xs = Gamma({shape: 1, scale: 5});
        //var ys = Gaussian({mu: 0, sigma: 5});
        var proposal = map(function(i) {
            map(function(j) {
                // pixel rearrangement: force left/right columns to stay the same
                var vec = (
                    j === 0 || j === (w-1)
                ) ? [0, (j === w-1) ? (w-j) : 0] : clamp(sample(xs),
                                                         // XXX: do not touch ys
                                                         //sample(ys)
                                                         0
                                                        );
                // pixel saliency (through gradient)
                var psal = saliency.data[(i + vec[0]) * saliency.cols +
                                         (j + vec[1])];
                var salscore = ((psal !== psal) || !psal) ? 0 : (Math.round(psal) - 127);
                factor(10*salscore);
                return vec;
            }, _.range(w));
        }, _.range(h));
        //console.log(proposal);
        // smoothness term: shift-map continuity
        factor(-10*shiftmaps.countShiftmapDiscontinuties(proposal));
        // color / gradient differences
        factor(-0.001*shiftmaps.getColorAndGradDiscontinuties(img_matrix, proposal));        
        return proposal;
    };

    var maxap = Infer({method: 'MCMC',
                       samples: 100,
                       verbose: true,
                       onlyMAP: true,
                       callbacks: prob.progressCallbacks()
                      }, model);
    var maxval = maxap[Object.keys(maxap)[0]].dist;
    return JSON.parse(Object.keys(maxval)[0]);

    // var maxap = Infer({method: 'SMC',
    //                    particles: 1000
    //                    //rejuvSteps: 1,
    //                    //rejuvKernel: 'HMC'  // slow?
    //                   }, model);
    // return MAP(maxap).val;
};

function progressCallbacks() {
    var completed = 0, total = 0;
    return {
        setup: function(n) {
            total = n;
        },
        iteration: function(trace) {
            g_cb(null, trace.value);
            completed += 1;
        }
    };
}

function evalf(fun, callback) {
    var term = ['(',fun.toString(),')()'].join('');
    var wpterm = eval.call({}, webppl.compile(term));

    g_cb = callback;
    var handleError = function(e) {
        if (e) {
            console.error(e);
        }
        callback(arguments, null);
    };
    var timeslice = 100;
    var baseRunner = util.trampolineRunners.web(timeslice);
    var success = function(_globalStore, retval) {
        try {
            callback(null, retval);
        } catch (e) {
            console.error("callback errored: " + JSON.stringify(e));
            throw e;
        }
    };
    var prepared = webppl.prepare(wpterm,
                                  success,
                                  {errorHandlers: [handleError],
                                   debug: false,
                                   baseRunner: baseRunner});

    prepared.run();
}

module.exports = {
    monomap: function(w, h, s, i, callback) {
        g_monomap_in = {width: w, height: h, saliency: s, img_matrix: i};
        evalf(monomap, callback);
    },
    progressCallbacks: progressCallbacks
};
