const crypto = require('crypto');
const fs = require('fs');
var ecdsa = require('./ecdsa/lib/ECDSA').createECDSA();

var algorithm = 'aes-256-gcm';

exports.generateECDSAKeyPair = function(){
    return ecdsa.generateKeyPair();
};


exports.sign = function(privateKey, digest){
    return ecdsa.sign(privateKey,digest);
};

exports.verify = function(publicKey, signature, digest){
    return ecdsa.verify(publicKey, signature, digest);
};

exports.saveDerivedSeed = function(seed, pin, pinIterations, dseedLen){
    var seedSalt = crypto.randomBytes(64);
    var dseed = crypto.pbkdf2Sync(seed, seedSalt, 10000, dseedLen, 'sha512');
    var pinSalt = crypto.randomBytes(64);
    var dpin = crypto.pbkdf2Sync(pin, pinSalt, pinIterations, 32, 'sha512');
    var cipher = crypto.createCipher('aes-256-cfb', dpin);
    var ciphertext = cipher.update(dseed, 'binary');
    var final = Buffer.from(cipher.final('binary'), 'binary');
    ciphertext = Buffer.concat([ciphertext, final, pinSalt]);

    fs.writeFileSync('dseed', ciphertext);


};

exports.encryptJson = function(data, pin, pinIterations, dseedLen){
    var fileContent = fs.readFileSync('dseed');
    var encryptedDSeed = fileContent.slice(0,dseedLen);
    var pinSalt = fileContent.slice(dseedLen);
    var dpin = crypto.pbkdf2Sync(pin, pinSalt, pinIterations, 32, 'sha512');
    var seedDechiper = crypto.createDecipher('aes-256-cfb', dpin);
    var dseed = Buffer.from(seedDechiper.update(encryptedDSeed,'hex','binary'));
    var final = Buffer.from(seedDechiper.final('binary'));

    dseed = Buffer.concat([dseed, final]);

    var keySalt = crypto.randomBytes(64);
    var key = crypto.pbkdf2Sync(dseed, keySalt, 1000, 32, 'sha512');

    var aadSalt = crypto.randomBytes(64);
    var aad = crypto.pbkdf2Sync(dseed, aadSalt, 1000, 32, 'sha512');

    var salt = Buffer.concat([keySalt, aadSalt]);
    var iv = crypto.pbkdf2Sync(dseed, salt, 1000, 12, 'sha512');

    var buf = Buffer.from(JSON.stringify(data), 'binary');
    var cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAAD(aad);
    var encryptedText = cipher.update(buf,'binary');
    var final = Buffer.from(cipher.final('binary'),'binary');

    var tag = cipher.getAuthTag();

    encryptedText = Buffer.concat([encryptedText, final])
    var cipherText = [iv, salt, encryptedText, tag];


    return Buffer.concat(cipherText);
};


exports.decryptJson = function(encryptedData, pin, pinIterations, dseedLen){
    var fileContent = fs.readFileSync('dseed');
    var encryptedDSeed = fileContent.slice(0,dseedLen);
    var pinSalt = fileContent.slice(dseedLen);
    var dpin = crypto.pbkdf2Sync(pin, pinSalt, pinIterations, 32, 'sha512');
    var seedDechiper = crypto.createDecipher('aes-256-cfb', dpin);
    var dseed = Buffer.from(seedDechiper.update(encryptedDSeed,'hex','binary'));
    var final = Buffer.from(seedDechiper.final('binary'));

    dseed = Buffer.concat([dseed, final]);

    var iv = encryptedData.slice(0, 12);
    var salt = encryptedData.slice(12, 140);
    var keySalt = salt.slice(0, 64);
    var aadSalt = salt.slice(-64);

    var key = crypto.pbkdf2Sync(dseed, keySalt, 1000, 32, 'sha512');
    var aad = crypto.pbkdf2Sync(dseed, aadSalt, 1000, 32, 'sha512');

    var ciphertext = encryptedData.slice(140, encryptedData.length - 16);
    var tag = encryptedData.slice(-16);

    var decipher = crypto.createDecipheriv(algorithm, key, iv);

    decipher.setAuthTag(tag);
    decipher.setAAD(aad);

    var dec = Buffer.from(decipher.update(ciphertext,'hex','binary'), 'binary');
    var final = Buffer.from(decipher.final('binary'), 'binary');
    dec = Buffer.concat([dec, final]);

    return JSON.parse(dec);
};

exports.encryptBlob = function (data, pin, pinIterations, dseedLen) {
    var fileContent = fs.readFileSync('dseed');
    var encryptedDSeed = fileContent.slice(0,dseedLen);
    var pinSalt = fileContent.slice(dseedLen);
    var dpin = crypto.pbkdf2Sync(pin, pinSalt, pinIterations, 32, 'sha512');
    var seedDechiper = crypto.createDecipher('aes-256-cfb', dpin);
    var dseed = Buffer.from(seedDechiper.update(encryptedDSeed,'hex','binary'));
    var final = Buffer.from(seedDechiper.final('binary'));

    dseed = Buffer.concat([dseed, final]);

    var keySalt = crypto.randomBytes(64);
    var key = crypto.pbkdf2Sync(dseed, keySalt, 1000, 32, 'sha512');

    var aadSalt = crypto.randomBytes(64);
    var aad = crypto.pbkdf2Sync(dseed, aadSalt, 1000, 32, 'sha512');

    var salt = Buffer.concat([keySalt, aadSalt]);
    var iv = crypto.pbkdf2Sync(dseed, salt, 1000, 12, 'sha512');

    var cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAAD(aad);
    var encryptedBlob = cipher.update(data,'binary');
    var final = Buffer.from(cipher.final('binary'),'binary');

    var tag = cipher.getAuthTag();

    encryptedBlob = Buffer.concat([encryptedBlob, final])
    var cipherText = [iv, salt, encryptedBlob, tag];


    return Buffer.concat(cipherText);
};

exports.decryptBlob = function (encryptedData, pin, pinIterations, dseedLen) {
    var fileContent = fs.readFileSync('dseed');
    var encryptedDSeed = fileContent.slice(0,dseedLen);
    var pinSalt = fileContent.slice(dseedLen);
    var dpin = crypto.pbkdf2Sync(pin, pinSalt, pinIterations, 32, 'sha512');
    var seedDechiper = crypto.createDecipher('aes-256-cfb', dpin);
    var dseed = Buffer.from(seedDechiper.update(encryptedDSeed,'hex','binary'));
    var final = Buffer.from(seedDechiper.final('binary'));

    dseed = Buffer.concat([dseed, final]);

    var iv = encryptedData.slice(0, 12);
    var salt = encryptedData.slice(12, 140);
    var keySalt = salt.slice(0, 64);
    var aadSalt = salt.slice(-64);

    var key = crypto.pbkdf2Sync(dseed, keySalt, 1000, 32, 'sha512');
    var aad = crypto.pbkdf2Sync(dseed, aadSalt, 1000, 32, 'sha512');

    var ciphertext = encryptedData.slice(140, encryptedData.length - 16);
    var tag = encryptedData.slice(-16);

    var decipher = crypto.createDecipheriv(algorithm, key, iv);

    decipher.setAuthTag(tag);
    decipher.setAAD(aad);

    var dec = Buffer.from(decipher.update(ciphertext,'hex','binary'), 'binary');
    var final = Buffer.from(decipher.final('binary'), 'binary');
    dec = Buffer.concat([dec, final]);

    return dec;
};



exports.generateEncryptionKey = function(){
    return crypto.randomBytes(32);
};


