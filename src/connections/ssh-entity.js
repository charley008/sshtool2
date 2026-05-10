// Alias for ssh
// Recovered module id: 82
"use strict";

class SSH {
    constructor(host, port, username, ostype, password, privates, privateKey, passphrase) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.ostype = ostype;
        this.password = password;
        this.privates = privates;
        this.privateKey = privateKey;
        this.passphrase = passphrase;
    }
}
exports.SSH = SSH;
