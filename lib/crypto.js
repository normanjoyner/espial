var crypto = require("crypto");
var _ = require("lodash");
var gcm = require("node-aes-gcm");

var key;
var aad = new Buffer();

module.exports = {

    generate_key: function(){
        key = "e4d909c290d0fb1ca068ffaddf22cbd0";
    },

    encrypt: function(message, fn){
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
        var decrypted = gcm.decrypt(key, object.iv, object.ciphertext, object.aad, object.auth_tag);
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
