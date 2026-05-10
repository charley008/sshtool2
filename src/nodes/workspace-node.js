// Alias for workspace-node
// Recovered module id: 109
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
const { Node } = require("./base-connection-node.js");
var _sm = require("../services/service-manager.js");
const { FTPAPI } = require("../api/ftp-api.js");
const { InfoNode } = require("./info-node.js");
const { SSHConn } = require("../connections/ssh-connection.js");
const { SSHAPI } = require("../api/ssh-api.js");
const { FTPConn } = require("../connections/ftp-connection.js");
const Localize = require("../ui/localize.js").default;
class WorkspaceNode extends Node {
    constructor(info, name, workSpace, file, parentName, iconPath, isWorkspace, viewType) {
        super(info, name, file, parentName, iconPath, isWorkspace, viewType);
        this.info = info;
        this.name = name;
        this.workSpace = workSpace;
        this.file = file;
        this.parentName = parentName;
        let info_name = null;
        let info_status = null;
        if (info.type == constant_1.Type.SSH) {
            info_name = info.ssh.name;
            info_status = info.ssh.status;
            this.contextValue = constant_1.NodeType.SSH_WORKSPACE;
        }
        if (info.type == constant_1.Type.FTP) {
            info_name = info.ftp.name;
            info_status = info.ftp.status;
            this.contextValue = constant_1.NodeType.FTP_WORKSPACE;
        }
        this.id = file ? `${workSpace.id}_${parentName}.${name}` : `${workSpace.id}`;
        this.fullPath = this.fullPath ? this.fullPath : this.parentName + this.name;
        this.isWorkspace = false;
        this.workSpace = workSpace;
        this.label = workSpace.name;
        this.description = `<${info_name}>`;
        this.viewType = constant_1.ViewType.WORKSPACE;
        if (info_status == constant_1.SSHType.OFFLINE) {
            this.collapsibleState = 0;
            this.iconPath = path.join(_sm.default.context.extensionPath, 'resources', 'images', `work-space-no.svg`);
        }
        else {
            this.iconPath = path.join(_sm.default.context.extensionPath, 'resources', 'images', `work-space.svg`);
        }
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            const that = this;
            return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                if (this.info.type == constant_1.Type.SSH) {
                    const parent = this.file ? `${this.parentName + this.name}/` : this.fullPath;
                    const list = yield SSHConn.list(that.info.ssh, parent);
                    if (list) {
                        resolve(SSHAPI.build_children(that, list, parent));
                    }
                    else {
                        resolve([new InfoNode((0, Localize)("xplot.timeout"))]);
                    }
                }
                if (this.info.type == constant_1.Type.FTP) {
                    const parent = this.file ? `${this.parentName + this.name}/` : this.fullPath;
                    const list = yield FTPConn.list(that.info.ftp, parent);
                    if (list) {
                        resolve(FTPAPI.build_children(that, list, parent));
                    }
                    else {
                        resolve([new InfoNode((0, Localize)("xplot.timeout"))]);
                    }
                }
            }));
        });
    }
    download() {
        if (this.info.type == constant_1.Type.SSH) {
            SSHAPI.file_download(this);
        }
        if (this.info.type == constant_1.Type.FTP) {
            FTPAPI.file_download(this);
        }
    }
    openTerminal() {
        if (this.info.type == constant_1.Type.SSH) {
            SSHAPI.open_in_teriminal(this.info.ssh, this.fullPath);
        }
    }
}
exports.WorkspaceNode = WorkspaceNode;
