// Merged SSH DAO and DT
// Original module ids: 53 (SSHDAO) and 141 (SSHDT)
"use strict";

const { CacheKey } = require("../shared/constants.js");
const { BaseDT } = require("./base-dt.js");

/**
 * SSHDT - SSH Data Transfer Object for managing SSH configuration storage
 */
class SSHDT extends BaseDT {
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
        if (!this.sshs) {
            this.sshs = this.context.globalState.get(CacheKey.XPLOT_CACHEKEY_DATA_SSH) || {};
        }
    }

    static get_sshs() {
        this.Init();
        // 排序
        this.sshs = this.rsort(this.sshs);
        return this.sshs;
    }

    static update_sshs(sshs) {
        this.context.globalState.update(CacheKey.XPLOT_CACHEKEY_DATA_SSH, sshs);
    }

    static verify_ssh(id) {
        this.Init();
        if (this.sshs[id]) {
            return true;
        }
        return false;
    }

    static update_ssh(ssh) {
        this.Init();
        const id = ssh.id;
        if (!this.verifyByID(ssh)) {
            this.sshs[id] = ssh;
            this.update_sshs(this.sshs);
            return true;
        }
        else {
            return false;
        }
    }

    static insert_ssh(ssh) {
        this.Init();
        if (!ssh.id || ssh.id === 'undefined') {
            ssh.id = require('crypto').randomUUID ? require('crypto').randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
        }
        if (!ssh.name && ssh.ssh) {
            ssh.name = `${ssh.ssh.username || 'root'}@${ssh.ssh.host || 'unknown'}`;
        }
        this.sshs[ssh.id] = ssh;
        this.update_sshs(this.sshs);
        return true;
    }

    static delete_ssh(id) {
        this.Init();
        delete this.sshs[id];
        this.update_sshs(this.sshs);
        return true;
    }

    static delete_sshs() {
        this.sshs = null;
        this.update_sshs({});
    }

    static verify(ssh) {
        const sshs = this.get_sshs();
        for (let i in sshs) {
            const lssh = sshs[i];
            if (lssh.id == ssh.id) {
                return false;
            }
            if (lssh.ssh.host == ssh.ssh.host
                && lssh.ssh.username == ssh.ssh.username
                && lssh.ssh.port == ssh.ssh.port) {
                return false;
            }
        }
        return true;
    }

    static verifyByID(ssh) {
        const sshs = this.get_sshs();
        for (let i in sshs) {
            const lssh = sshs[i];
            if (lssh.id == ssh.id) {
                return false;
            }
        }
        return true;
    }
}

/**
 * SSHDAO - SSH Data Access Object for SSH configuration operations
 */
class SSHDAO {
    constructor() { }

    insert(ssh) {
        return SSHDT.insert_ssh(ssh);
    }

    verify(id) {
        if (SSHDT.verify_ssh(id)) {
            return true;
        }
        return false;
    }

    update(ssh) {
        return SSHDT.update_ssh(ssh);
    }

    selectAll() {
        return SSHDT.get_sshs();
    }

    selectById(id) {
        const sshs = SSHDT.get_sshs();
        if (sshs[id]) {
            return sshs[id];
        }
        return null;
    }

    deleteById(id) {
        return SSHDT.delete_ssh(id);
    }

    deleteAll() {
        SSHDT.delete_sshs();
        return true;
    }
}

SSHDT.sshs = null;

exports.SSHDT = SSHDT;
exports.SSHDAO = SSHDAO;
