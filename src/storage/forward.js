// Merged Forward DAO and DT
// Original module ids: 121 (ForwardDAO) and 139 (ForwardDT)
"use strict";

const { CacheKey } = require("../shared/constants.js");
const { BaseDT } = require("./base-dt.js");

/**
 * ForwardDT - Forward Data Transfer Object for managing port forwarding storage
 */
class ForwardDT extends BaseDT {
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
        if (!this.forwards) {
            this.forwards = this.context.globalState.get(CacheKey.XPLOT_CACHEKEY_DATA_FORWARD) || {};
        }
    }

    static get_forwards() {
        this.Init();
        // 排序
        this.forwards = this.rsort(this.forwards);
        return this.forwards;
    }

    static update_forwards(forwards) {
        this.context.globalState.update(CacheKey.XPLOT_CACHEKEY_DATA_FORWARD, forwards);
    }

    static update_forward(forward) {
        this.Init();
        const id = forward.id;
        this.forwards[id] = forward;
        this.update_forwards(this.forwards);
    }

    static insert_forward(forward) {
        this.Init();
        const id = forward.id;
        this.forwards[id] = forward;
        this.update_forwards(this.forwards);
    }

    static delete_forward(id) {
        this.Init();
        delete this.forwards[id];
        this.update_forwards(this.forwards);
        return true;
    }

    static delete_forwards() {
        this.forwards = null;
        this.update_forwards({});
    }
}

/**
 * ForwardDAO - Forward Data Access Object for port forwarding operations
 */
class ForwardDAO {
    constructor() { }

    insert(forward) {
        return ForwardDT.insert_forward(forward);
    }

    update(forward) {
        return ForwardDT.update_forward(forward);
    }

    selectAll() {
        return ForwardDT.get_forwards();
    }

    selectById(id) {
        const forwards = ForwardDT.get_forwards();
        if (forwards[id]) {
            return forwards[id];
        }
        return null;
    }

    deleteById(id) {
        return ForwardDT.delete_forward(id);
    }

    deleteAll() {
        ForwardDT.delete_forwards();
        return true;
    }

    selectBySSHId(sshId) {
        const forwards = ForwardDT.get_forwards();
        const result = {};
        for (const id in forwards) {
            if (forwards[id].sshId === sshId) result[id] = forwards[id];
        }
        return result;
    }

    deleteBySSHId(sshId) {
        const forwards = ForwardDT.get_forwards();
        for (const id in forwards) {
            if (forwards[id].sshId === sshId) delete forwards[id];
        }
        ForwardDT.update_forwards(forwards);
        return true;
    }
}

ForwardDT.forwards = null;

exports.ForwardDT = ForwardDT;
exports.ForwardDAO = ForwardDAO;
