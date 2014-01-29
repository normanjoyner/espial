var Espial = require([__dirname, "espial"].join("/"));
var pkg = require([__dirname, "package"].join("/"));

exports = module.exports = function(options){
    var espial = new Espial(options);
    espial.version = pkg.version;
    return espial;
}
