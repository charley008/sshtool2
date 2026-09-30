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
    static async delAll() {
        const sshs = SSHVO.getAll() || {};
        const ids = Object.keys(sshs);
        new ForwardDAO().deleteAll();
        new WorkspaceDAO().deleteAll();
        new RemoteDAO().deleteAll();
        new SSHDAO().deleteAll();
        await SSHCredentialService.deleteMany(ids);
        await require("../storage/base-dt.js").BaseDT.flush();
        return true;
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
    static async del(sshId) {
        return require("../services/config-mutation.js").ConfigMutation.run(async () => {
            const vo = this.get(sshId);
            new SSHDAO().deleteById(sshId);
            new ForwardDAO().deleteBySSHId(sshId);
            new RemoteDAO().deleteBySSHId(sshId);
            new WorkspaceDAO().deleteByEId(sshId);
            await require("../services/runtime-service.js").RuntimeService.closeConnection("ssh", sshId, vo);
            await SSHCredentialService.delete(sshId);
            await require("../storage/base-dt.js").BaseDT.flush();
            return true;
        });
    }
    static title(sshInfo) {
        return `${sshInfo.ssh.username}@${sshInfo.ssh.host}:${sshInfo.ssh.port}`;
    }
}
exports.SSHVO = SSHVO;
