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
                    if(accepted){
                        espial.send("core.event.discovered", attributes, data);
                        data = espial.clean_data(data);
                        espial.emit("added_node", data);
                    }
                    else
                        espial.send("core.event.rejected", attributes, data);
                });
            },

            "core.event.discovered": function(data){
                if(data.master)
                    nodes.master = data;

                var prime = new Buffer(data.prime);
                var pubkey = new Buffer(data.pubkey);

                var dh = crypto.generate_dh_secret(pubkey, prime);
                crypto.add_key(data.key, dh.secret);
                nodes.add(data);
                var attributes = _.merge(node.attributes, {
                    pubkey: dh.pubkey,
                    prime: data.prime
                });

                espial.send("core.event.keygen", attributes, data);
            }
        },

        internal: {
            "core.event.discover": function(subnets){
                var attributes = _.merge(node.attributes, espial.options.metadata);
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
