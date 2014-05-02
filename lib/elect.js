/*
    Responsible for handling election
*/

var node = require([__dirname, "node"].join("/"));
var nodes = require([__dirname, "nodes"].join("/"));

module.exports.events = {};

var attempt_promote;

module.exports.master_poll = function(espial){
    setInterval(function(){
        if(!node.is_master())
            module.exports.master_query(espial);
    }, espial.options.master_polling_frequency);
}

module.exports.master_query = function(espial){
    espial.send("core.query.master", node.attributes);
    attempt_promote = setTimeout(function(){
        if(node.master_eligible)
            espial.internal["core.event.promote"]();
    }, espial.options.response_wait);
}

module.exports.init = function(espial){

    module.exports.events = {
        external: {
            "core.query.master": function(data){
                if(node.is_master())
                    espial.send("core.response.is_master", node.attributes, data);
            },

            "core.response.is_master": function(data){
                node.master = data;
                clearTimeout(attempt_promote);
            },

            "core.event.new_master": function(data){
                if(node.is_master())
                    espial.internal["core.event.demote"]();

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

}
