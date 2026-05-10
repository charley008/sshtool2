// Alias for forward
// Recovered module id: 84
"use strict";

class Forward {
    constructor(type, mode, localHost, localPort, remoteHost, remotePort, bastionHost, bastionPort) {
        this.type = type;
        this.mode = mode;
        this.localHost = localHost;
        this.localPort = localPort;
        this.remoteHost = remoteHost;
        this.remotePort = remotePort;
        this.bastionHost = bastionHost;
        this.bastionPort = bastionPort;
    }
}
exports.Forward = Forward;
