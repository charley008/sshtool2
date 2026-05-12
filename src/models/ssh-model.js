// Alias for sshvo
// Recovered module id: 6
"use strict";

const { ForwardDAO } = require("../storage/forward.js");
const { RemoteDAO } = require("../storage/remote.js");
const { SSHDAO } = require("../storage/ssh.js");
const { WorkspaceDAO } = require("../storage/workspace.js");
const { SSHCredentialService } = require("../services/ssh-credential-service.js");
class SSHVO {
    constructor(ssh, forwards, workspaces, remotes) {
        this.ssh = ssh;
        this.forwards = forwards;
        this.workspaces = workspaces;
        this.remotes = remotes;
    }
    static getAll() {
        return new SSHDAO().selectAll();
    }
    static delAll() {
        const sshs = SSHVO.getAll() || {};
        const ids = Object.keys(sshs);
        new ForwardDAO().deleteAll();
        new WorkspaceDAO().deleteAll();
        new RemoteDAO().deleteAll();
        SSHCredentialService.deleteMany(ids).catch((err) => {
            console.warn("[SSH Tools] Failed to delete all SSH credentials:", err && err.message ? err.message : err);
        });
        return new SSHDAO().deleteAll();
    }
    static get(sshId) {
        const forwards = new ForwardDAO().selectBySSHId(sshId);
        const workspaces = new WorkspaceDAO().selectByEId(sshId);
        const remotes = new RemoteDAO().selectBySSHId(sshId);
        const ssh = new SSHDAO().selectById(sshId);
        return new SSHVO(ssh, forwards, workspaces, remotes);
    }
    static verify(id) {
        if (new SSHDAO().verify(id)) {
            return true;
        }
        return false;
    }
    static post(sshInfo) {
        return new SSHDAO().update(SSHCredentialService.sanitize(sshInfo));
    }
    static put(sshInfo) {
        return new SSHDAO().insert(SSHCredentialService.sanitize(sshInfo));
    }
    static del(sshId) {
        new ForwardDAO().deleteBySSHId(sshId);
        new RemoteDAO().deleteBySSHId(sshId);
        new WorkspaceDAO().deleteByEId(sshId);
        SSHCredentialService.delete(sshId).catch((err) => {
            console.warn("[SSH Tools] Failed to delete SSH credentials:", err && err.message ? err.message : err);
        });
        return new SSHDAO().deleteById(sshId);
    }
    static title(sshInfo) {
        return `${sshInfo.ssh.username}@${sshInfo.ssh.host}:${sshInfo.ssh.port}`;
    }
}
exports.SSHVO = SSHVO;
