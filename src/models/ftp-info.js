// Alias for ftpinfo
// Recovered module id: 231
"use strict";

const { SSHType } = require("../shared/constants.js");
const { FTP } = require("../connections/ftp-entity.js");
const crypto = require("crypto");

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

class FTPInfo {
    constructor(name, group, status, ftp, description) {
        this.id = uuid();
        this.name = name;
        this.group = group;
        this.status = status;
        this.description = description;
        this.ftp = ftp;
    }
    static New() {
        return new FTPInfo("default", "default", SSHType.ONLINE, new FTP('127.0.0.1', 21, 'root', null, false), "");
    }
}
exports.FTPInfo = FTPInfo;
