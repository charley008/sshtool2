// Alias for ftp
// Recovered module id: 232
"use strict";

class FTP {
    constructor(host, port, user, password, secure, ostype = "linux") {
        this.host = host;
        this.port = port;
        this.user = user;
        this.password = password;
        this.secure = secure;
        this.ostype = ostype;
    }
}
exports.FTP = FTP;
