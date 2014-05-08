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
                var attributes = node.attributes;
                attributes.metadata = espial.options.metadata;

                if(_.isUndefined(subnets)){
                    espial.send("core.query.discovery", attributes, {ip: espial.options.network.address.multicast, port: node.attributes.port});
                }
                else{
                    _.each(subnets, function(subnet){
                        var prefix = _.first(subnet.split("."), 3).join(".");
                        var ips = [];

                        for(start = 2; start <= 254; start++)
                            ips.push([prefix, start].join("."));


                        _.each(ips, function(ip){
                            espial.send("core.query.discovery", attributes, {ip: ip, port: node.attributes.port});
                        });
                    });
                }
            }
        }
    }

}
