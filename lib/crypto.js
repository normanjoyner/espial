var crypto = require("crypto");
var _ = require("lodash");
var gcm = require("node-aes-gcm");

var server;
var prime;
var pubkey;
var aad = new Buffer([]);

module.exports = {

    keys: {},

    add_key: function(name, secret){
        console.log(secret);
        this.keys[name] = new Buffer(secret);
    },

    generate_dh_pubkey: function(requested_prime){
        if(_.isUndefined(requested_prime))
            requested_prime = prime;

        var dh = crypto.createDiffieHellman(requested_prime);
        dh.generateKeys();
        return dh.getPublicKey();
    },

    generate_dh: function(){
        var dh = crypto.createDiffieHellman(64);
        prime = dh.getPrime();
        dh = crypto.createDiffieHellman(prime);
        dh.generateKeys();
        pubkey = dh.getPublicKey();
    },

    generate_dh_secret: function(pubkey, requested_prime){
        var dh = crypto.createDiffieHellman(requested_prime);
        dh.generateKeys();
        return {
            pubkey: dh.getPublicKey().toString("hex"),
            secret: dh.computeSecret(pubkey).toString("hex")
        }
    },

    get_dh_prime: function(){
        return prime;
    },

    get_dh_pubkey: function(){
        return pubkey;
    },

    encrypt: function(name, message, fn){
        key = this.keys[name];
        message = new Buffer(message);

        utils.generate_iv(function(iv){
            if(_.isNull(iv))
                fn(iv);
            else{
                var encrypted = _.merge(gcm.encrypt(key, iv, message, aad), {
                    iv: iv,
                    aad: aad
                });

                fn(encrypted);
            }
        });
    },

    decrypt: function(object){
        var iv = new Buffer(object.iv);
        var ciphertext = new Buffer(object.ciphertext);
        var auth_tag = new Buffer(object.auth_tag);

        var decrypted = gcm.decrypt(key, iv, ciphertext, aad, auth_tag);
        if(decrypted.auth_ok)
            return decrypted.plaintext.toString();
        else
            return null;
    }

}

var utils = {

    generate_iv: function(fn){
        crypto.randomBytes(12, function(err, iv){
            if(_.isNull(err))
                fn(iv);
            else
                fn(err);
        });
    }

}
