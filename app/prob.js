console.log(webppl);

// XXX: figure out how to compile this at build time
var probprog = function () {
    var binomial = function() {
        var a = flip();
        var b = flip();
        var c = flip();
        return a + b + c;
    };
    return MAP(Infer({method: 'enumerate'}, binomial));
};

var encoder = eval.call({},
                        webppl.compile(['(',probprog.toString(),')()'].join('')));

var handleError = function() { console.error(arguments) }
var baseRunner = util.trampolineRunners.web();
var prepared = webppl.prepare(encoder,
                              function(s, dist) { console.log([s, dist]); },
                              {errorHandlers: [handleError],
                               debug: true,
                               baseRunner: baseRunner});

//encoderStore.x = new Tensor([pixels.length, 1]);
//encoderStore.x.data = new Float64Array(pixels);

prepared.run();

module.exports = null;
