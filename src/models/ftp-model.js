// Alias for ftpvo
// Recovered module id: 11
"use strict";

const { FTPDAO } = require("../storage/ftp.js");
const { WorkspaceDAO } = require("../storage/workspace.js");
class FTPVO {
    constructor(ftp, workspaces) {
        this.ftp = ftp;
        this.workspaces = workspaces;
    }
    static getAll() {
        return new FTPDAO().selectAll();
    }
    static delAll() {
        new WorkspaceDAO().deleteAll();
        return new FTPDAO().deleteAll();
    }
    static get(ftpId) {
        const workspaces = new WorkspaceDAO().selectByEId(ftpId);
        const ftp = new FTPDAO().selectById(ftpId);
        return new FTPVO(ftp, workspaces);
    }
    static verify(id) {
        if (new FTPDAO().verify(id)) {
            return true;
        }
        return false;
    }
    static post(ftpInfo) {
        return new FTPDAO().update(ftpInfo);
    }
    static put(ftpInfo) {
        return new FTPDAO().insert(ftpInfo);
    }
    static del(ftpId) {
        new WorkspaceDAO().deleteByEId(ftpId);
        return new FTPDAO().deleteById(ftpId);
    }
    static title(ftpInfo) {
        return `${ftpInfo.ftp.user}@${ftpInfo.ftp.host}:${ftpInfo.ftp.port}`;
    }
}
exports.FTPVO = FTPVO;
