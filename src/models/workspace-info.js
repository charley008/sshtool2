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

    static New(eId) {
        return new WorkSpaceInfo(eId, 'default', new WorkSpace('/'), '');
    }
}
exports.WorkSpaceInfo = WorkSpaceInfo;
