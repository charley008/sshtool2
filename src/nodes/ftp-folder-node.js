// Alias for ftpfolder-node
// Recovered module id: 198
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
const constant_1 = require("../shared/constants.js");
var _sm = require("../services/service-manager.js");
const { WorkSpaceService } = require("../services/workspace-service.js");
const AbstractNode = require("./abstract-node.js").default;
const { FTPVO } = require("../models/ftp-model.js");
const { FTPConn } = require("../connections/ftp-connection.js");
const { FTPAPI } = require("../api/ftp-api.js");
const { InfoNode } = require("./info-node.js");
const Localize = require("../ui/localize.js").default;
class FTPFolderNode extends AbstractNode {
    constructor(info, viewType, name, file, parentName, iconPath, isWorkspace) {
        super(name, TreeItemCollapsibleState.Collapsed);
        this.info = info;
        this.viewType = viewType;
        this.name = name;
        this.file = file;
        this.parentName = parentName;
        const sinfo = info.ftp;
        this.id = file ? `${sinfo.id}_${parentName}.${name}` : `${sinfo.id}`;
        this.fullPath = this.parentName + this.name;
        this.isWorkspace = false;
        this.viewType = viewType;
        this.contextValue = constant_1.NodeType.FTP_FOLDER;
        this.iconPath = API.folder_icon(this);
        const wss = FTPVO.get(sinfo.id).workspaces;
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
    copyName() {
        FTPAPI.copy_name(this);
    }
    copyPath() {
        FTPAPI.copy_path(this);
    }
    newFile() {
        FTPAPI.new_file(this);
    }
    newFolder() {
        FTPAPI.new_folder(this);
    }
    rename() {
        FTPAPI.file_rename(this);
    }
    upload() {
        FTPAPI.file_upload(this);
    }
    download() {
        FTPAPI.file_download(this);
    }
    delete() {
        FTPAPI.file_delete(this);
    }
    workspaceManagement() {
        new WorkSpaceService().createWorkSpaceView(this.info);
    }
    getChildren() {
        const that = this;
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            const parent = that.file ? `${that.parentName + that.name}/` : '/';
            const list = yield FTPConn.list(that.info.ftp, parent);
            if (list) {
                resolve(FTPAPI.build_children(that, list, parent));
            }
            else {
                resolve([new InfoNode((0, Localize)("sshtool.timeout"))]);
            }
        }));
    }
}
exports.FTPFolderNode = FTPFolderNode;
