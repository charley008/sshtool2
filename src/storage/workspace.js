// Merged Workspace DAO and DT
// Original module ids: 125 (WorkspaceDAO) and 142 (WorkspaceDT)
"use strict";

const { CacheKey } = require("../shared/constants.js");
const { BaseDT } = require("./base-dt.js");

/**
 * WorkspaceDT - Workspace Data Transfer Object for managing workspace storage
 */
class WorkspaceDT extends BaseDT {
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
        if (!this.workspaces) {
            this.workspaces = this.context.globalState.get(CacheKey.SSHTOOL_CACHEKEY_DATA_WORKSPACE) || {};
        }
    }

    static get_workspaces() {
        this.Init();
        // 排序
        this.workspaces = this.rsort(this.workspaces);
        return this.workspaces;
    }

    static update_workspaces(workspaces) {
        this.context.globalState.update(CacheKey.SSHTOOL_CACHEKEY_DATA_WORKSPACE, workspaces);
        return true;
    }

    static update_workspace(workspaces) {
        this.Init();
        const id = workspaces.id;
        this.workspaces[id] = workspaces;
        this.update_workspaces(this.workspaces);
        return true;
    }

    static insert_workspace(workspace) {
        this.Init();
        if (this.verify(workspace)) {
            const id = workspace.id;
            this.workspaces[id] = workspace;
            this.update_workspaces(this.workspaces);
            return true;
        }
        return false;
    }

    static delete_workspace(id) {
        this.Init();
        delete this.workspaces[id];
        this.update_workspaces(this.workspaces);
        return true;
    }

    static delete_workspaces() {
        this.workspaces = null;
        this.update_workspaces({});
        return true;
    }

    static verify(workspace) {
        const workspaces = this.get_workspaces();
        for (let i in workspaces) {
            const ws = workspaces[i];
            if (ws.id == workspace.id) {
                return false;
            }
            if (ws.workspace.dir == workspace.workspace.dir && ws.eId == workspace.eId) {
                return false;
            }
        }
        return true;
    }
}

/**
 * WorkspaceDAO - Workspace Data Access Object for workspace operations
 */
class WorkspaceDAO {
    constructor() { }

    insert(workspace) {
        return WorkspaceDT.insert_workspace(workspace);
    }

    update(workspace) {
        return WorkspaceDT.update_workspace(workspace);
    }

    selectAll() {
        return WorkspaceDT.get_workspaces();
    }

    selectById(id) {
        const workspaces = WorkspaceDT.get_workspaces();
        if (workspaces[id]) {
            return workspaces[id];
        }
        return null;
    }

    deleteById(id) {
        return WorkspaceDT.delete_workspace(id);
    }

    deleteAll() {
        WorkspaceDT.delete_workspaces();
        return true;
    }

    selectByEId(eId) {
        const workspaces = WorkspaceDT.get_workspaces();
        const result = {};
        for (const id in workspaces) {
            if (workspaces[id].eId === eId) result[id] = workspaces[id];
        }
        return result;
    }

    deleteByEId(eId) {
        const workspaces = WorkspaceDT.get_workspaces();
        for (const id in workspaces) {
            if (workspaces[id].eId === eId) delete workspaces[id];
        }
        WorkspaceDT.update_workspaces(workspaces);
        return true;
    }
}

WorkspaceDT.workspaces = null;

exports.WorkspaceDT = WorkspaceDT;
exports.WorkspaceDAO = WorkspaceDAO;
