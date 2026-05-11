// Alias for remote-info
// Recovered module id: 85
"use strict";

const crypto = require("crypto");
const { RDP } = require("./rdp-model.js");

function uuid() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    const bytes = crypto.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

class RemoteInfo {
    constructor(eId, name, mark, mode, status, rdp, id = null) {
        this.id = id || uuid();
        this.eId = eId;
        this.name = name;
        this.mark = mark;
        this.mode = mode;
        this.status = status;
        this.rdp = rdp;
    }
    static NewRDP(eId) {
        return new RemoteInfo(eId, 'default', false, 0, false, new RDP(false, 3389, 24, '1366x768'));
    }
}
exports.RemoteInfo = RemoteInfo;
