// Merged Remote DAO and DT
// Original module ids: 128 (RemoteDAO) and 140 (RemoteDT)
"use strict";

const { CacheKey } = require("../shared/constants.js");
const { BaseDT } = require("./base-dt.js");

/**
 * RemoteDT - Remote Data Transfer Object for managing remote desktop storage
 */
class RemoteDT extends BaseDT {
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
        if (!this.remotes) {
            this.remotes = this.context.globalState.get(CacheKey.SSHTOOL_CACHEKEY_DATA_REMOTE) || {};
        }
    }

    static get_remotes() {
        this.Init();
        // 排序
        this.remotes = this.rsort(this.remotes);
        return this.remotes;
    }

    static update_remotes(remotes) {
        this.context.globalState.update(CacheKey.SSHTOOL_CACHEKEY_DATA_REMOTE, remotes);
    }

    static update_remote(remote) {
        this.Init();
        const id = remote.id;
        this.remotes[id] = remote;
        this.update_remotes(this.remotes);
    }

    static insert_remote(remote) {
        this.Init();
        const id = remote.id;
        this.remotes[id] = remote;
        this.update_remotes(this.remotes);
    }

    static delete_remote(id) {
        this.Init();
        delete this.remotes[id];
        this.update_remotes(this.remotes);
        return true;
    }

    static delete_remotes() {
        this.remotes = null;
        this.update_remotes({});
    }
}

/**
 * RemoteDAO - Remote Data Access Object for remote desktop operations
 */
class RemoteDAO {
    constructor() { }

    insert(remote) {
        return RemoteDT.insert_remote(remote);
    }

    update(remote) {
        return RemoteDT.update_remote(remote);
    }

    selectAll() {
        return RemoteDT.get_remotes();
    }

    selectById(id) {
        const remotes = RemoteDT.get_remotes();
        if (remotes[id]) {
            return remotes[id];
        }
        return null;
    }

    deleteById(id) {
        return RemoteDT.delete_remote(id);
    }

    deleteAll() {
        RemoteDT.delete_remotes();
        return true;
    }

    selectBySSHId(sshId) {
        const remotes = RemoteDT.get_remotes();
        const result = {};
        for (const id in remotes) {
            if (remotes[id].eId === sshId) result[id] = remotes[id];
        }
        return result;
    }

    deleteBySSHId(sshId) {
        const remotes = RemoteDT.get_remotes();
        for (const id in remotes) {
            if (remotes[id].eId === sshId) delete remotes[id];
        }
        RemoteDT.update_remotes(remotes);
        return true;
    }
}

RemoteDT.remotes = null;

exports.RemoteDT = RemoteDT;
exports.RemoteDAO = RemoteDAO;
