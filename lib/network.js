var async = require("async");
var net = require("net");
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
        address: {}
    });

    this.options.address.global = "0.0.0.0";
    this.options.address.local = ip.address();
    this.options.host_name = os.hostname();

    var server = net.createServer();

    server.listen(this.options.port, this.options.address.global, function(){
        self.generate_node_id(function(id){
            self.options.id = id;
            crypto.generate_dh();
            return fn();
        });
    });

    server.on("connection", function(socket){
        socket.on("data", function(msg){
            var emit = function(msg){
                if(msg.id != self.options.id)
                    self.emit("message", msg);
            }

            try{
                msg = JSON.parse(msg);
                if(_.has(msg, "event") && _.has(msg, "id") && _.has(msg, "data"))
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
                socket.end();
            }
            catch(err){
                socket.end();
            }
        });

        socket.on("end", function(){
            socket.destroy();
        });
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

    var connect = function(ip, data, fn){
        var client = new net.Socket();

        client.connect(self.options.port, ip, function(){
            client.write(data);
            client.destroy();
        });

        client.on("close", function(){
            return fn();
        });

        client.on("error", function(){});
    }

    if(_.contains(unencryptable_events, event)){
        async.each(targets, function(target, next){
            connect(target.ip, data, next);
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

                connect(target.ip, encrypted, next);
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
