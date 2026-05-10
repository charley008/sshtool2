// Alias for for-ward-info
// Recovered module id: 83
"use strict";

const { Forward } = require("../connections/forward-entity.js");

function uuid() {
    function s4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
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
