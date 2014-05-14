var async = require("async");
var dgram = require("dgram");
var _ = require("lodash");
var crypto = require("crypto");
var os = require("os");
var EventEmitter = require("eventemitter2").EventEmitter2;
var util = require("util");
var ip = require("ip");
var os = require("os");
var crypto = require([__dirname, "crypto"].join("/"));

var pid = process.pid;

function Network(options, fn){
    EventEmitter.call(this);

    var self = this;

    this.options = _.defaults(options, {
        port: 27272,
        address: {
            multicast: "224.0.0.1"
        },
        multicast: true
    });

    this.options.address.global = "0.0.0.0";
    this.options.address.local = ip.address();
    this.options.host_name = os.hostname();

    this.socket = dgram.createSocket("udp4");
    this.socket.bind(this.options.port, this.options.address.global);

    this.socket.on("listening", function(){
        self.generate_node_id(function(){
            if(self.options.multicast){
                self.socket.setMulticastTTL(128);
                self.socket.addMembership("230.185.192.108", self.options.address.local);
            }
            crypto.generate_dh();
            return fn();
        });
    });

    this.socket.on("message", function(msg){
        try{
            msg = JSON.parse(msg);
            if(_.has(msg, "event") && _.has(msg, "id") && _.has(msg, "data"))
                self.emit("message", msg);
            else{
                msg = crypto.decrypt(msg);
                if(!_.isNull(msg)){
                    try{
                        self.emit("message", JSON.parse(msg));
                    }
                    catch(err){}
                }
            }
        }
        catch(err){}
    });

    this.socket.on("error", function (err){
        console.log(err);
    });
}

Network.super_ = EventEmitter;
Network.prototype = Object.create(EventEmitter.prototype, {
    constructor: {
        value: Network,
        enumerable: false
    }
});

Network.prototype.send = function(event, data, targets, fn){
    var self = this;

    var json = {
        event: event,
        id: this.options.id,
        data: data
    }

    var data = new Buffer(JSON.stringify(json));

    var unencryptable_events = [
        "core.query.discovery",
        "core.event.discovered",
        "core.event.accept_node",
        "core.event.node_accepted",
        "core.event.node_rejected"
    ]

    if(_.contains(unencryptable_events, event)){
        async.each(targets, function(target, next){
            self.socket.send(data, 0, data.length, self.options.port, target.ip, next);
        }, function(err){
            if(!_.isUndefined(fn))
                return fn();
        });
    }
    else{
        async.each(targets, function(target, next){
            crypto.encrypt(target.id, data, self.options.id, function(encrypted){
                if(!_.isNull(encrypted))
                    encrypted = new Buffer(JSON.stringify(encrypted));

                self.socket.send(encrypted, 0, encrypted.length, self.options.port, target.ip, next);
            });
        }, function(err){
            if(!_.isUndefined(fn))
                return fn();
        });
    }
}

Network.prototype.generate_node_id = function(fn){
    crypto.generate_node_id(function(id){
        if(!_.isUndefined(id))
            id = id.toString("hex");

        return fn(id);
    });
}

Network.prototype.close = function(){
    this.socket.close();
}

module.exports = Network;
