// Alias for forward-vo
// Recovered module id: 44
"use strict";

const { ForwardDAO } = require("../storage/forward.js");
const { SSHDAO } = require("../storage/ssh.js");
class ForwardVO {
    constructor(forward, ssh) {
        this.forward = forward;
        this.ssh = ssh;
    }
    static getAll() {
        return new ForwardDAO().selectAll();
    }
    static delAll() {
        return new ForwardDAO().deleteAll();
    }
    static get(id) {
        const forward = new ForwardDAO().selectById(id);
        const ssh = new SSHDAO().selectById(forward.sshId);
        return new ForwardVO(forward, ssh);
    }
    static post(forward) {
        return new ForwardDAO().update(forward);
    }
    static put(forward) {
        return new ForwardDAO().insert(forward);
    }
    static del(id) {
        return new ForwardDAO().deleteById(id);
    }
    static title(forward) {
        const sshInfo = new SSHDAO().selectById(forward.sshId);
        if (!sshInfo || !sshInfo.ssh) return forward.name || 'Unknown';
        return `${sshInfo.ssh.username}@${sshInfo.ssh.host}:${sshInfo.ssh.port}[${forward.name}]`;
    }
}
exports.ForwardVO = ForwardVO;
