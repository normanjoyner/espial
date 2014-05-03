/*
    Responsible for handling tracking of other nodes
*/

var _ = require("lodash");
var node = require([__dirname, "node"].join("/"));
var crypto = require([__dirname, "crypto"].join("/"));

module.exports.events = {};
module.exports.list = {};
module.exports.master = {};

module.exports.connection_filter = function(data, fn){
    fn(true);
}

module.exports.init = function(espial){

    module.exports.events = {
        external: {
            "core.event.keygen": function(data){
                var pubkey = new Buffer(data.pubkey);
                var prime = new Buffer(data.prime);
                var secret = crypto.get_dh_secret(pubkey);
                crypto.add_key(data.key, secret);
                var key = data.key;
                module.exports.list[key] = data;
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
    var key = data.key;
    module.exports.list[key] = data;
}

module.exports.remove = function(key){
    delete module.exports.list[key];
}
