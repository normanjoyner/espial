/*
    Responsible for handling ping / heartbeat related functionality
*/

var Cache = require("node-cache");
var node = require([__dirname, "node"].join("/"));
var nodes = require([__dirname, "nodes"].join("/"));

var cache;
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
                nodes.remove(key);
                espial.emit("removed_node", data);
            }
        },

        external: {
            "core.event.ping": function(data){
                cache.set(data.key, data.host_name);
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
        setInterval(function(){
            espial.internal["core.event.ping"]();
        }, espial.options.send_presence_frequency);
    }

}
