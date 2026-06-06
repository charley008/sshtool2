// Alias for node
// Recovered module id: 65
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

const { TreeItemCollapsibleState } = require("vscode");
const AbstractNode = require("./abstract-node.js").default;
const { Type } = require("../shared/constants.js");
const { ForwardService } = require("../services/forward-service.js");
const { SSHConn } = require("../connections/ssh-connection.js");
const { WorkSpaceService } = require("../services/workspace-service.js");
const { RemoteService } = require("../services/remote-service.js");
const { FTPConn } = require("../connections/ftp-connection.js");
const { FTPAPI } = require("../api/ftp-api.js");
const { SSHAPI } = require("../api/ssh-api.js");
const { InfoNode } = require("./info-node.js");
const Localize = require("../ui/localize.js").default;
class Node extends AbstractNode {
    constructor(info, name, file, parentName, iconPath, isWorkspace, viewType) {
        super(name, TreeItemCollapsibleState.Collapsed);
        this.info = info;
        this.name = name;
        this.file = file;
        this.parentName = parentName;
    }
    copySSHCommand() {
        if (this.info.type == Type.SSH) {
            SSHAPI.copy_ssh_command(this);
        }
    }
    copyName() {
        if (this.info.type == Type.SSH) {
            SSHAPI.copy_name(this);
        }
        if (this.info.type == Type.FTP) {
            FTPAPI.copy_name(this);
        }
    }
    copyPath() {
        if (this.info.type == Type.SSH) {
            SSHAPI.copy_path(this);
        }
        if (this.info.type == Type.FTP) {
            FTPAPI.copy_path(this);
        }
    }
    copySCPPath() {
        if (this.info.type == Type.SSH) {
            SSHAPI.copy_scp_command(this.info.ssh, this.fullPath);
        }
    }
    startSocksProxy() {
        if (this.info.type == Type.SSH) {
            SSHAPI.start_socks5_proxy(this.info.ssh);
        }
    }
    forwardPort() {
        if (this.info.type == Type.SSH) {
            new ForwardService().createForwardView(this.info.ssh);
        }
    }
    fowardPort() {
        this.forwardPort();
    }
    workspaceManagement() {
        new WorkSpaceService().createWorkSpaceView(this.info);
    }
    remoteManagement() {
        if (this.info.type == Type.SSH) {
            new RemoteService().createRemoteView(this.info.ssh);
        }
    }
    newFile() {
        if (this.info.type == Type.SSH) {
            SSHAPI.new_file(this);
        }
        else {
            FTPAPI.new_file(this);
        }
    }
    newFolder() {
        if (this.info.type == Type.SSH) {
            SSHAPI.new_folder(this);
        }
        else {
            FTPAPI.new_folder(this);
        }
    }
    rename() {
        if (this.info.type == Type.SSH) {
            SSHAPI.file_rename(this);
        }
    }
    upload() {
        if (this.info.type == Type.SSH) {
            SSHAPI.file_upload(this);
        }
        if (this.info.type == Type.FTP) {
            FTPAPI.file_upload(this);
        }
    }
    delete() {
        if (this.info.type == Type.SSH) {
            SSHAPI.file_delete(this);
        }
    }
    openRDesktop() {
        if (this.info.type == Type.SSH) {
            SSHAPI.open_rdesktop(this.info.ssh);
        }
    }
    openTerminal() {
        if (this.info.type == Type.SSH) {
            SSHAPI.open_terminal(this.info.ssh);
        }
    }
    openInTerminal() {
        if (this.info.type == Type.SSH) {
            SSHAPI.open_in_terminal(this.info.ssh, this.fullPath);
        }
    }
    openInTeriminal() {
        this.openInTerminal();
    }
    getChildren() {
        const that = this;
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            if (that.info.type == Type.SSH) {
                const parent = that.file ? `${that.parentName + that.name}/` : '/';
                const list = yield SSHConn.list(that.info.ssh, parent);
                if (list) {
                    resolve(SSHAPI.build_children(that, list, parent));
                }
                else {
                    resolve([new InfoNode((0, Localize)("sshtool.timeout"))]);
                }
            }
            if (that.info.type == Type.FTP) {
                const parent = that.file ? `${that.parentName + that.name}/` : '/';
                const list = yield FTPConn.list(that.info.ftp, parent);
                if (list) {
                    resolve(FTPAPI.build_children(that, list, parent));
                }
                else {
                    resolve([new InfoNode((0, Localize)("sshtool.timeout"))]);
                }
            }
        }));
    }
}
exports.Node = Node;
