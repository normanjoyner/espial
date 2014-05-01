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

module.exports.master_query = function(espial, timeout){
    espial.send("core.query.master");
    attempt_promote = setTimeout(function(){
        if(node.master_eligible)
            espial.internal["core.event.promote"]();
    }, espial.options.response_wait);
}

module.exports.init = function(espial){

    module.exports.events = {
        external: {
            "core.query.master": function(){
                if(node.is_master())
                    espial.send("core.response.is_master", node.attributes);
            },

            "core.response.is_master": function(data){
                delete data.key;
                node.master = data;
                clearTimeout(attempt_promote);
            },

            "core.event.new_master": function(data){
                if(node.is_master())
                    espial.internal["core.event.demote"]();

                espial.external["core.response.is_master"](data);
                espial.emit("new_master", nodes.master);
            },

        },

        internal: {
            "core.event.promote": function(){
                console.log("HERE");
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

}
