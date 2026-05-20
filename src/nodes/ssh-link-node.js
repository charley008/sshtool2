// Alias for link-node
// Recovered module id: 223
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
const { TreeItemCollapsibleState } = require("vscode");
const { API } = require("../api/core-api.js");
const { SSHAPI } = require("../api/ssh-api.js");
const constant_1 = require("../shared/constants.js");
const Localize = require("../ui/localize.js").default;
var _sm = require("../services/service-manager.js");
const { SSHConn } = require("../connections/ssh-connection.js");
const { SSHVO } = require("../models/ssh-model.js");
const { WorkSpaceService } = require("../services/workspace-service.js");
const AbstractNode = require("./abstract-node.js").default;
const { InfoNode } = require("./info-node.js");
class LinkNode extends AbstractNode {
    constructor(info, viewType, name, file, parentName, iconPath, isWorkspace) {
        super(name, TreeItemCollapsibleState.Collapsed);
        this.info = info;
        this.viewType = viewType;
        this.name = name;
        this.file = file;
        this.parentName = parentName;
        const sinfo = info.ssh;
        this.id = file ? `${sinfo.id}_${parentName}.${name}` : `${sinfo.id}`;
        this.fullPath = this.parentName + this.name;
        this.isWorkspace = false;
        this.viewType = viewType;
        this.contextValue = constant_1.NodeType.SSH_LINK;
        this.iconPath = API.folder_icon(this);
        const wss = SSHVO.get(sinfo.id).workspaces;
        const fpath = `${this.fullPath}/`;
        for (let key in wss) {
            if (wss[key].workspace.dir === fpath) {
                this.iconPath = path.join(_sm.default.context.extensionPath, 'resources', 'images', 'work-space.svg');
                this.isWorkspace = true;
                this.viewType = constant_1.ViewType.WORKSPACE;
                this.collapsibleState = 0;
            }
        }
    }
    copySSHCommand() {
        SSHAPI.copy_ssh_command(this);
    }
    copyName() {
        SSHAPI.copy_name(this);
    }
    copyPath() {
        SSHAPI.copy_path(this);
    }
    copySCPPath() {
        SSHAPI.copy_scp_command(this.info.ssh, this.fullPath);
    }
    newFile() {
        SSHAPI.new_file(this);
    }
    newFolder() {
        SSHAPI.new_folder(this);
    }
    rename() {
        SSHAPI.file_rename(this);
    }
    upload() {
        SSHAPI.file_upload(this);
    }
    delete() {
        SSHAPI.file_delete(this);
    }
    openTerminal() {
        SSHAPI.open_terminal(this.info.ssh);
    }
    openInTeriminal() {
        SSHAPI.open_in_teriminal(this.info.ssh, this.fullPath);
    }
    workspaceManagement() {
        new WorkSpaceService().createWorkSpaceView(this.info);
    }
    getChildren() {
        const that = this;
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            const parent = that.file ? `${that.parentName + that.name}/` : '/';
            const list = yield SSHConn.list(that.info.ssh, parent);
            if (list) {
                resolve(SSHAPI.build_children(that, list, parent));
            }
            else {
                resolve([new InfoNode((0, Localize)("sshtool.timeout"))]);
            }
        }));
    }
}
exports.LinkNode = LinkNode;
