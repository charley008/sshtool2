// Alias for config-api
// Recovered module id: 58
"use strict";

const os = require("os");
const fs = require("../utils/fs-extra-runtime.js");
const { Console } = require("../ui/console.js");
const constant_1 = require("../shared/constants.js");
const { Util } = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const { SSHVO } = require("../models/ssh-model.js");
const { ConfigService } = require("../services/config-service.js");
const { ConfigVO } = require("../models/config-model.js");
const _ftp = require("./ftp-api.js");
const { FTPVO } = require("../models/ftp-model.js");
const _ssh = require("./ssh-api.js");
const _core = require("./core-api.js");
class ConfigAPI {
    //从剪切板导入主机信息
    static clipboard_import_configvo() {
        try {
            Util.ClipBoardToText().then(text => {
                const arr = text.split(/#\n|#\r\n/);
                const host_title = arr[0];
                const info_text = arr[1];
                const reg = /^(.)+_(.)+@(.)+:([1-9][0-9])+/;
                const flag = reg.test(host_title);
                Console.info((0, Localize)("xplot.msg.import.info.clipboard", host_title));
                if (host_title && info_text && flag) {
                    Util.confirm(`${(0, Localize)("xplot.msg.import.title")} ${host_title}?`, () => {
                        ConfigAPI.import_configvo(info_text);
                        _core.API.refresh();
                    });
                }
                else {
                    Console.warn((0, Localize)("xplot.msg.import.err.null"));
                }
            });
        }
        catch (e) {
            Console.warn((0, Localize)("xplot.msg.import.err.design"));
            throw e;
        }
    }
    // 解析text 将其导入到系统配置
    static import_configvo(data) {
        try {
            // 解密
            data = Util.deSign(data);
            // parse JSON object
            const configvo = JSON.parse(data);
            if (configvo.type == constant_1.Type.SSH) {
                const sshvos = configvo.sshvo;
                _ssh.SSHAPI.import_sshvo(sshvos);
            }
            if (configvo.type == constant_1.Type.FTP) {
                const ftpvo = configvo.ftpvo;
                _ftp.FTPAPI.import_ftpvo(ftpvo);
            }
        }
        catch (e) {
            Console.warn((0, Localize)("xplot.msg.import.err.design"));
            throw e;
        }
    }
    static import_configvos(configvos) {
        try {
            for (let id in configvos) {
                const configvo = configvos[id];
                if (configvo.type == constant_1.Type.SSH) {
                    const sshvos = configvo.sshvo;
                    _ssh.SSHAPI.import_sshvo(sshvos);
                }
                if (configvo.type == constant_1.Type.FTP) {
                    const ftpvo = configvo.ftpvo;
                    _ftp.FTPAPI.import_ftpvo(ftpvo);
                }
            }
        }
        catch (e) {
            Console.warn((0, Localize)("xplot.msg.import.err.design"));
            throw e;
        }
    }
    // 处理配置文件导入
    static import(path) {
        if (path.startsWith('/') && path[2] === ':') {
            path = path.substr(1);
        }
        let data = fs.readFileSync(path, 'utf-8');
        const fileExt = path.substring(path.lastIndexOf('.') + 1);
        try {
            if ("key" == fileExt || "db" == fileExt) {
                // 解密
                data = Util.deSign(data);
            }
            // parse JSON object
            const dt = JSON.parse(data);
            let configvos = {};
            if ("db" == fileExt) {
                configvos = dt;
            }
            else {
                configvos = Util.configs_old_2_new(dt);
            }
            return configvos;
        }
        catch (e) {
            Console.warn((0, Localize)("xplot.msg.import.err.design"));
            throw e;
        }
    }
    // 配置文件导出
    static export(path, option) {
        let configvos = {};
        if (option.mode) {
            configvos = ConfigVO.getAll();
        }
        else {
            const ids = option.ids;
            for (let i in ids) {
                const id = ids[i];
                configvos[id] = ConfigVO.get(id);
            }
        }
        // convert JSON object to string
        let data = JSON.stringify(configvos, null, 4);
        // 加密
        data = Util.genSign(data);
        // Fix path: VS Code URIs on Windows may have leading / like /c:/Users/...
        if (path.startsWith('/') && path[2] === ':') {
            path = path.substr(1);
        }
        const dtime = Util.formatDate().replace(/:/gi, ".");
        const dirFile = `${path}/sshtools_${dtime}.db`;
        fs.writeFileSync(dirFile, data);
        // vscode.commands.executeCommand('vscode.open', vscode.Uri.file(dirFile));
        Console.info(`${(0, Localize)("xplot.msg.export.ok")}${dirFile}`);
    }
    // 清空配置文件
    static clear() {
        SSHVO.delAll();
        FTPVO.delAll();
    }
    // 配置管理 处理config view页面事件
    static manager() {
        new ConfigService().createConfigView();
    }
}
exports.ConfigAPI = ConfigAPI;
