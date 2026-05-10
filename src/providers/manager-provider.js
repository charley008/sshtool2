// Alias for manager-provider
// Recovered module id: 234
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

const { SSHNode } = require("../nodes/ssh-node.js");
const vscode = require("vscode");
const { Storage } = require("../storage/storage.js");
const constant_1 = require("../shared/constants.js");
const { GroupNode } = require("../nodes/group-node.js");
const NodeProvider = require("./node-provider.js").default;
const { GroupVO } = require("../models/group-model.js");
const { FTPNode } = require("../nodes/ftp-node.js");
class ManagerProvider extends NodeProvider {
    constructor() {
        super();
        const touchTempRemoteDocument = (document) => {
            if (!document || !document.uri || document.uri.scheme !== "file") {
                return;
            }
            Storage.touch_temp_file_remote(document.uri.fsPath);
        };
        vscode.workspace.textDocuments.forEach(touchTempRemoteDocument);
        vscode.workspace.onDidOpenTextDocument(touchTempRemoteDocument);
        vscode.workspace.onDidSaveTextDocument(e => {
            const tempPath = Storage.normalize_temp_file_path(e.fileName);
            const tempFile = Storage.get_temp_file_remote(tempPath);
            if (tempFile) {
                this.saveFile(tempPath, tempFile);
            }
        });
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element) {
                const bars = Storage.get_status_bars();
                const bar = bars[constant_1.StatusBar.GROUPS_LIST];
                if (constant_1.StatusBar.ALL == bar) {
                    const groupvos = GroupVO.getAll();
                    const nodes = Object.keys(groupvos).map((key) => {
                        const groupvo = groupvos[key];
                        if (groupvo.currGNSize > 0) {
                            return new GroupNode(groupvos[key], constant_1.ViewType.HOST);
                        }
                    });
                    return nodes;
                }
                else {
                    const groupvo = GroupVO.get(bar);
                    if (!groupvo)
                        return [];
                    const infovos = groupvo.infos;
                    const nodes = Object.keys(infovos).map(key => {
                        // 筛选组
                        const infovo = infovos[key];
                        if (infovo.type == constant_1.Type.SSH) {
                            if (bar == infovo.ssh.group) {
                                return new SSHNode(infovo, infovo.ssh.id);
                            }
                        }
                        if (infovo.type == constant_1.Type.FTP) {
                            if (bar == infovo.ftp.group) {
                                return new FTPNode(infovo, infovo.ftp.id);
                            }
                        }
                    });
                    return nodes;
                }
            }
            else {
                return element.getChildren();
            }
        });
    }
}
exports.default = ManagerProvider;
