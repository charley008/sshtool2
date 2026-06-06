// Merged FTP DAO and DT
// Original module ids: 87 (FTPDAO) and 143 (FTPDT)
"use strict";

const { CacheKey, SSHType, Type } = require("../shared/constants.js");
const { BaseDT } = require("./base-dt.js");

/**
 * FTPDT - FTP Data Transfer Object for managing FTP configuration storage
 */
class FTPDT extends BaseDT {
    static normalize_ftp(ftp) {
        if (!ftp) {
            return ftp;
        }
        ftp.type = Type.FTP;
        ftp.group = ftp.group || "default";
        ftp.status = typeof ftp.status === "number" ? ftp.status : SSHType.OFFLINE;
        ftp.description = ftp.description || "";
        ftp.ftp = Object.assign({
            host: "127.0.0.1",
            port: 21,
            user: "root",
            password: "",
            secure: false,
            ostype: "linux",
        }, ftp.ftp || {});
        ftp.name = ftp.name || `${ftp.ftp.user || "anonymous"}@${ftp.ftp.host || "unknown"}`;
        return ftp;
    }

    static normalize_ftps(ftps) {
        Object.keys(ftps || {}).forEach((id) => {
            ftps[id] = this.normalize_ftp(ftps[id]);
        });
        return ftps || {};
    }

    static rsort(rs) {
        const rt = {};
        const keys = Object.keys(rs).sort(function (a, b) {
            return rs[a].name.localeCompare(rs[b].name);
        });
        for (let i in keys) {
            const key = keys[i];
            rt[key] = rs[key];
        }
        return rt;
    }

    static Init() {
        if (!this.ftps) {
            this.ftps = this.context.globalState.get(CacheKey.SSHTOOL_CACHEKEY_DATA_FTP) || {};
        }
    }

    static get_ftps() {
        this.Init();
        this.ftps = this.normalize_ftps(this.ftps);
        this.update_ftps(this.ftps);
        // 排序
        this.ftps = this.rsort(this.ftps);
        return this.ftps;
    }

    static update_ftps(ftps) {
        this.context.globalState.update(CacheKey.SSHTOOL_CACHEKEY_DATA_FTP, ftps);
    }

    static verify_ftp(id) {
        this.Init();
        if (this.ftps[id]) {
            return true;
        }
        return false;
    }

    static update_ftp(ftp) {
        this.Init();
        ftp = this.normalize_ftp(ftp);
        const id = ftp.id;
        this.ftps[id] = ftp;
        this.update_ftps(this.ftps);
        return true;
    }

    static insert_ftp(ftp) {
        this.Init();
        ftp = this.normalize_ftp(ftp);
        if (!ftp.id || ftp.id === 'undefined') {
            ftp.id = (require('crypto').randomUUID ? require('crypto').randomUUID() : require('crypto').randomBytes(16).toString('hex'));
        }
        if (!ftp.name && ftp.ftp) {
            ftp.name = `${ftp.ftp.user || 'anonymous'}@${ftp.ftp.host || 'unknown'}`;
        }
        if (this.verify(ftp)) {
            this.ftps[ftp.id] = ftp;
            this.update_ftps(this.ftps);
            return true;
        }
        return false;
    }

    static delete_ftp(id) {
        this.Init();
        delete this.ftps[id];
        this.update_ftps(this.ftps);
        return true;
    }

    static delete_ftps() {
        this.ftps = null;
        this.update_ftps({});
    }

    static verify(ftp) {
        const ftps = this.get_ftps();
        for (let i in ftps) {
            const lftp = ftps[i];
            if (lftp.id == ftp.id) {
                return false;
            }
            if (lftp.ftp.host == ftp.ftp.host
                && lftp.ftp.user == ftp.ftp.user
                && lftp.ftp.port == ftp.ftp.port) {
                return false;
            }
        }
        return true;
    }
}

/**
 * FTPDAO - FTP Data Access Object for FTP configuration operations
 */
class FTPDAO {
    constructor() { }

    insert(ftp) {
        return FTPDT.insert_ftp(ftp);
    }

    verify(id) {
        if (FTPDT.verify_ftp(id)) {
            return true;
        }
        return false;
    }

    update(ftp) {
        return FTPDT.update_ftp(ftp);
    }

    selectAll() {
        return FTPDT.get_ftps();
    }

    selectById(id) {
        const ftps = FTPDT.get_ftps();
        if (ftps[id]) {
            return ftps[id];
        }
        return null;
    }

    deleteById(id) {
        return FTPDT.delete_ftp(id);
    }

    deleteAll() {
        FTPDT.delete_ftps();
        return true;
    }
}

FTPDT.ftps = null;

exports.FTPDT = FTPDT;
exports.FTPDAO = FTPDAO;
