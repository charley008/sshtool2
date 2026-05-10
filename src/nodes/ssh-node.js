// Alias for sshnode
// Recovered module id: 52
"use strict";

const path = require("path");
const constant_1 = require("../shared/constants.js");
var _sm = require("../services/service-manager.js");
const { SSHVO } = require("../models/ssh-model.js");
const { Node } = require("./base-connection-node.js");
class SSHNode extends Node {
    constructor(info, name, file, parentName, iconPath, isWorkspace) {
        super(info, name, file, parentName, iconPath, isWorkspace);
        this.info = info;
        this.name = name;
        this.file = file;
        this.parentName = parentName;
        const sinfo = info.ssh;
        this.id = file ? `${sinfo.id}_${parentName}.${name}` : `${sinfo.id}`;
        this.fullPath = this.parentName + this.name;
        this.isWorkspace = false;
        this.label = `${sinfo.name ? sinfo.name : 'default'}`;
        this.description = SSHVO.title(sinfo);
        this.viewType = constant_1.ViewType.HOST;
        this.contextValue = constant_1.NodeType.SSH;
        let ostype = "linux";
        if (constant_1.OSTypes.WINDOWS == sinfo.ssh.ostype) {
            ostype = "windows";
        }
        else if (constant_1.OSTypes.DARWIN == sinfo.ssh.ostype) {
            ostype = "darwin";
        }
        else if (sinfo.ssh.ostype == "debian") {
            ostype = "debian";
        }
        else if (sinfo.ssh.ostype == "ubuntu") {
            ostype = "ubuntu";
        }
        if (sinfo.status == constant_1.SSHType.OFFLINE) {
            this.collapsibleState = 0;
            this.iconPath = path.join(_sm.default.context.extensionPath, 'resources', 'images', `node-${ostype}-offline.svg`);
        }
        else {
            this.iconPath = path.join(_sm.default.context.extensionPath, 'resources', 'images', `node-${ostype}-online.svg`);
        }
    }
}
exports.SSHNode = SSHNode;
