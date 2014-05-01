/*
    Responsible for handling tracking of other nodes
*/

var node = require([__dirname, "node"].join("/"));

module.exports.events = {};
module.exports.list = {};
module.exports.master= {};

module.exports.init = function(espial){

    module.exports.events = {
        external: {
            "core.event.added_node": function(data){
                var key = data.key;
                delete data.key;
                module.exports.list[key] = data;
                espial.emit("added_node", data);
            }
        },

        internal: {
            "core.event.connected": function(data, pubkey){
                node.attributes.pubkey = pubkey;
                node.attributes.prime = data.prime;
                espial.send("core.event.added_node", node.attributes, data);
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
