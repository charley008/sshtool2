// Alias for block-node
// Recovered module id: 174
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
const { NodeType } = require("../shared/constants.js");
const AbstractNode = require("./abstract-node.js").default;
const { API } = require("../api/core-api.js");
const prettyBytes = require("../utils/pretty-bytes.js");
class BlockNode extends AbstractNode {
    constructor(info, file, parentName) {
        super(file.filename, TreeItemCollapsibleState.None);
        this.info = info;
        this.file = file;
        this.parentName = parentName;
        this.contextValue = NodeType.SSH_BLOCK;
        this.description = prettyBytes(file.attrs.size);
        this.iconPath = API.file_icon(this);
        this.fullPath = this.parentName + this.file.filename;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            return [];
        });
    }
}
exports.BlockNode = BlockNode;
