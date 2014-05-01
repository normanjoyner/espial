/*
    Responsible for handling tracking of other nodes
*/

var _ = require("lodash");
var node = require([__dirname, "node"].join("/"));

module.exports.events = {};
module.exports.list = {};
module.exports.master= {};

module.exports.init = function(espial){

    module.exports.events = {
        external: {
            "core.event.added_node": function(data){
                var secret = crypto.generate_dh_secret(data.pubkey, data.prime);
                crypto.add_key(data.key, secret);
                console.log(data);
                var key = data.key;
                delete data.key;
                module.exports.list[key] = data;
                espial.emit("added_node", data);
            }
        },

        internal: {
            "core.event.connected": function(data, pubkey){
                var attributes = _.merge(node.attributes, {
                    pubkey: data.pubkey,
                    prime: data.prime
                });
                espial.send("core.event.added_node", attributes, data);
            }
        }
    }

}

module.exports.add = function(data){
    var key = data.key;
    delete data.key;
    module.exports.list[key] = data;
}

module.exports.remove = function(key){
    delete module.exports.list[key];
}
