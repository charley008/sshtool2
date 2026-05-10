// Alias for work-space-vo
// Recovered module id: 97
"use strict";

const { FTPDAO } = require("../storage/ftp.js");
const { SSHDAO } = require("../storage/ssh.js");
const { WorkspaceDAO } = require("../storage/workspace.js");
class WorkSpaceVO {
    constructor(workspace, ssh) {
        this.workspace = workspace;
        this.ssh = ssh;
    }
    static getAll() {
        return new WorkspaceDAO().selectAll();
    }
    static delAll() {
        return new WorkspaceDAO().deleteAll();
    }
    static get(id) {
        const ws = new WorkspaceDAO().selectById(id);
        const ssh = new SSHDAO().selectById(ws.eId);
        return new WorkSpaceVO(ws, ssh);
    }
    static post(ws) {
        return new WorkspaceDAO().update(ws);
    }
    static put(ws) {
        return new WorkspaceDAO().insert(ws);
    }
    static del(id) {
        return new WorkspaceDAO().deleteById(id);
    }
    static title(ws) {
        const sshInfo = new SSHDAO().selectById(ws.eId);
        if (sshInfo) {
            return `${sshInfo.ssh.username}@${sshInfo.ssh.host}:${sshInfo.ssh.port}[${ws.name}]`;
        }
        const ftpInfo = new FTPDAO().selectById(ws.eId);
        if (ftpInfo) {
            return `${ftpInfo.ftp.user}@${ftpInfo.ftp.host}:${ftpInfo.ftp.port}[${ws.name}]`;
        }
    }
}
exports.WorkSpaceVO = WorkSpaceVO;
