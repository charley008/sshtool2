// Alias for node-provider
// Recovered module id: 60
"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const { EventEmitter } = require("vscode");
const { API } = require("../api/core-api.js");
const { ConfigAPI } = require("../api/config-api.js");
const { FTPAPI } = require("../api/ftp-api.js");
const { GroupAPI } = require("../api/group-api.js");
const { SSHAPI } = require("../api/ssh-api.js");
const { Console } = require("../ui/console.js");
const constant_1 = require("../shared/constants.js");
const { Util } = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const { FTPInfo } = require("../models/ftp-info.js");
const { SSHInfo } = require("../models/ssh-info.js");
const { FTPVO } = require("../models/ftp-model.js");
const { SSHVO } = require("../models/ssh-model.js");
class NodeProvider {
    constructor() {
        this._onDidChangeTreeData = new EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            return [];
        });
    }
    saveFile(tempPath, tempFile) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tempFile.ssh) {
                SSHAPI.file_save(tempPath, tempFile);
            }
            else if (tempFile.ftp) {
                FTPAPI.file_save(tempPath, tempFile);
            }
        });
    }
    refresh() {
        this._onDidChangeTreeData.fire(null);
    }
    clearall() {
        Util.confirm((0, Localize)("sshtool.msg.clearall.alert"), () => {
            Promise.resolve(ConfigAPI.clear()).then(() => {
                API.refresh();
                Console.info((0, Localize)("sshtool.msg.clearall.ok"));
            }).catch((err) => {
                Console.err(err);
            });
        });
    }
    save_ssh(node) {
        return __awaiter(this, void 0, void 0, function* () {
            SSHAPI.ssh_save(node ? node.info.ssh : SSHInfo.New(), node ? "edit" : "add");
        });
    }
    save_ftp(node) {
        return __awaiter(this, void 0, void 0, function* () {
            FTPAPI.ftp_save(node ? node.info.ftp : FTPInfo.New(), node ? "edit" : "add");
        });
    }
    edit(node) {
        return __awaiter(this, void 0, void 0, function* () {
            if (node.info.type == constant_1.Type.SSH) {
                this.save_ssh(node);
            }
            if (node.info.type == constant_1.Type.FTP) {
                this.save_ftp(node);
            }
        });
    }
    delete(node) {
        if (constant_1.NodeType.GROUP == node.contextValue) {
            Util.confirm(`${(0, Localize)("sshtool.msg.conn.group.delete.alert", node.id)}?`, () => {
                GroupAPI.group_delete(node.id);
                Console.info((0, Localize)("sshtool.msg.group.delete.ok", node.id));
            });
        }
        else {
            if (node.info.type == constant_1.Type.SSH) {
                const sshInfo = node.info.ssh;
                Util.confirm(`${(0, Localize)("sshtool.msg.conn.delete.alert")} ${SSHVO.title(sshInfo)}?`, () => {
                    SSHAPI.ssh_delete(node.info);
                });
            }
            if (node.info.type == constant_1.Type.FTP) {
                const sshInfo = node.info.ftp;
                Util.confirm(`${(0, Localize)("sshtool.msg.conn.delete.alert")} ${FTPVO.title(sshInfo)}?`, () => {
                    FTPAPI.ftp_delete(node.info);
                });
            }
        }
    }
    unlink(node) {
        if (node.info.type == constant_1.Type.SSH) {
            SSHAPI.ssh_unlink(node.info);
        }
        if (node.info.type == constant_1.Type.FTP) {
            FTPAPI.ftp_unlink(node.info);
        }
    }
}
exports.default = NodeProvider;
