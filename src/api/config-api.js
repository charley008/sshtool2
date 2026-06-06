// Alias for config-api
// Recovered module id: 58
"use strict";

const fs = require("fs-extra");
const { Console } = require("../ui/console.js");
const constant_1 = require("../shared/constants.js");
const { Util } = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const { SSHVO } = require("../models/ssh-model.js");
const { ConfigService } = require("../services/config-service.js");
const { SSHCredentialService } = require("../services/ssh-credential-service.js");
const { FTPCredentialService } = require("../services/ftp-credential-service.js");
const { ConfigVO } = require("../models/config-model.js");
const { createEncryptedExport, decryptExport, isEncryptedExport } = require("../utils/config-security.js");
const { omitSensitive } = require("../utils/sensitive-fields.js");
const _ftp = require("./ftp-api.js");
const { FTPVO } = require("../models/ftp-model.js");
const _ssh = require("./ssh-api.js");
const _core = require("./core-api.js");

class ConfigAPI {
    static is_current_config_map(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return false;
        }
        return Object.keys(value).some((key) => {
            const item = value[key];
            return item && typeof item === "object" && (item.type === constant_1.Type.SSH || item.type === constant_1.Type.FTP);
        });
    }

    static get_configvos(option = {}) {
        let configvos = {};
        if (option.mode) {
            configvos = ConfigVO.getAll();
        } else {
            const ids = option.ids || [];
            for (let i in ids) {
                const id = ids[i];
                const configvo = ConfigVO.get(id);
                if (configvo) {
                    configvos[id] = configvo;
                }
            }
        }
        return configvos;
    }

    static async get_configvos_async(option = {}) {
        const configvos = ConfigAPI.get_configvos(option);
        if (!option.includeSensitive) {
            return configvos;
        }
        for (const id of Object.keys(configvos)) {
            const configvo = configvos[id];
            if (configvo && configvo.type == constant_1.Type.SSH && configvo.sshvo && configvo.sshvo.ssh) {
                configvo.sshvo.ssh = await SSHCredentialService.hydrate(configvo.sshvo.ssh);
            }
            if (configvo && configvo.type == constant_1.Type.FTP && configvo.ftpvo && configvo.ftpvo.ftp) {
                configvo.ftpvo.ftp = await FTPCredentialService.hydrate(configvo.ftpvo.ftp);
            }
        }
        return configvos;
    }

    static parse_import_data(data, fileExt, option = {}) {
        let parsed;
        try {
            parsed = JSON.parse(data);
        } catch (_) {
            parsed = null;
        }

        if (isEncryptedExport(parsed)) {
            return decryptExport(parsed, option.password);
        }

        if ("key" == fileExt || "db" == fileExt) {
            data = Util.deSign(data);
        }

        parsed = JSON.parse(data);
        if (isEncryptedExport(parsed)) {
            return decryptExport(parsed, option.password);
        }
        if ("db" == fileExt || ConfigAPI.is_current_config_map(parsed)) {
            return parsed;
        }
        return Util.configs_old_2_new(parsed);
    }

    static clipboard_import_configvo() {
        try {
            Util.ClipBoardToText().then(text => {
                const arr = text.split(/#\n|#\r\n/);
                const host_title = arr[0];
                const info_text = arr[1];
                const reg = /^(.)+_(.)+@(.)+:([1-9][0-9])+/;
                const flag = reg.test(host_title);
                Console.info((0, Localize)("sshtool.msg.import.info.clipboard", host_title));
                if (host_title && info_text && flag) {
                    Util.confirm(`${(0, Localize)("sshtool.msg.import.title")} ${host_title}?`, () => {
                        ConfigAPI.import_configvo(info_text);
                        _core.API.refresh();
                    });
                } else {
                    Console.warn((0, Localize)("sshtool.msg.import.err.null"));
                }
            });
        } catch (e) {
            Console.warn((0, Localize)("sshtool.msg.import.err.design"));
            throw e;
        }
    }

    static import_configvo(data) {
        try {
            data = Util.deSign(data);
            const configvo = JSON.parse(data);
            if (configvo.type == constant_1.Type.SSH) {
                const sshvos = configvo.sshvo;
                _ssh.SSHAPI.import_sshvo(sshvos);
            }
            if (configvo.type == constant_1.Type.FTP) {
                const ftpvo = configvo.ftpvo;
                _ftp.FTPAPI.import_ftpvo(ftpvo);
            }
        } catch (e) {
            Console.warn((0, Localize)("sshtool.msg.import.err.design"));
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
        } catch (e) {
            Console.warn((0, Localize)("sshtool.msg.import.err.design"));
            throw e;
        }
    }

    static import(path, option = {}) {
        if (path.startsWith('/') && path[2] === ':') {
            path = path.substr(1);
        }
        const data = fs.readFileSync(path, 'utf-8');
        const fileExt = path.substring(path.lastIndexOf('.') + 1);
        try {
            return ConfigAPI.parse_import_data(data, fileExt, option);
        } catch (e) {
            Console.warn((0, Localize)("sshtool.msg.import.err.design"));
            throw e;
        }
    }

    static async export(path, option = {}) {
        if (path.startsWith('/') && path[2] === ':') {
            path = path.substr(1);
        }
        const dtime = Util.formatDate().replace(/:/gi, ".");
        const ext = option.plainJson ? "json" : "db";
        const dirFile = `${path}/sshtools_${dtime}.${ext}`;
        await ConfigAPI.export_to_file(dirFile, option);
        return dirFile;
    }

    static async export_to_file(filePath, option = {}) {
        let configvos = await ConfigAPI.get_configvos_async(option);
        if (option.includeSensitive) {
            configvos = createEncryptedExport(configvos, option.password);
        } else {
            configvos = omitSensitive(configvos);
        }

        let data = JSON.stringify(configvos, null, 4);
        if (!option.plainJson) {
            data = Util.genSign(data);
        }

        if (filePath.startsWith('/') && filePath[2] === ':') {
            filePath = filePath.substr(1);
        }
        fs.writeFileSync(filePath, data);
        Console.info(`${(0, Localize)("sshtool.msg.export.ok")}${filePath}`);
        return filePath;
    }

    static clear() {
        SSHVO.delAll();
        FTPVO.delAll();
    }

    static manager() {
        new ConfigService().createConfigView();
    }
}

exports.ConfigAPI = ConfigAPI;
