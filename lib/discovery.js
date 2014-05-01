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
                espial.send("core.event.discovered", node.attributes, data);
            },

            "core.event.discovered": function(data){
                var prime = new Buffer(data.prime);
                var pubkey = new Buffer(data.pubkey);

                var secret = crypto.generate_dh_secret(pubkey, prime);
                crypto.add_key(data.key, secret);
                nodes.add(data);
                var pubkey = crypto.generate_dh_pubkey(prime);
                espial.internal["core.event.connected"](data, pubkey);
            }
        },

        internal: {
            "core.event.discover": function(subnets){
                _.each(subnets, function(subnet){
                    var prefix = _.first(subnet.split("."), 3).join(".");
                    var ips = [];

                    for(start = 2; start <= 254; start++)
                        ips.push([prefix, start].join("."));

                    _.each(ips, function(ip){
                        espial.send("core.query.discovery", node.attributes, {ip: ip, port: node.attributes.port});
                    });
                });
            }
        }
    }

}
