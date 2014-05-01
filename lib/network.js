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
        self.generate_key();
        if(self.options.multicast){
            self.socket.setMulticastTTL(128);
            self.socket.addMembership("230.185.192.108", self.options.address.local);
        }

        crypto.generate_dh();

        return fn({
            host_name: self.options.host_name,
            ip: self.options.address.local,
            port: self.options.port,
            key: self.options.key
        });
    });

    this.socket.on("message", function(msg){
        var emit = function(msg){
            if(msg.key != self.options.key){
                delete msg.key;
                self.emit("message", msg);
            }
        }

        try{
            msg = JSON.parse(msg);
            if(_.has(msg, "event") && _.has(msg, "key") && _.has(msg, "data"))
                emit(msg);
            else{
                msg = crypto.decrypt(msg);
                if(!_.isNull(msg)){
                    try{
                        emit(JSON.parse(msg));
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

Network.prototype.send = function(event, data, targets){
    var self = this;

    var json = {
        event: event,
        key: this.options.key,
        data: data
    }

    var data = new Buffer(JSON.stringify(json));

    var unencryptable_events = [
        "core.query.discovery",
        "core.event.discovered",
        "core.event.added_node"
    ]

    if(_.contains(unencryptable_events, event)){
        _.each(targets, function(target){
            self.socket.send(data, 0, data.length, self.options.port, target.ip);
        });
    }
    else{
        _.each(targets, function(target){
            crypto.encrypt(target.key, data, function(encrypted){
                if(!_.isNull(encrypted))
                    encrypted = new Buffer(JSON.stringify(encrypted));

                self.socket.send(encrypted, 0, encrypted.length, self.options.port, target.ip);
            });
        });
    }
}

Network.prototype.generate_key = function(){
    this.options.key = [this.options.address.local.replace(/\./g, ""), process.pid].join("");
}

module.exports = Network;
