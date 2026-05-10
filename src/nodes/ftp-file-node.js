// Alias for ftpfile-node
// Recovered module id: 199
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
const { NodeType } = require("../shared/constants.js");
const AbstractNode = require("./abstract-node.js").default;
const { FTPAPI } = require("../api/ftp-api.js");
const prettyBytes = require("../utils/pretty-bytes.js");
class FTPFileNode extends AbstractNode {
    constructor(info, viewType, file, parentName) {
        super(file.name, TreeItemCollapsibleState.None);
        this.info = info;
        this.viewType = viewType;
        this.file = file;
        this.parentName = parentName;
        this.contextValue = NodeType.FTP_FILE;
        this.description = prettyBytes(file.size);
        this.iconPath = API.file_icon(this);
        // const pn = this.parentName;
        // this.parentName = pn.charAt(pn.length-1) == '/' ? pn : pn + "/"; 
        this.fullPath = parentName + file.name;
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
        FTPAPI.file_delete(this);
    }
    rename() {
        FTPAPI.file_rename(this);
    }
    copyName() {
        FTPAPI.copy_name(this);
    }
    copyPath() {
        FTPAPI.copy_path(this);
    }
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            FTPAPI.file_open(this);
        });
    }
    download() {
        FTPAPI.file_download(this);
    }
}
exports.FTPFileNode = FTPFileNode;
