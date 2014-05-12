var _ = require("lodash");
var Network = require([__dirname, "lib", "network"].join("/"));
var EventEmitter = require("eventemitter2").EventEmitter2;
var node = require([__dirname, "lib", "node"].join("/"));
var nodes = require([__dirname, "lib", "nodes"].join("/"));
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
        master_election_timeout: 1000,
        metadata: {}
    });

    network = new Network(this.options.network, function(){
        node.master_eligible = self.options.master_eligible;
        node.attributes = {
            host_name: self.options.network.host_name,
            ip: self.options.network.address.local,
            port: self.options.network.port,
            key: self.options.network.key
        }
        heartbeat.heartbeat(self);
        heartbeat.setup_cache();

        self.emit("listening");

        if(self.options.network.multicast == false){
            var subnets = self.options.network.subnets || [self.options.network.address.local];
            self.internal["core.event.discover"](subnets);
        }
        else
            self.internal["core.event.discover"]();

        setTimeout(function(){
            if(_.isEmpty(nodes.master))
                self.internal["core.event.promote"]();

            elect.master_poll();
        }, self.options.master_election_timeout);
    });

    network.on("message", function(msg){
        if(_.has(self.external, msg.event))
            var handler = self.external;
        else if(_.has(self.custom, msg.event))
            var handler = self.custom;

        if(!_.isUndefined(handler))
            handler[msg.event](msg.data);
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

Espial.prototype.send = function(event, data, targets, fn){
    if(_.isFunction(targets)){
        fn = targets;
        targets = _.values(nodes.list);
    }
    else if(_.isUndefined(targets))
        targets = _.values(nodes.list);
    else if(!_.isArray(targets))
        var targets = [targets];

    network.send(event, data || {}, targets, fn);
}

Espial.prototype.promote = function(){
    if(node.is_master_eligible)
        this.internal["core.event.promote"]();
}

Espial.prototype.connection_filter = function(fn){
    nodes.connection_filter = fn;
}

Espial.prototype.is_master = function(){
    return node.is_master();
}

Espial.prototype.clean_data = function(data){
    var data = _.cloneDeep(data);
    delete data.metadata;
    delete data.pubkey;
    delete data.prime;
    delete data.master;
    return data;
}

Espial.prototype.exit = function(fn){
    var self = this;
    this.internal["core.event.exit"](function(){
        heartbeat.clear_heartbeat();
        elect.clear_master_poll();
        self.removeAllListeners();
        network.close();
        return fn();
    });
}

module.exports = Espial;
