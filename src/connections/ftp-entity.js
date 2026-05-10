// Alias for ftp
// Recovered module id: 232
"use strict";

class FTP {
    constructor(host, port, user, password, secure) {
        this.host = host;
        this.port = port;
        this.user = user;
        this.password = password;
        this.secure = secure;
    }
}
exports.FTP = FTP;
