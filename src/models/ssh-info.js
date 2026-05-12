// Alias for sshinfo
// Recovered module id: 81
"use strict";

const { SSH } = require("../connections/ssh-entity.js");
const constant_1 = require("../shared/constants.js");
class SSHInfo {
    constructor(name, group, status, ssh, description) {
        this.id = require("../utils/util.js").Util.uuid();
        this.name = name;
        this.type = constant_1.Type.SSH;
        this.group = group;
        this.status = status;
        this.ssh = ssh;
        this.description = description;
    }

    static New() {
        return new SSHInfo("default", "default", constant_1.SSHType.OFFLINE, new SSH('127.0.0.1', 22, 'root', constant_1.OSTypes.LINUX, null, null, null, null, { enabled: false, sshId: "" }), "");
    }
}
exports.SSHInfo = SSHInfo;
