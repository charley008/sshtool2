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
    static async delAll() {
        const ftps = FTPVO.getAll() || {};
        const ids = Object.keys(ftps);
        new WorkspaceDAO().deleteAll();
        new FTPDAO().deleteAll();
        await FTPCredentialService.deleteMany(ids);
        await require("../storage/base-dt.js").BaseDT.flush();
        return true;
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
        return new FTPDAO().update(FTPCredentialService.sanitize(ftpInfo));
    }
    static put(ftpInfo) {
        return new FTPDAO().insert(FTPCredentialService.sanitize(ftpInfo));
    }
    static async persist(ftpInfo, edit = false, epoch = require("../services/config-mutation.js").ConfigMutation.epoch, afterSave) {
        return require("../services/config-mutation.js").ConfigMutation.run(async () => {
            if (epoch !== require("../services/config-mutation.js").ConfigMutation.epoch) throw new Error("Configuration changed; reopen the connection editor.");
            if (!ftpInfo.id) ftpInfo.id = require("crypto").randomUUID();
            const dao = new FTPDAO();
            if (edit ? !dao.verify(ftpInfo.id) : !require("../storage/ftp.js").FTPDT.verify(ftpInfo)) return false;
            await FTPCredentialService.saveFrom(ftpInfo);
            const result = edit ? this.post(ftpInfo) : this.put(ftpInfo);
            if (result && afterSave) await afterSave();
            await require("../storage/base-dt.js").BaseDT.flush();
            return result;
        });
    }
    static async del(ftpId) {
        return require("../services/config-mutation.js").ConfigMutation.run(async () => {
            new FTPDAO().deleteById(ftpId);
            new WorkspaceDAO().deleteByEId(ftpId);
            await require("../services/runtime-service.js").RuntimeService.closeConnection("ftp", ftpId);
            await FTPCredentialService.delete(ftpId);
            await require("../storage/base-dt.js").BaseDT.flush();
            return true;
        });
    }
    static title(ftpInfo) {
        return `${ftpInfo.ftp.user}@${ftpInfo.ftp.host}:${ftpInfo.ftp.port}`;
    }
}
exports.FTPVO = FTPVO;
