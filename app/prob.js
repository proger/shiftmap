console.log("webppl vsn: " + webppl.version);

shiftmaps = require("./shiftmaps.js"); // global!

g_monomap_in = {};

g_cb = null; // OMG

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

  var maplast = function(f, init, xs) {
    return reduce(function(x, acc) {
      var prev = acc[acc.length-1];
      return acc.concat([f(prev, x)]);
    }, init, xs);
  };

  var model = function() {
    // the map is always monotone
    var xs = Gamma({shape: 1, scale: 5});
    //var ys = Gaussian({mu: 0, sigma: 5});

    var proposal = map(function(i) {
      var vec0 = [0, 0]; // pixel rearrangement: leftmost column stays the same

      var rest = maplast(function(prev, j) {
        var vec = clamp(sample(xs),
                        // XXX: do not touch ys
                        //sample(ys)
                        0
                       );
        // pixel saliency (through gradient)
        var psal = saliency.data[(i + vec[1]) * saliency.cols +
                                 (j + vec[0])];
        var salscore = ((psal !== psal) || !psal) ? 0 : Math.max(0, (Math.round(psal) - 150));
        factor(salscore);
        factor(vec[0] >= prev[0] ? -10 : 100); // map continuity
        //condition(vec[0] >= prev[0]);
        return vec;
      }, [vec0], _.range(1, w-1));

      var last = [0, (w-j)]; // pixel rearrangement: rightmost column stays the same
      return [vec0].concat(rest.concat([last]));
    }, _.range(h));
    //console.log(proposal);
    // smoothness term: shift-map continuity
    factor(-0.0001*shiftmaps.countShiftmapDiscontinuties(proposal));
    // color / gradient differences
    factor(-0.000001*shiftmaps.getColorAndGradDiscontinuties(img_matrix, proposal));
    return proposal;
  };

  // var maxap = Infer({method: 'MCMC',
  //                    samples: 10000,
  //                    verbose: true,
  //                    onlyMAP: true,
  //                    callbacks: prob.progressCallbacks()
  //                   }, model);
  // var maxval = maxap[Object.keys(maxap)[0]].dist;
  // return JSON.parse(Object.keys(maxval)[0]);

  var maxap = Infer({method: 'SMC',
                     particles: 1000,
                     debug: false
                     // rejuvSteps: 2,
                     // rejuvKernel: 'HMC'  // slow?
                    }, model);
  return MAP(maxap).val;
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
