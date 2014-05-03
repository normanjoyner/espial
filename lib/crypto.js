var crypto = require("crypto");
var _ = require("lodash");
var gcm = require("node-aes-gcm");

var dh;
var server;
var prime;
var pubkey;
var aad = new Buffer([]);

module.exports = {

    keys: {},

    add_key: function(name, secret){
        this.keys[name] = new Buffer(secret);
    },

    get_dh_secret: function(pubkey){
        return dh.computeSecret(pubkey).toString("hex");
    },

    generate_dh: function(){
        dh = crypto.createDiffieHellman(64);
        prime = dh.getPrime();
        dh = crypto.createDiffieHellman(prime);
        dh.generateKeys();
        pubkey = dh.getPublicKey();
    },

    generate_dh_secret: function(pubkey, requested_prime){
        var temp_dh = crypto.createDiffieHellman(requested_prime);
        temp_dh.generateKeys();
        return {
            pubkey: temp_dh.getPublicKey(),
            secret: temp_dh.computeSecret(pubkey).toString("hex")
        }
    },

    get_dh_prime: function(){
        return prime;
    },

    get_dh_pubkey: function(){
        return pubkey;
    },

    encrypt: function(name, message, fn){
        var key = this.keys[name];

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
        var key = this.keys[object.key];
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
