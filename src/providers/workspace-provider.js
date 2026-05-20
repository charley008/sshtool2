// Alias for workspace-provider
// Recovered module id: 110
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

const vscode = require("vscode");
const path = require("path");
;
const Localize = require("../ui/localize.js").default;
const { Storage } = require("../storage/storage.js");
const constant_1 = require("../shared/constants.js");
const { GroupNode } = require("../nodes/group-node.js");
const NodeProvider = require("./node-provider.js").default;
const { SSHVO } = require("../models/ssh-model.js");
const { SSHAPI } = require("../api/ssh-api.js");
const { GroupVO } = require("../models/group-model.js");
const { FTPVO } = require("../models/ftp-model.js");
const { FTPAPI } = require("../api/ftp-api.js");
const { WorkspaceNode } = require("../nodes/workspace-node.js");
class WorkspaceProvider extends NodeProvider {
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element) {
                const bars = Storage.get_status_bars();
                const bar = bars[constant_1.StatusBar.GROUPS_LIST];
                if (constant_1.StatusBar.ALL == bar) {
                    const groupvos = GroupVO.getAll();
                    const nodes = Object.keys(groupvos).map((key) => {
                        return new GroupNode(groupvos[key], constant_1.ViewType.WORKSPACE, constant_1.SSHType.ONLINE);
                    });
                    return nodes;
                }
                else {
                    return this.getWorkspaces(bar, constant_1.SSHType.ALL);
                }
            }
            else {
                return element.getChildren();
            }
        });
    }
    getWorkspaces(gname, sshtype) {
        let nodes = [];
        const groupvo = GroupVO.get(gname, sshtype);
        if (!groupvo)
            return [];
        const infovos = groupvo.infos;
        Object.keys(infovos).map((key) => {
            const infovo = infovos[key];
            if (infovo.type == constant_1.Type.SSH) {
                const wss = SSHVO.get(infovo.ssh.id).workspaces;
                if (Object.keys(wss).length != 0) {
                    for (let wsi in wss) {
                        const ws = wss[wsi];
                        let node = new WorkspaceNode(infovo, ws.id, ws);
                        node.fullPath = ws.workspace.dir;
                        nodes.push(node);
                    }
                }
            }
            if (infovo.type == constant_1.Type.FTP) {
                const wss = FTPVO.get(infovo.ftp.id).workspaces;
                if (Object.keys(wss).length != 0) {
                    for (let wsi in wss) {
                        const ws = wss[wsi];
                        let node = new WorkspaceNode(infovo, ws.id, ws);
                        node.fullPath = ws.workspace.dir;
                        nodes.push(node);
                    }
                }
            }
        });
        return nodes;
    }
    workspace_add(ws) {
        if (!ws || !ws.info || !ws.fullPath) {
            vscode.window.showWarningMessage((0, Localize)("sshtool.msg.api.workspace.add.no", ""));
            return;
        }
        const defaultName = ws.name || ws.label || path.basename(String(ws.fullPath).replace(/[\\\/]$/, "")) || "workspace";
        vscode.window.showInputBox({ placeHolder: (0, Localize)("sshtool.msg.api.workspace.add.title", defaultName), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim() ? input : defaultName;
            if (ws.info.type == constant_1.Type.SSH) {
                SSHAPI.workspace_add(ws.info, input, `${ws.fullPath}/`);
            }
            if (ws.info.type == constant_1.Type.FTP) {
                FTPAPI.workspace_add(ws.info, input, `${ws.fullPath}/`);
            }
        }));
    }
    workspace_del(ws) {
        vscode.window.showQuickPick([(0, Localize)("sshtool.yes"), (0, Localize)("sshtool.no")], { placeHolder: (0, Localize)("sshtool.msg.api.workspace.delete.title"), canPickMany: false }).then((str) => __awaiter(this, void 0, void 0, function* () {
            if (str == (0, Localize)("sshtool.yes")) {
                if (ws.info.type == constant_1.Type.SSH) {
                    SSHAPI.workspace_del(ws.workSpace);
                }
                if (ws.info.type == constant_1.Type.FTP) {
                    FTPAPI.workspace_del(ws.workSpace);
                }
            }
        }));
    }
    workspace_modify(ws) {
        vscode.window.showInputBox({ placeHolder: (0, Localize)("sshtool.msg.api.workspace.modify.title", ws.label), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim() ? input : ws.label.toString();
            if (ws.info.type == constant_1.Type.SSH) {
                SSHAPI.workspace_modify(ws.workSpace, input);
            }
            if (ws.info.type == constant_1.Type.FTP) {
                FTPAPI.workspace_modify(ws.workSpace, input);
            }
        }));
    }
}
exports.default = WorkspaceProvider;
