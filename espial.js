var _ = require("lodash");
var Network = require([__dirname, "lib", "network"].join("/"));
var EventEmitter = require("eventemitter2").EventEmitter2;
var node = require([__dirname, "lib", "node"].join("/"));
var Cache = require("node-cache");

var cache;

var network;
var master_query = null;

var poll_for_master = function(self){
    setInterval(function(){
        if(!node.is_master)
            query_for_master(self);
    }, self.options.master_polling_frequency);
}

var query_for_master = function(self){
    self.send("core.query.master");
    master_query = setTimeout(function(){
        if(node.is_master_eligible)
            self.router.internal["core.event.promote"]();
    }, self.options.response_wait);
}

var send_presence = function(self){
    setInterval(function(){
        self.router.internal["core.event.ping"]();
    }, self.options.send_presence_frequency);
}

function Espial(options){
    EventEmitter.call(this);

    var self = this;
    this.options = _.defaults(options || {}, {
        network: {},
        master_polling_frequency: 5000,
        send_presence_frequency: 15000,
        master_eligible: true,
        response_wait: 1000
    });

    var cache_ttl = ((this.options.send_presence_frequency / 1000) * 4) + 1;

    cache = new Cache({
        stdTTL: cache_ttl,
        checkperiod: cache_ttl
    });

    network = new Network(this.options.network, function(node_config){
        self.router = get_router(self);
        node.is_master_eligible = self.options.master_eligible;
        node.self = node_config;
        poll_for_master(self);
        send_presence(self);

        cache.on("expired", function(key){
            self.router.internal["core.event.node_expired"](key);
        });

        var subnets = self.options.network.subnets || [node_config.ip];

        self.router.internal["core.event.discover"](subnets);
        self.emit("listening");
    });

    network.on("message", function(msg){
        if(self.router.external[msg.event])
            self.router.external[msg.event](msg.data);
        else
            console.log("no handler found for " + msg.event);
    });

    network.on("error", function(err){
        console.log(err);
    });
}

Espial.super_ = EventEmitter;
Espial.prototype = Object.create(EventEmitter.prototype, {
    constructor: {
        value: Espial,
        enumerable: false
    }
});

Espial.prototype.get_nodes = function(){
    return _.values(node.nodes);
}

Espial.prototype.get_master = function(){
    return node.current_master;
}

Espial.prototype.join = function(event){
    var self = this;
    this.router.external[event] = function(data){
        self.emit(event, data);
    }
}

Espial.prototype.send = function(event, data, targets){
    if(_.isUndefined(targets))
        var targets = _.values(node.nodes);
    else if(!_.isArray(targets))
        var targets = [targets];

    network.send(event, data || {}, targets);
}

Espial.prototype.promote = function(){
    if(node.is_master_eligible)
        this.router.internal["core.event.promote"]();
}

var get_router = function(self){
    return {
        external: {

            "core.query.discovery": function(data){
                self.send("core.event.discovered", node.self, data);
            },

            "core.event.discovered": function(data){
                var key = data.key;
                delete data.key;
                node.nodes[key] = data;
                self.send("core.event.added_node", node.self, data);
            },

            "core.query.master": function(){
                if(node.is_master)
                    self.send("core.response.is_master", node.self);
            },

            "core.response.is_master": function(data){
                delete data.key;
                node.current_master = data;
                clearTimeout(master_query);
            },

            "core.event.new_master": function(data){
                if(node.is_master)
                    self.router.internal["core.event.demote"]();

                self.router.external["core.response.is_master"](data);
                self.emit("new_master", node.current_master);
            },

            "core.event.added_node": function(data){
                var key = data.key;
                delete data.key;
                node.nodes[key] = data;
                self.emit("added_node", data);
            },

            "core.event.ping": function(data){
                cache.set(data.key, data.host_name);
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
                        self.send("core.query.discovery", node.self, {ip: ip, port: node.self.port});
                    });
                });
            },

            "core.event.promote": function(){
                self.send("core.event.new_master", {
                    host_name: network.options.host_name,
                    ip: network.options.address.local
                });
                node.is_master = true;
                self.emit("promotion", {
                    previous_master: node.current_master
                });
            },

            "core.event.demote": function(data){
                node.is_master = false;
                self.emit("demotion");
            },

            "core.event.node_expired": function(key){
                var data = node.nodes[key];
                delete node.nodes[key];
                self.emit("removed_node", data);
            },

            "core.event.ping": function(){
                self.send("core.event.ping", node.self);
            }

        }
    }
}

module.exports = Espial;
