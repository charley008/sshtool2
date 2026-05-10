// Alias for config-vo
// Recovered module id: 43
"use strict";

const { Type } = require("../shared/constants.js");
const { FTPVO } = require("./ftp-model.js");
const { SSHVO } = require("./ssh-model.js");
class ConfigVO {
    constructor(type) {
        this.type = type;
    }
    static getAll() {
        const configvos = {};
        const sshs = SSHVO.getAll();
        const ftps = FTPVO.getAll();
        for (let id in sshs) {
            const cgvo = new ConfigVO(Type.SSH);
            cgvo.sshvo = SSHVO.get(id);
            configvos[id] = cgvo;
        }
        for (let id in ftps) {
            const cgvo = new ConfigVO(Type.FTP);
            cgvo.ftpvo = FTPVO.get(id);
            configvos[id] = cgvo;
        }
        return configvos;
    }
    static get(id) {
        let configvo;
        if (SSHVO.verify(id)) {
            configvo = new ConfigVO(Type.SSH);
            configvo.sshvo = SSHVO.get(id);
        }
        if (FTPVO.verify(id)) {
            configvo = new ConfigVO(Type.FTP);
            configvo.ftpvo = FTPVO.get(id);
        }
        return configvo;
    }
}
exports.ConfigVO = ConfigVO;
