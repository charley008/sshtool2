// Alias for work-space-info
// Recovered module id: 66
"use strict";

const { WorkSpace } = require("./workspace-entity.js");
class WorkSpaceInfo {
    constructor(eId, name, workspace, description) {
        this.id = require("../utils/util.js").Util.uuid();
        this.eId = eId;
        this.name = name;
        this.workspace = workspace;
        this.description = description;
    }
    // private sshDao = new SSHDAO(); 
    // private workspaceDao = new WorkSpaceDAO(); 
    // get(): WorkSpaceVO {
    //     const ssh = this.sshDao.selectById(this.eId);
    //     return new WorkSpaceVO(this,ssh);
    // }
    // put(): boolean { 
    //     return this.workspaceDao.insert(this);
    // }
    // post(): boolean { 
    //     return this.workspaceDao.update(this);
    // }
    // del(): boolean { 
    //     return this.workspaceDao.deleteById(this.id);
    // }
    static New(eId) {
        return new WorkSpaceInfo(eId, 'default', new WorkSpace('/'), '');
    }
}
exports.WorkSpaceInfo = WorkSpaceInfo;
