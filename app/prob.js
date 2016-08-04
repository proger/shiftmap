console.log("webppl vsn: " + webppl.version);

g_monomap_in = {};

// XXX: figure out how to compile this at build time
var monomap = function() {
    var w = g_monomap_in.width,
        h = g_monomap_in.height;

    //debugger
    var clamp = function(vec) {
        // XXX: is it better to condition instead?
        return {
            x: Math.trunc(Math.min(Math.max(vec.x, 0), w)),
            y: Math.trunc(Math.min(Math.max(vec.y, 0), h))
        };
    }; 

    var maxap = MAP(Infer({method: 'MCMC', samples: 5}, function() {
        var xs = Gamma({shape: 1, scale: 5});
        var ys = Gaussian({mu: 0, sigma: 5});
        var vec = function() {
            return clamp({x: sample(xs), y: sample(ys)}) ;
        };
        var proposal = map(function(j) {
            map(function(i) {
                return j === 0 ? {x:i, y:j} : vec();
            }, _.range(w));
        }, _.range(h));
        // XXX: global function
        // factor(-countShiftmapDiscontinuties(proposal));
        return proposal;
    })).val;
    //console.log("maxap: " + maxap);
    return maxap;
};

function evalf(fun) {
    var term = ['(',fun.toString(),')()'].join('');
    var wpterm = eval.call({}, webppl.compile(term));

    var handleError = function() {
        // XXX: propagate this?
        console.log(arguments);
    };
    var baseRunner = util.trampolineRunners.web(Infinity);
    var retVal = "MONKEY";
    var prepared = webppl.prepare(wpterm,
                                  function(_globalStore, retval) {
                                      retVal = retval;
                                  },
                                  {errorHandlers: [handleError],
                                   debug: false,
                                   baseRunner: baseRunner});

    prepared.run();
    return retVal;
}

module.exports = {
    monomap: function(w, h) {
        g_monomap_in = {width: w, height: h};
        return evalf(monomap);
    }
};
