console.log("webppl vsn: " + webppl.version);

shiftmaps = require("./shiftmaps.js"); // global!

g_monomap_in = {};

// XXX: figure out how to compile this at build time
var monomap = function() {
    var w = g_monomap_in.width,
        h = g_monomap_in.height;

    var clamp = function(x,y) {
        // XXX: is it better to condition instead?
        return [Math.trunc(Math.min(Math.max(x, 0), w)),
                Math.trunc(Math.min(Math.max(y, 0), h))];
    }; 

    var maxap = Infer({method: 'MCMC',
                       samples: 20, // currently second per sample
                       verbose: true,
                       onlyMAP: true}, function() {
        var xs = Gamma({shape: 1, scale: 5});
        var ys = Gaussian({mu: 0, sigma: 5});
        var proposal = map(function(j) {
            map(function(i) {
                return j === 0 ? [i,j] : clamp(sample(xs), sample(ys));
            }, _.range(w));
        }, _.range(h));
        factor(-10*shiftmaps.countShiftmapDiscontinuties(proposal));
        return proposal;
    });
    var maxval = maxap[Object.keys(maxap)[0]].dist;
    //console.log(JSON.parse(Object.keys(maxval)[0]));
    return JSON.parse(Object.keys(maxval)[0]);
};

function evalf(fun, callback) {
    var term = ['(',fun.toString(),')()'].join('');
    var wpterm = eval.call({}, webppl.compile(term));
    
    var handleError = function() {
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
    monomap: function(w, h, callback) {
        g_monomap_in = {width: w, height: h};
        evalf(monomap, callback);
    }
};
