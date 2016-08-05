console.log("webppl vsn: " + webppl.version);

assert = require("assert"); // global!
shiftmaps = require("./shiftmaps.js"); // global!

g_monomap_in = {};

g_cb = null; // OMG

// XXX: figure out how to compile this at build time
var monomap = function() {
  var w = g_monomap_in.width,
      h = g_monomap_in.height,
      saliency = g_monomap_in.saliency,
      img_matrix = g_monomap_in.img_matrix;

  var clampGamma = function(i,j,x,y) {
    // XXX: is it better to factor instead?
    var xMax = img_matrix.cols - j - 1;
    var yMax = img_matrix.rows - i - 1;
    return [Math.min(Math.max(Math.trunc(x), 0), xMax),
            Math.min(Math.max(Math.trunc(y), 0), yMax)];
  };

  var clampBeta = function(i,j,x,y) {
    var xMax = img_matrix.cols - j - 1;
    var yMax = img_matrix.rows - i - 1;
    var vec = [Math.min(Math.floor(x*xMax), xMax),
               Math.min(Math.floor(y*yMax), yMax)];
    return vec;
  };
  
  var foldl = function(fn, init, ar) {
    if (ar.length === 0) {
      return init;
    } else {
      return foldl(fn, fn(init, ar[0]), ar.slice(1));
    }
  };

  var maplast = function(f, init, xs) {
    return foldl(function(acc, x) {
      var prev = acc[acc.length-1];
      return acc.concat([f(prev, x)]);
    }, init, xs);
  };

  var model = function() {
    // the map is always monotone
    //var xs = Gamma({shape: 1, scale: 10});
    var xs = Beta({a: 1, b: 1});
    //var ys = Gaussian({mu: 0, sigma: 5});

    var proposal = map(function(i) {
      var vec0 = [0, 0]; // pixel rearrangement: leftmost column stays the same

      var rest = maplast(function(prev, j) {
        var vec = clampBeta(i, j,
                            sample(xs),
                            // XXX: do not touch ys
                            //sample(ys)
                            0
                           );
        // pixel saliency (through gradient)
        var psal = saliency.data[(i + vec[1]) * saliency.cols +
                                 (j + vec[0])];
        var salscore = ((psal !== psal) || !psal) ? 0 : Math.round(psal);
        factor(100*salscore);
        factor(vec[0] >= prev[0] ? -100 : 100); // map continuity
        //condition(vec[0] >= prev[0]);
        return vec;
      }, [vec0], _.range(1, w-1));

      var last = [img_matrix.cols-w-2,0]; // pixel rearrangement: rightmost column stays the same
      return [vec0].concat(rest.concat([last]));
    }, _.range(h));
    // smoothness term: shift-map monotonicity
    var cont = shiftmaps.countShiftmapDiscontinuties(proposal);
    factor(-0.0001*cont);
    // color / gradient continuity
    var gradcont = shiftmaps.getColorAndGradDiscontinuties(img_matrix, proposal);
    factor(-0.0001*gradcont);
    return proposal;
  };

  var maxap = Infer({method: 'MCMC',
                     samples: 100000,
                     verbose: true,
                     onlyMAP: true,
                     callbacks: prob.progressCallbacks()
                    }, model);
  var maxval = maxap[Object.keys(maxap)[0]].dist;
  return JSON.parse(Object.keys(maxval)[0]);


  // var maxap = Infer({method: 'forward',
  //                    samples: 1
  //                   }, model);
  // var maxval = maxap[Object.keys(maxap)[0]].dist;
  // return JSON.parse(Object.keys(maxval)[0]);

  // var mh = MAP(Infer({method: 'incrementalMH', samples: 5000, lag: 5, burn: 10}, model)).val;
  // return mh;

  // var dist = Infer({method: 'optimize',
  //                 optMethod: {adam: {stepSize: 0.0001}}, // note: stepSize matters a lot
  //                 steps: 20
  //                  }, model);
  // var s = sample(dist);
  // console.log(s);
  // return s;

  // var maxap = Infer({method: 'SMC',
  //                    particles: 10,
  //                    debug: false
  //                    // rejuvSteps: 2,
  //                    // rejuvKernel: 'HMC'  // slow?
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
    g_monomap_in = {width: w,
                    height: h,
                    saliency: s,
                    img_matrix: i};
    evalf(monomap, callback);
  },
  progressCallbacks: progressCallbacks
};
