// Alias for for-ward-info
// Recovered module id: 83
"use strict";

const { Forward } = require("../connections/forward-entity.js");
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

class ForWardInfo {
    constructor(sshId, name, status, mark, forward, description) {
        this.id = uuid();
        this.sshId = sshId;
        this.name = name;
        this.status = status;
        this.mark = mark;
        this.forward = forward;
        this.description = description;
    }
    // private sshDao = new SSHDAO();
    // private forwardDao = new ForwardDAO(); 
    // get(): ForwardVO {
    //     const ssh = this.sshDao.selectById(this.sshId);
    //     return new ForwardVO(this,ssh);
    // }
    // post(): boolean {
    //     return this.forwardDao.update(this);
    // }
    // put(): boolean { 
    //     return this.forwardDao.insert(this); 
    // }
    // del():boolean { 
    //     return this.forwardDao.deleteById(this.id);
    // }
    static New(sshId) {
        return new ForWardInfo(sshId, 'default', false, false, new Forward(0, 0, '127.0.0.1', 8888, '127.0.0.1', 9999), '');
    }
}
exports.ForWardInfo = ForWardInfo;
