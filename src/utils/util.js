// Alias for util
// Recovered module id: 7
"use strict";

const vscode = require("vscode");
var _sm = require("../services/service-manager.js");
const { join } = require("path");
const Localize = require("../ui/localize.js").default;
const crypto = require("crypto");
const fs = require("./fs-extra-runtime.js");
const constant_1 = require("../shared/constants.js");
const { SSHInfo } = require("../models/ssh-info.js");
const { SSH } = require("../connections/ssh-entity.js");
const { ForWardInfo } = require("../models/forward-info.js");
const { Forward } = require("../connections/forward-entity.js");
const { WorkSpaceInfo } = require("../models/workspace-info.js");
const { WorkSpace } = require("../models/workspace-entity.js");
const { RemoteInfo } = require("../models/remote-info.js");
const { RDP } = require("../models/rdp-model.js");
const { SSHVO } = require("../models/ssh-model.js");
const { ConfigVO } = require("../models/config-model.js");
class Util {
    static getExtPath(...paths) {
        return (0, join)(_sm.default.context.extensionPath, ...paths);
    }
    static confirm(placeHolder, callback) {
        vscode.window.showQuickPick([(0, Localize)("sshtool.yes"), (0, Localize)("sshtool.no")], { placeHolder }).then((res) => {
            if (res == (0, Localize)("sshtool.yes")) {
                callback();
            }
        });
    }
    static copyToBoard(content) {
        vscode.env.clipboard.writeText(content);
    }
    static ClipBoardToText() {
        return new Promise((resolve, reject) => {
            let text = vscode.env.clipboard.readText();
            resolve(text);
        });
    }
    static formatDate() {
        const Dates = new Date();
        const Year = Dates.getFullYear();
        const Months = (Dates.getMonth() + 1) < 10 ? '0' + (Dates.getMonth() + 1) : (Dates.getMonth() + 1);
        const Day = Dates.getDate() < 10 ? '0' + Dates.getDate() : Dates.getDate();
        const Hours = Dates.getHours() < 10 ? '0' + Dates.getHours() : Dates.getHours();
        const Minutes = Dates.getMinutes() < 10 ? '0' + Dates.getMinutes() : Dates.getMinutes();
        const Seconds = Dates.getSeconds() < 10 ? '0' + Dates.getSeconds() : Dates.getSeconds();
        return Year + '-' + Months + '-' + Day + '_' + Hours + ':' + Minutes + ':' + Seconds;
    }
    static replace(str) {
        const reg = /\?|\？|\*|\"|\“|\”|\'|\‘|\’|\<|\>|\{|\}|\[|\]|\【|\】|\：|\:|\、|\^|\$|\!|\~|\`|\|/gi;
        return str.replace(reg, "#");
    }
    // public static getStore(key: string): any {
    //     return _sm.default.context.globalState.get(key);
    // }
    // public static store(key: string, object: any) {
    //     _sm.default.context.globalState.update(key, object)
    // }
    static fileHash(tempFile) {
        const buffer = fs.readFileSync(tempFile);
        const fsHash = crypto.createHash('md5');
        fsHash.update(buffer);
        const md5 = fsHash.digest('hex');
        // console.log("文件的MD5是：%s", md5);
        return md5;
    }
    // 加密
    static genSign(src) {
        const key = Buffer.from('9vApxLk5G3PAsJrM', 'utf8');
        const iv = Buffer.from('FnJL7EDzjqWjcaY9', 'utf8');
        let sign = '';
        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        sign += cipher.update(src, 'utf8', 'hex');
        sign += cipher.final('hex');
        return sign;
    }
    // 解密
    static deSign(sign) {
        const key = Buffer.from('9vApxLk5G3PAsJrM', 'utf8');
        const iv = Buffer.from('FnJL7EDzjqWjcaY9', 'utf8');
        let src = '';
        const cipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        src += cipher.update(sign, 'hex', 'utf8');
        src += cipher.final('utf8');
        return src;
    }
    static configs_old_2_new(configs) {
        const nconfigs = {};
        for (let i in configs) {
            let config = configs[i];
            if (config['info']) {
                if (config.info['version']) {
                    const ver = config.info.version;
                    if (ver == 'v1') {
                        nconfigs[i] = config;
                    }
                }
                if (!config.info['ostype']) {
                    // ostype不存在默认为0，1.0.54
                    config.info['ostype'] = constant_1.OSType.LINUX;
                    nconfigs[i] = config;
                }
                if (!config.info['group']) {
                    // ostype不存在默认为0，1.0.64
                    config.info['group'] = 'default';
                    nconfigs[i] = config;
                }
            }
            else {
                //处理v1之前的配置文件
                let nconfig = {
                    info: { status: 1, version: 'v1' }, workspaces: [], ssh: {
                        name: '',
                        host: '',
                        port: 0,
                        username: '',
                        password: "",
                        private: "",
                        privateKey: '',
                        passphrase: '',
                        status: 0,
                        workspace: []
                    }
                };
                for (let key in config) {
                    if (key == 'workspace') {
                        nconfig.workspaces = config[key];
                        continue;
                    }
                    if (key == 'status') {
                        nconfig.info.status = config[key];
                        continue;
                    }
                    nconfig.ssh[key] = config[key];
                }
                if (nconfig.ssh.password) {
                    nconfig.ssh.passphrase = '';
                    nconfig.ssh.privateKey = '';
                    nconfig.ssh.private = '';
                }
                else {
                    nconfig.ssh.password = '';
                }
                for (let i in nconfig.ssh) {
                    if (!nconfig.ssh[i]) {
                        delete nconfig.ssh[i];
                    }
                }
                delete nconfig.ssh['workspace'];
                delete nconfig.ssh['status'];
                delete nconfig.ssh['heartbeat'];
                if (!nconfig.info['ostype']) {
                    // ostype不存在默认为0，1.0.54
                    nconfig.info['ostype'] = constant_1.OSType.LINUX;
                    nconfigs[i] = config;
                }
                if (!nconfig.info['group']) {
                    // ostype不存在默认为0，1.0.64
                    nconfig.info['group'] = 'default';
                    nconfigs[i] = nconfig;
                }
                nconfigs[i] = nconfig;
            }
        }
        // console.log(nconfigs)
        // SSHVO.delAll() 
        // FTPVO.delAll()
        const sshvos = {};
        for (let i in nconfigs) {
            let sshvo;
            let config = nconfigs[i];
            let sshinfo;
            let forwards = {};
            let remotes = {};
            let workspaces = {};
            if (config.ssh) {
                let ssh = config.ssh;
                let ostype = null;
                if (config.info.ostype == constant_1.OSType.LINUX) {
                    ostype = constant_1.OSTypes.LINUX;
                }
                if (config.info.ostype == constant_1.OSType.WINDOWS) {
                    ostype = constant_1.OSTypes.WINDOWS;
                }
                if (config.info.ostype == constant_1.OSType.DARWIN) {
                    ostype = constant_1.OSTypes.DARWIN;
                }
                sshinfo = new SSHInfo(ssh.name, config.info.group, config.info.status, new SSH(ssh.host, ssh.port, ssh.username, ostype, ssh.password, ssh.private, ssh.privateKey, ssh.passphrase), "");
            }
            if (config.forwards) {
                let frds = config.forwards;
                for (let fi in frds) {
                    let frd = frds[fi];
                    let frdinfo;
                    frdinfo = new ForWardInfo(sshinfo.id, "default", false, false, new Forward(frd.type, frd.mode, frd.localHost, frd.localPort, frd.remoteHost, frd.remotePort, frd.bastionHost, frd.bastionPort), "");
                    forwards[frdinfo.id] = frdinfo;
                }
            }
            if (config.workspaces) {
                let ws = config.workspaces;
                for (let wi in ws) {
                    let w = ws[wi];
                    let wsinfo = new WorkSpaceInfo(sshinfo.id, w.name, new WorkSpace(w.dir), "");
                    workspaces[wsinfo.id] = wsinfo;
                }
            }
            if (config.rdp) {
                let rd = config.rdp;
                let rinfo = new RemoteInfo(sshinfo.id, sshinfo.name, rd.isActive, rd.mode, rd.state, new RDP(rd.isFullScreen, rd.port, rd.colorDepth, rd.desktopGeometry));
                remotes[rinfo.id] = rinfo;
            }
            sshvos[sshinfo.id] = new SSHVO(sshinfo, forwards, workspaces, remotes);
        }
        const configvos = {};
        for (let i in sshvos) {
            const configvo = new ConfigVO(constant_1.Type.SSH);
            configvo.sshvo = sshvos[i];
            configvos[i] = configvo;
        }
        // console.log(sshvos)
        return configvos;
    }
    // 数组去重
    static uniq(array) {
        var temp = [];
        for (var i = 0; i < array.length; i++) {
            if (temp.indexOf(array[i]) == -1) {
                temp.push(array[i]);
            }
        }
        // 过滤null  
        temp = temp.filter(Boolean);
        // 排序
        temp = temp.sort(function (a, b) {
            return a.localeCompare(b);
        });
        return temp;
    }
    static uuid() {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        const bytes = crypto.randomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = bytes.toString("hex");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
}
exports.Util = Util;
