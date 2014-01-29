var _ = require("lodash");
var Network = require([__dirname, "lib", "network"].join("/"));
var EventEmitter = require("eventemitter2").EventEmitter2;
var node = require([__dirname, "lib", "node"].join("/"));
var Cache = require("node-cache");

var cache = new Cache({
    stdTTL: 20,
    checkperiod: 30
});

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
    }, 15000);
}

function Espial(options){
    EventEmitter.call(this);

    var self = this;
    this.options = _.defaults(options || {}, {
        network: {},
        master_polling_frequency: 5000,
        master_eligible: true,
        response_wait: 1000
    });

    network = new Network(this.options.network, function(){
        self.router = get_router(self);
        node.is_master_eligible = self.options.master_eligible;
        poll_for_master(self);
        send_presence(self);

        cache.on("expired", function(key){
            self.router.internal["core.event.node_expired"](key);
        });

        self.router.internal["core.event.connected"]();
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

Espial.prototype.join = function(event){
    var self = this;
    this.router.external[event] = function(data){
        self.emit(event, data);
    }
}

Espial.prototype.send = function(event, data){
    network.send(event, data || {});
}

Espial.prototype.promote = function(){
    if(node.is_master_eligible)
        this.router.internal["core.event.promote"]();
}

var get_router = function(self){
    return {
        external: {

            "core.query.master": function(){
                if(node.is_master){
                    self.send("core.response.is_master", {
                        host_name: network.options.host_name,
                        ip: network.options.address.local
                    });
                }
            },

            "core.response.is_master": function(data){
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
                node.nodes[data.key] = data;
                delete node.nodes[data.key].key;
                self.emit("added_node", data);
            },

            "core.event.ping": function(data){
                cache.set(data.key, data.host_name);
            }

        },

        internal: {

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

            "core.event.connected": function(data){
                self.send("core.event.added_node", {
                    key: network.options.key,
                    host_name: network.options.host_name,
                    ip: network.options.address.local
                });
            },

            "core.event.node_expired": function(key){
                var data = node.nodes[key];
                delete node.nodes[key];
                self.emit("removed_node", data);
            },

            "core.event.ping": function(){
                self.send("core.event.ping", {
                    key: network.options.key,
                    host_name: network.options.host_name,
                    ip: network.options.address.local
                });
            }

        }
    }
}

module.exports = Espial;
