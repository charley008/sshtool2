// Alias for group-node
// Recovered module id: 41
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

const path = require("path");
const constant_1 = require("../shared/constants.js");
const vscode_1 = require("vscode");
var _sm = require("../services/service-manager.js");
const AbstractNode = require("./abstract-node.js").default;
const { SSHNode } = require("./ssh-node.js");
const { WorkspaceNode } = require("./workspace-node.js");
const Localize = require("../ui/localize.js").default;
const { Console } = require("../ui/console.js");
const { SSHVO } = require("../models/ssh-model.js");
const { FTPVO } = require("../models/ftp-model.js");
const { InfoVO } = require("../models/info-model.js");
const { FTPNode } = require("./ftp-node.js");
const { GroupAPI } = require("../api/group-api.js");
const { SSHAPI } = require("../api/ssh-api.js");
class GroupNode extends AbstractNode {
    constructor(groupvo, viewType, sshtype) {
        super(groupvo.name, vscode_1.TreeItemCollapsibleState.Collapsed);
        this.groupvo = groupvo;
        this.viewType = viewType;
        this.sshtype = sshtype;
        this.isWorkspace = false;
        // this.id = file ? `${name}_${ssh.ssh.username}@${ssh.ssh.host}_${ssh.ssh.port}_${parentName}.${name}` : `${name}_${ssh.ssh.username}@${ssh.ssh.host}:${ssh.ssh.port}`;
        this.viewType = viewType;
        this.id = groupvo.id;
        this.sshtype = sshtype;
        this.contextValue = constant_1.NodeType.GROUP;
        const img_name = "groups";
        if (this.sshtype == constant_1.SSHType.OFFLINE) {
            this.iconPath = path.join(_sm.default.context.extensionPath, 'resources', 'images', `node-${img_name}-offline.svg`);
        }
        else {
            this.iconPath = path.join(_sm.default.context.extensionPath, 'resources', 'images', `node-${img_name}-online.svg`);
        }
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element) {
                let infovos;
                if (this.sshtype == constant_1.SSHType.OFFLINE) {
                    infovos = InfoVO.getOFFlineAll();
                }
                else if (this.sshtype == constant_1.SSHType.ONLINE) {
                    infovos = InfoVO.getOnlineAll();
                }
                else {
                    infovos = InfoVO.getAll();
                }
                if (constant_1.ViewType.HOST == this.viewType) {
                    const nodes = Object.keys(infovos).map((key) => {
                        const infovo = infovos[key];
                        if (infovo.type == constant_1.Type.SSH) {
                            if (this.groupvo.name == infovo.ssh.group) {
                                return new SSHNode(infovo, infovo.ssh.id);
                            }
                        }
                        if (infovo.type == constant_1.Type.FTP) {
                            if (this.groupvo.name == infovo.ftp.group) {
                                return new FTPNode(infovo, infovo.ftp.id);
                            }
                        }
                    });
                    return nodes;
                }
                else if (constant_1.ViewType.WORKSPACE == this.viewType) {
                    let nodes = [];
                    Object.keys(infovos).map((key) => {
                        const infovo = infovos[key];
                        if (infovo.type == constant_1.Type.SSH) {
                            if (this.groupvo.name == infovo.ssh.group) {
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
                        }
                        if (infovo.type == constant_1.Type.FTP) {
                            if (this.groupvo.name == infovo.ftp.group) {
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
    copySSHCommand() {
        SSHAPI.copy_ssh_command(this);
    }
    groupRename(node) {
        vscode_1.window.showInputBox({ placeHolder: (0, Localize)("xplot.msg.api.group.rename.title", node.id), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            if (input) {
                GroupAPI.group_rename(node.id, input);
                Console.info((0, Localize)("xplot.msg.api.group.rename.ok", node.id, input));
            }
            else {
                Console.info((0, Localize)("xplot.msg.api.group.rename.no", node.id));
            }
        }));
    }
    groupIn(node) {
        GroupAPI.to_groups_list_by_name(node.id);
    }
}
exports.GroupNode = GroupNode;
