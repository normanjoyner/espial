/*
    Responsible for peer discovery functionality
*/

var _ = require("lodash");
var node = require([__dirname, "node"].join("/"));
var nodes = require([__dirname, "nodes"].join("/"));
var crypto = require([__dirname, "crypto"].join("/"));

module.exports.events = {};

module.exports.init = function(espial){

    module.exports.events = {
        external: {
            "core.query.discovery": function(data){
                var attributes = _.merge(node.attributes, {
                    pubkey: crypto.get_dh_pubkey(),
                    prime: crypto.get_dh_prime(),
                    master: node.is_master()
                });

                nodes.connection_filter(data, function(accepted){
                    if(accepted)
                        espial.send("core.event.accept_node", attributes, data);
                    else
                        espial.send("core.event.node_rejected", attributes, data);
                });
            }
        },

        internal: {
            "core.event.discover": function(subnets){
                _.each(subnets, function(subnet){
                    var prefix = _.first(subnet.split("."), 3).join(".");
                    var ips = [];

                    for(start = 2; start <= 254; start++){
                        var ip = [prefix, start].join(".");
                        if(ip != espial.options.network.address.local)
                            ips.push({ip: [prefix, start].join(".")});
                    }

                    espial.send("core.query.discovery", node.attributes, ips);
                });
            }
        }
    }

}
