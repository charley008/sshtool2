// Alias for online-provider
// Recovered module id: 138
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

const { SSHNode } = require("../nodes/ssh-node.js");
const { GroupNode } = require("../nodes/group-node.js");
const { Storage } = require("../storage/storage.js");
const constant_1 = require("../shared/constants.js");
const NodeProvider = require("./node-provider.js").default;
const { GroupVO } = require("../models/group-model.js");
const { FTPNode } = require("../nodes/ftp-node.js");
class OnlineProvider extends NodeProvider {
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element) {
                const bars = Storage.get_status_bars();
                const bar = bars[constant_1.StatusBar.GROUPS_LIST];
                if (constant_1.StatusBar.ALL == bar) {
                    const groupvos = GroupVO.getAll();
                    const nodes = Object.keys(groupvos).map((key) => {
                        const groupvo = groupvos[key];
                        if (groupvo.onlineSize > 0) {
                            return new GroupNode(groupvos[key], constant_1.ViewType.HOST, constant_1.SSHType.ONLINE);
                        }
                    });
                    return nodes;
                }
                else {
                    const groupvo = GroupVO.get(bar, constant_1.SSHType.ONLINE);
                    if (!groupvo)
                        return [];
                    const infovos = groupvo.infos;
                    const nodes = Object.keys(infovos).map(key => {
                        // 筛选组
                        const infovo = infovos[key];
                        if (infovo.type == constant_1.Type.SSH) {
                            if (bar == infovo.ssh.group) {
                                return new SSHNode(infovo, infovo.ssh.id);
                            }
                        }
                        if (infovo.type == constant_1.Type.FTP) {
                            if (bar == infovo.ftp.group) {
                                return new FTPNode(infovo, infovo.ftp.id);
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
}
exports.default = OnlineProvider;
