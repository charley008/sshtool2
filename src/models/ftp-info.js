// Alias for ftpinfo
// Recovered module id: 231
"use strict";

const { SSHType } = require("../shared/constants.js");
const { FTP } = require("../connections/ftp-entity.js");

function uuid() {
    function s4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
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
