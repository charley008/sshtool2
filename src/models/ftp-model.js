// Alias for ftpvo
// Recovered module id: 11
"use strict";

const { FTPDAO } = require("../storage/ftp.js");
const { WorkspaceDAO } = require("../storage/workspace.js");
const { FTPCredentialService } = require("../services/ftp-credential-service.js");
class FTPVO {
    constructor(ftp, workspaces) {
        this.ftp = ftp;
        this.workspaces = workspaces;
    }
    static getAll() {
        return new FTPDAO().selectAll();
    }
    static delAll() {
        const ftps = FTPVO.getAll() || {};
        const ids = Object.keys(ftps);
        new WorkspaceDAO().deleteAll();
        FTPCredentialService.deleteMany(ids).catch((err) => {
            console.warn("[SSH Tools] Failed to delete all FTP credentials:", err && err.message ? err.message : err);
        });
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
        FTPCredentialService.saveFrom(ftpInfo).catch((err) => {
            console.warn("[SSH Tools] Failed to save FTP credentials:", err && err.message ? err.message : err);
        });
        return new FTPDAO().update(FTPCredentialService.sanitize(ftpInfo));
    }
    static put(ftpInfo) {
        FTPCredentialService.saveFrom(ftpInfo).catch((err) => {
            console.warn("[SSH Tools] Failed to save FTP credentials:", err && err.message ? err.message : err);
        });
        return new FTPDAO().insert(FTPCredentialService.sanitize(ftpInfo));
    }
    static del(ftpId) {
        new WorkspaceDAO().deleteByEId(ftpId);
        FTPCredentialService.delete(ftpId).catch((err) => {
            console.warn("[SSH Tools] Failed to delete FTP credentials:", err && err.message ? err.message : err);
        });
        return new FTPDAO().deleteById(ftpId);
    }
    static title(ftpInfo) {
        return `${ftpInfo.ftp.user}@${ftpInfo.ftp.host}:${ftpInfo.ftp.port}`;
    }
}
exports.FTPVO = FTPVO;
