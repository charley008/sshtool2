// Alias for info-vo
// Recovered module id: 96
"use strict";

const constant_1 = require("../shared/constants.js");
const { FTPVO } = require("./ftp-model.js");
const { SSHVO } = require("./ssh-model.js");
class InfoVO {
    static getAll() {
        const infovos = {};
        const sshs = SSHVO.getAll();
        const ftps = FTPVO.getAll();
        for (let i in sshs) {
            const ssh = sshs[i];
            let info = new InfoVO();
            info.type = constant_1.Type.SSH;
            info.ssh = ssh;
            infovos[ssh.id] = info;
        }
        for (let i in ftps) {
            const ftp = ftps[i];
            let info = new InfoVO();
            info.type = constant_1.Type.FTP;
            info.ftp = ftp;
            infovos[ftp.id] = info;
        }
        return infovos;
    }
    static getOnlineAll() {
        const infovs = this.getAll();
        const infovos = {};
        for (let i in infovs) {
            const info = infovs[i];
            if (info.type == constant_1.Type.SSH) {
                if (info.ssh.status == constant_1.SSHType.ONLINE) {
                    infovos[i] = info;
                }
            }
            if (info.type == constant_1.Type.FTP) {
                if (info.ftp.status == constant_1.SSHType.ONLINE) {
                    infovos[i] = info;
                }
            }
        }
        return infovos;
    }
    static getOFFlineAll() {
        const infovs = this.getAll();
        const infovos = {};
        for (let i in infovs) {
            const info = infovs[i];
            if (info.type == constant_1.Type.SSH) {
                if (info.ssh.status == constant_1.SSHType.OFFLINE) {
                    infovos[i] = info;
                }
            }
            if (info.type == constant_1.Type.FTP) {
                if (info.ftp.status == constant_1.SSHType.OFFLINE) {
                    infovos[i] = info;
                }
            }
        }
        return infovos;
    }
    static delAll() {
        SSHVO.delAll();
        return FTPVO.delAll();
    }
    static get(id) {
        const infovo = new InfoVO();
        if (SSHVO.verify(id)) {
            infovo.type = constant_1.Type.SSH;
            infovo.ssh = SSHVO.get(id).ssh;
        }
        if (FTPVO.verify(id)) {
            infovo.type = constant_1.Type.FTP;
            infovo.ftp = FTPVO.get(id).ftp;
        }
        return infovo;
    }
    static post(infovo) {
        if (infovo.type == constant_1.Type.SSH) {
            return SSHVO.post(infovo.ssh);
        }
        if (infovo.type == constant_1.Type.FTP) {
            return FTPVO.post(infovo.ftp);
        }
    }
    static put(infovo) {
        if (infovo.type == constant_1.Type.SSH) {
            return SSHVO.put(infovo.ssh);
        }
        if (infovo.type == constant_1.Type.FTP) {
            return FTPVO.put(infovo.ftp);
        }
    }
    static del(infovo) {
        if (infovo.type == constant_1.Type.SSH) {
            return SSHVO.del(infovo.ssh.id);
        }
        if (infovo.type == constant_1.Type.FTP) {
            return FTPVO.del(infovo.ftp.id);
        }
    }
    static title(infovo) {
        if (infovo.type == constant_1.Type.SSH) {
            return SSHVO.title(infovo.ssh);
        }
        if (infovo.type == constant_1.Type.FTP) {
            return FTPVO.title(infovo.ftp);
        }
    }
}
exports.InfoVO = InfoVO;
