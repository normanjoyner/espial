/*
    Responsible for handling ping / heartbeat related functionality
*/

var _ = require("lodash");
var Cache = require("node-cache");
var node = require([__dirname, "node"].join("/"));
var nodes = require([__dirname, "nodes"].join("/"));

var cache;
var interval;

module.exports.setup_cache;
module.exports.heartbeat;
module.exports.events = {};

module.exports.init = function(espial){

    module.exports.events = {
        internal: {
            "core.event.ping": function(){
                espial.send("core.event.ping", node.attributes);
            },

            "core.event.node_expired": function(key){
                var data = nodes.list[key];
                if(!_.isUndefined(data)){
                    nodes.remove(key);
                    data = espial.clean_data(data);
                    espial.emit("removed_node", data);
                }
            },

            "core.event.exit": function(fn){
                espial.send("core.event.exit", node.attributes, fn);
            }
        },

        external: {
            "core.event.ping": function(data){
                module.exports.set_cache(data.key, data.host_name);
            },

            "core.event.exit": function(data){
                cache.del(data.key);
                espial.internal["core.event.node_expired"](data.key);
            }
        }
    }

    module.exports.setup_cache = function(){
        var frequency = espial.options.send_presence_frequency / 1000;

        cache = new Cache({
            stdTTL: frequency * 3 + 1,
            checkperiod: frequency
        });

        cache.on("expired", function(key){
            espial.internal["core.event.node_expired"](key);
        });

    }

    module.exports.heartbeat = function(){
        interval = setInterval(function(){
            espial.internal["core.event.ping"]();
        }, espial.options.send_presence_frequency);
    }

}

module.exports.set_cache = function(key, host_name){
    cache.set(key, host_name);
}

module.exports.clear_heartbeat = function(){
    clearTimeout(interval);
}
