// Alias for sshinfo
// Recovered module id: 81
"use strict";

const { Util } = require("../utils/util.js");
const { SSH } = require("../connections/ssh-entity.js");
const constant_1 = require("../shared/constants.js");
class SSHInfo {
    constructor(name, group, status, ssh, description) {
        this.id = require("../utils/util.js").Util.uuid();
        this.name = name;
        this.type = constant_1.Type.SSH;
        this.group = group;
        this.status = status;
        this.ssh = ssh;
        this.description = description;
    }
    // private sshDao = new SSHDAO();
    // private forwardDao = new ForwardDAO();
    // private workspaceDao = new WorkSpaceDAO();
    // private remoteDao = new RemoteDAO();
    // get(): SSHVO {
    //     const forwards = this.forwardDao.selectBySSHId(this.id);
    //     const workspaces = this.workspaceDao.selectBySSHId(this.id);
    //     const remotes = this.remoteDao.selectBySSHId(this.id);
    //     return new SSHVO(this,forwards,workspaces,remotes);
    // }
    // post(): boolean {
    //     return this.sshDao.update(this);
    // }
    // put(): boolean {
    //     return this.sshDao.insert(this);
    // }
    // del(): boolean {
    //     this.forwardDao.deleteBySSHId(this.id);
    //     this.workspaceDao.deleteBySSHId(this.id);
    //     this.remoteDao.deleteBySSHId(this.id)
    //     return this.sshDao.deleteById(this.id);
    // }
    static New() {
        return new SSHInfo("default", "default", constant_1.SSHType.OFFLINE, new SSH('127.0.0.1', 22, 'root', constant_1.OSTypes.LINUX, null, null, null, null), "");
    }
}
exports.SSHInfo = SSHInfo;
