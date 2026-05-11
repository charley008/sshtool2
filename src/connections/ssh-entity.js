// Alias for ssh
// Recovered module id: 82
"use strict";

class SSH {
    constructor(host, port, username, ostype, password, privates, privateKey, passphrase, jump = null) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.ostype = ostype;
        this.password = password;
        this.privates = privates;
        this.privateKey = privateKey;
        this.passphrase = passphrase;
        this.jump = Object.assign({ enabled: false, sshId: "" }, jump || {});
    }
}
exports.SSH = SSH;
