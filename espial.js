var _ = require("lodash");
var Network = require([__dirname, "lib", "network"].join("/"));
var EventEmitter = require("eventemitter2").EventEmitter2;
var node = require([__dirname, "lib", "node"].join("/"));
var elect = require([__dirname, "lib", "elect"].join("/"));
var heartbeat = require([__dirname, "lib", "heartbeat"].join("/"));

var network;

function Espial(options){
    var self = this;
    EventEmitter.call(this);

    var required_libs = [
        "heartbeat",
        "node",
        "nodes",
        "discovery",
        "elect"
    ]

    this.internal = {};
    this.external = {};
    this.custom = {};

    _.each(required_libs, function(lib){
        lib = require([__dirname, "lib", lib].join("/"));
        lib.init(self);
        self.internal = _.merge(self.internal, lib.events.internal || {});
        self.external = _.merge(self.external, lib.events.external|| {});
    });

    this.options = _.defaults(options || {}, {
        network: {},
        master_polling_frequency: 5000,
        send_presence_frequency: 5000,
        master_eligible: true,
        response_wait: 1000
    });

    network = new Network(this.options.network, function(node_config){
        node.master_eligible = self.options.master_eligible;
        node.attributes = node_config;
        elect.master_poll(self);
        heartbeat.heartbeat(self);

        if(self.options.network.multicast == false){
            var subnets = self.options.network.subnets || [node_config.ip];
            self.internal["core.event.discover"](subnets);
        }
        else
            self.internal["core.event.connected"]();

        setTimeout(function(){
            self.emit("listening");
        }, self.options.response_wait);
    });

    network.on("message", function(msg){
        if(_.has(self.external, msg.event))
            var call = self.external;
        else if(_.has(self.custom, msg.event))
            var call = self.custom;

        if(!_.isUndefined(fn))
            call[msg.event](msg.data);
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
    return _.values(nodes.list);
}

Espial.prototype.get_master = function(){
    return nodes.master;
}

Espial.prototype.join = function(event){
    var self = this;

    var reserved_commands = [
        "listening",
        "promotion",
        "demotion",
        "new_master",
        "added_node",
        "removed_node"
    ]

    if(!_.contains(reserved_commands, event)){
        this.custom[event] = function(data){
            self.emit(event, data);
        }
    }
}

Espial.prototype.leave = function(event){
    if(_.has(this.custom, event))
        delete this.custom[event];
}

Espial.prototype.send = function(event, data, targets){
    if(_.isUndefined(targets))
        var targets = _.values(node.list);
    else if(!_.isArray(targets))
        var targets = [targets];

    network.send(event, data || {}, targets);
}

Espial.prototype.promote = function(){
    if(node.is_master_eligible)
        this.internal["core.event.promote"]();
}

module.exports = Espial;
