/*
    Responsible for storing node metadata
*/

var _ = require("lodash");
var nodes = require([__dirname, "nodes"].join("/"));

module.exports.events = {};
module.exports.attributes= {};
module.exports.init = function(espial){}

module.exports.master_eligible= true;

module.exports.is_master = function(){
    return _.isEqual(module.exports.attributes, nodes.master);
}

module.exports.promote = function(){
    nodes.master = module.exports.attributes;    
}
