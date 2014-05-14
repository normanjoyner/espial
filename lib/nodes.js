/*
    Responsible for handling tracking of other nodes
*/

var _ = require("lodash");
var node = require([__dirname, "node"].join("/"));
var heartbeat = require([__dirname, "heartbeat"].join("/"));
var crypto = require([__dirname, "crypto"].join("/"));

module.exports.events = {};
module.exports.list = {};
module.exports.master = {};

module.exports.connection_filter = function(data, fn){
    return fn(true);
}

module.exports.init = function(espial){

    module.exports.events = {
        external: {
            "core.event.accept_node": function(data){
                if(data.master)
                    module.exports.master = data;

                var prime = new Buffer(data.prime);
                var pubkey = new Buffer(data.pubkey);

                var dh = crypto.generate_dh_secret(pubkey, prime);
                crypto.add_id(data.id, dh.secret);
                module.exports.add(data);
                heartbeat.set_cache(data.id, data.host_name);
                var attributes = _.merge(node.attributes, {
                    pubkey: dh.pubkey,
                    prime: data.prime
                });

                espial.send("core.event.node_accepted", attributes, data);
                espial.emit("node_accepted", data);
            },

            "core.event.node_accepted": function(data){
                var pubkey = new Buffer(data.pubkey);
                var prime = new Buffer(data.prime);
                var secret = crypto.get_dh_secret(pubkey);
                crypto.add_id(data.id, secret);
                module.exports.add(data);
                heartbeat.set_cache(data.id, data.host_name);
                data = espial.clean_data(data);
                espial.emit("added_node", data);
            },

            "core.event.node_rejected": function(data){
                espial.emit("node_rejected", data);
            }
        },

        internal: {
            "core.event.connected": function(data, pubkey){
                var attributes = _.merge(node.attributes, {
                    pubkey: pubkey,
                    prime: data.prime
                });

                espial.send("core.event.added_node", attributes, data);
            }
        }
    }

}

module.exports.add = function(data){
    var id = data.id;
    module.exports.list[id] = data;
}

module.exports.remove = function(id){
    delete module.exports.list[id];
}
