console.log("webppl vsn: " + webppl.version);

shiftmaps = require("./shiftmaps.js"); // global!

g_monomap_in = {};

// XXX: figure out how to compile this at build time
var monomap = function() {
    var w = g_monomap_in.width,
        h = g_monomap_in.height,
        saliency = g_monomap_in.saliency;

    var clamp = function(x,y) {
        // XXX: is it better to condition instead?
        return [Math.trunc(Math.min(Math.max(x, 0), w)),
                Math.trunc(Math.min(Math.max(y, 0), h))];
    };

    var model = function() {
        var xs = Gamma({shape: 1, scale: 5});
        var ys = Gaussian({mu: 0, sigma: 5});
        var proposal = map(function(i) {
            map(function(j) {
                // pixel rearrangement: force left/right columns to stay the same
                var vec = (
                    j === 0 || j === (w-1)
                          ) ? [j,i] : clamp(sample(xs), sample(ys));
                // pixel saliency (through gradient)
                var psal = saliency.data[(i + vec[0]) * saliency.cols +
                                         (j + vec[1])];
                var salscore = ((psal !== psal) || !psal) ? 0 : (Math.round(psal) - 127);
                factor(100000*salscore);
                return vec;
            }, _.range(w));
        }, _.range(h));
        //console.log(proposal);
        // smoothness term: shift-map monotonicity
        factor(-10*shiftmaps.countShiftmapDiscontinuties(proposal));
        // TODO color / gradient differences
        return proposal;
    };

    // var maxap = Infer({method: 'MCMC',
    //                    samples: 50,
    //                    verbose: true,
    //                    onlyMAP: true}, model);
    // var maxval = maxap[Object.keys(maxap)[0]].dist;
    // return JSON.parse(Object.keys(maxval)[0]);

    var maxap = Infer({method: 'SMC',
                       particles: 10
                       //rejuvSteps: 1,
                       //rejuvKernel: 'HMC'  // slow?
                      }, model);
    return MAP(maxap).val;
};

function evalf(fun, callback) {
    var term = ['(',fun.toString(),')()'].join('');
    var wpterm = eval.call({}, webppl.compile(term));

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
    monomap: function(w, h, s, callback) {
        g_monomap_in = {width: w, height: h, saliency: s};
        evalf(monomap, callback);
    }
};
