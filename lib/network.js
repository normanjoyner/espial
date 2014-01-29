var dgram = require("dgram");
var _ = require("lodash");
var crypto = require("crypto");
var os = require("os");
var EventEmitter = require("eventemitter2").EventEmitter2;
var util = require("util");
var ip = require("ip");
var os = require("os");

var pid = process.pid;

function Network(options, fn){
    EventEmitter.call(this);

    var self = this;

    this.options = _.defaults(options, {
        port: 12345,
        address: {
            multicast: "224.0.0.1"
        }
    });

    this.options.address.global = "0.0.0.0";
    this.options.address.local = ip.address();
    this.options.host_name = os.hostname();

    this.socket = dgram.createSocket("udp4");
    this.socket.bind(this.options.port, this.options.address.global);

    this.socket.on("listening", function(){
        self.generate_key();
        self.socket.setMulticastTTL(128);
        self.socket.addMembership("230.185.192.108", self.options.address.local);
        return fn();
    });

    this.socket.on("message", function(msg){
        try{
            msg = JSON.parse(msg);
            if(msg.key != self.options.key){
                delete msg.key;
                self.emit("message", msg);
            }
        }
        catch(err){
            throw err;
        }
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

Network.prototype.send = function(event, data){
    var json = {
        event: event,
        key: this.options.key,
        data: data
    }

    var data = new Buffer(JSON.stringify(json));

    this.socket.send(data, 0, data.length, this.options.port, this.options.address.multicast);
}

Network.prototype.generate_key = function(){
    this.options.key = [this.options.address.local.replace(/\./g, ""), process.pid].join("");
}

module.exports = Network;