// Alias for file-node
// Recovered module id: 221
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
const { API } = require("../api/core-api.js");
const { SSHAPI } = require("../api/ssh-api.js");
const constant_1 = require("../shared/constants.js");
const AbstractNode = require("./abstract-node.js").default;
const prettyBytes = require("../utils/pretty-bytes.js");
class FileNode extends AbstractNode {
    constructor(info, viewType, file, parentName) {
        super(file.filename, TreeItemCollapsibleState.None);
        this.info = info;
        this.viewType = viewType;
        this.file = file;
        this.parentName = parentName;
        this.contextValue = constant_1.NodeType.SSH_FILE;
        this.description = prettyBytes(file.attrs.size);
        this.iconPath = API.file_icon(this);
        // const pn = this.parentName;
        // this.parentName = pn.charAt(pn.length-1) == '/' ? pn : pn + "/"; 
        this.fullPath = this.parentName + this.file.filename;
        this.command = {
            command: "xplot.file.open",
            arguments: [this],
            title: "Open File"
        };
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            return [];
        });
    }
    delete() {
        SSHAPI.file_delete(this);
    }
    rename() {
        SSHAPI.file_rename(this);
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
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            SSHAPI.file_open(this);
        });
    }
    download() {
        SSHAPI.file_download(this);
    }
    openInTeriminal() {
        if (this.info.type == constant_1.Type.SSH) {
            SSHAPI.open_in_teriminal(this.info.ssh, this.fullPath);
        }
    }
}
exports.FileNode = FileNode;
