// Alias for remote-vo
// Recovered module id: 76
"use strict";

const { RemoteDAO } = require("../storage/remote.js");
const { SSHDAO } = require("../storage/ssh.js");
class RemoteVO {
    constructor(remote, ssh) {
        this.remote = remote;
        this.ssh = ssh;
    }
    static getAll() {
        return new RemoteDAO().selectAll();
    }
    static delAll() {
        return new RemoteDAO().deleteAll();
    }
    static get(id) {
        const remote = new RemoteDAO().selectById(id);
        const ssh = new SSHDAO().selectById(remote.eId);
        return new RemoteVO(remote, ssh);
    }
    static post(remote) {
        return new RemoteDAO().update(remote);
    }
    static put(remote) {
        return new RemoteDAO().insert(remote);
    }
    static del(id) {
        return new RemoteDAO().deleteById(id);
    }
    static title(remote) {
        const sshInfo = new SSHDAO().selectById(remote.eId);
        if (!sshInfo || !sshInfo.ssh) return remote.name || 'Unknown';
        return `${sshInfo.ssh.username}@${sshInfo.ssh.host}:${sshInfo.ssh.port}[${remote.name}]`;
    }
}
exports.RemoteVO = RemoteVO;
