// Alias for ftpnode
// Recovered module id: 59
"use strict";

const path = require("path");
const constant_1 = require("../shared/constants.js");
var _sm = require("../services/service-manager.js");
const { FTPVO } = require("../models/ftp-model.js");
const { Node } = require("./base-connection-node.js");
class FTPNode extends Node {
    constructor(info, name, file, parentName, iconPath, isWorkspace) {
        super(info, name, file, parentName, iconPath, isWorkspace);
        this.info = info;
        this.name = name;
        this.file = file;
        this.parentName = parentName;
        const fInfo = info.ftp;
        this.id = file ? `${fInfo.id}_${parentName}.${name}` : `${fInfo.id}`;
        this.fullPath = this.parentName + this.name;
        this.isWorkspace = false;
        this.label = `${fInfo.name ? fInfo.name : 'default'}`;
        this.description = FTPVO.title(fInfo);
        this.viewType = constant_1.ViewType.HOST;
        this.contextValue = constant_1.NodeType.FTP;
        if (fInfo.status == constant_1.SSHType.OFFLINE) {
            this.collapsibleState = 0;
            this.iconPath = path.join(_sm.default.context.extensionPath, 'resources', 'images', `node-ftp-offline.svg`);
        }
        else {
            this.iconPath = path.join(_sm.default.context.extensionPath, 'resources', 'images', `node-ftp-online.svg`);
        }
    }
}
exports.FTPNode = FTPNode;
