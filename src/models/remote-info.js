// Alias for remote-info
// Recovered module id: 85
"use strict";

const { Util } = require("../utils/util.js");
const { RDP } = require("./rdp-model.js");
class RemoteInfo {
    constructor(eId, name, mark, mode, status, rdp) {
        this.id = require("../utils/util.js").Util.uuid();
        this.eId = eId;
        this.name = name;
        this.mark = mark;
        this.mode = mode;
        this.status = status;
        this.rdp = rdp;
    }
    static NewRDP(eId) {
        return new RemoteInfo(eId, 'default', false, 0, false, new RDP(false, 3389, 24, '1366x768'));
    }
}
exports.RemoteInfo = RemoteInfo;
