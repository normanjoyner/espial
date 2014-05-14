/*
    Responsible for handling election
*/

var _ = require("lodash");
var node = require([__dirname, "node"].join("/"));
var nodes = require([__dirname, "nodes"].join("/"));

var interval;

module.exports.events = {};
module.exports.master_poll;

module.exports.init = function(espial){

    module.exports.events = {
        external: {
            "core.event.new_master": function(data){
                if(node.is_master())
                    espial.internal["core.event.demote"](data);

                nodes.master = data;
                var data = espial.clean_data(nodes.master);
                espial.emit("new_master", data);
            }
        },

        internal: {
            "core.event.promote": function(){
                espial.send("core.event.new_master", node.attributes);

                var data = espial.clean_data(nodes.master);

                espial.emit("promotion", {
                    previous_master: data
                });

                node.promote();
            },

            "core.event.demote": function(data){
                data = espial.clean_data(data);
                espial.emit("demotion", data);
            }
        }
    }

    module.exports.master_poll = function(){
        interval = setInterval(function(){
            if(!node.is_master() && _.isUndefined(nodes.list[nodes.master.id]))
                espial.internal["core.event.promote"]();
        }, espial.options.master_polling_frequency);
    }

}

module.exports.clear_master_poll = function(){
    clearTimeout(interval);
}
