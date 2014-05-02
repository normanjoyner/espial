/*
    Responsible for handling election
*/

var _ = require("lodash");
var node = require([__dirname, "node"].join("/"));
var nodes = require([__dirname, "nodes"].join("/"));

module.exports.events = {};
module.exports.master_poll;

module.exports.init = function(espial){

    module.exports.events = {
        external: {
            "core.event.new_master": function(data){
                if(node.is_master())
                    espial.internal["core.event.demote"](data);

                nodes.master = data;
                espial.emit("new_master", nodes.master);
            }
        },

        internal: {
            "core.event.promote": function(){
                espial.send("core.event.new_master", node.attributes);
                espial.emit("promotion", {
                    previous_master: nodes.master
                });
                node.promote();
            },

            "core.event.demote": function(data){
                espial.emit("demotion");
            }
        }
    }

    module.exports.master_poll = function(){
        setInterval(function(){
            console.log('checking for master');
            if(!node.is_master() && _.isUndefined(nodes.list[nodes.master.key]))
                espial.internal["core.event.promote"]();
        }, espial.options.master_polling_frequency);
    }

}
