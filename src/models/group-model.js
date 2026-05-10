// Alias for group-vo
// Recovered module id: 26
"use strict";

const constant_1 = require("../shared/constants.js");
const { FTPVO } = require("./ftp-model.js");
const { InfoVO } = require("./info-model.js");
const { SSHVO } = require("./ssh-model.js");

function uniq(values) {
    const result = [];
    for (const value of values) {
        if (value && !result.includes(value)) {
            result.push(value);
        }
    }
    return result.sort((a, b) => a.localeCompare(b));
}

class GroupVO {
    constructor(name, nodeSize, currGNSize, groupSize, onlineSize, workSpaceSize, infos) {
        this.id = name;
        this.name = name;
        this.nodeSize = nodeSize;
        this.currGNSize = currGNSize;
        this.groupSize = groupSize;
        this.onlineSize = onlineSize;
        this.offlineSize = currGNSize - onlineSize;
        this.workSpaceSize = workSpaceSize;
        this.infos = infos;
    }
    static getAll(status = constant_1.SSHType.ALL) {
        let infovos = {};
        if (status == constant_1.SSHType.ONLINE) {
            infovos = InfoVO.getOnlineAll();
        }
        else if (status == constant_1.SSHType.OFFLINE) {
            infovos = InfoVO.getOFFlineAll();
        }
        else {
            infovos = InfoVO.getAll();
        }
        const groupvos = {};
        let nodeSize = 0;
        let groupSize = 0;
        let groups = Object.keys(infovos).map((key) => {
            nodeSize += 1;
            const infovo = infovos[key];
            if (infovo.type == constant_1.Type.SSH) {
                key = `${infovo.ssh.group}`;
            }
            if (infovo.type == constant_1.Type.FTP) {
                key = `${infovo.ftp.group}`;
            }
            return key;
        });
        groups = uniq(groups);
        groupSize = groups.length;
        for (let g in groups) {
            let currGNSize = 0;
            let onlineSize = 0;
            let workSpaceSize = 0;
            let infos = [];
            const gname = groups[g];
            for (let i in infovos) {
                const infovo = infovos[i];
                if (infovo.type == constant_1.Type.SSH) {
                    if (gname == infovo.ssh.group) {
                        currGNSize += 1;
                        if (infovo.ssh.status == constant_1.SSHType.ONLINE) {
                            onlineSize += 1;
                        }
                        const sshvo = SSHVO.get(infovo.ssh.id);
                        Object.keys(sshvo.workspaces).map((key) => {
                            workSpaceSize += 1;
                        });
                        infos.push(infovo);
                    }
                }
                if (infovo.type == constant_1.Type.FTP) {
                    if (gname == infovo.ftp.group) {
                        currGNSize += 1;
                        if (infovo.ftp.status == constant_1.SSHType.ONLINE) {
                            onlineSize += 1;
                        }
                        const ftpvo = FTPVO.get(infovo.ftp.id);
                        Object.keys(ftpvo.workspaces).map((key) => {
                            workSpaceSize += 1;
                        });
                        infos.push(infovo);
                    }
                }
            }
            const groupvo = new GroupVO(gname, nodeSize, currGNSize, groupSize, onlineSize, workSpaceSize, infos);
            groupvos[groupvo.id] = groupvo;
        }
        return groupvos;
    }
    static get(gname, status = constant_1.SSHType.ALL) {
        const groupvos = this.getAll(status);
        for (let i in groupvos) {
            const groupvo = groupvos[i];
            if (gname == groupvo.name) {
                return groupvo;
            }
        }
        return null;
    }
    static del(gname) {
        const groupvos = this.getAll();
        for (let i in groupvos) {
            const groupvo = groupvos[i];
            if (gname == groupvo.name) {
                for (let j in groupvo.infos) {
                    const info = groupvo.infos[j];
                    if (info.type == constant_1.Type.SSH) {
                        SSHVO.del(info.ssh.id);
                    }
                    if (info.type == constant_1.Type.FTP) {
                        FTPVO.del(info.ftp.id);
                    }
                }
            }
        }
        return true;
    }
    static modifyByGName(old_gname, new_gname) {
        const groupvos = this.getAll();
        for (let i in groupvos) {
            const groupvo = groupvos[i];
            if (old_gname == groupvo.name) {
                for (let j in groupvo.infos) {
                    const info = groupvo.infos[j];
                    if (info.type == constant_1.Type.SSH) {
                        info.ssh.group = new_gname;
                        SSHVO.post(info.ssh);
                    }
                    if (info.type == constant_1.Type.FTP) {
                        info.ftp.group = new_gname;
                        FTPVO.post(info.ftp);
                    }
                }
            }
        }
        return true;
    }
}
exports.GroupVO = GroupVO;
