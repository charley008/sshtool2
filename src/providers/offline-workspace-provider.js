// Alias for offline-workspace-provider
// Recovered module id: 236
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

const WorkspaceProvider = require("./workspace-provider.js").default;
const { Storage } = require("../storage/storage.js");
const constant_1 = require("../shared/constants.js");
const { GroupNode } = require("../nodes/group-node.js");
const { GroupVO } = require("../models/group-model.js");
class OfflineWorkspaceProvider extends WorkspaceProvider {
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!element) {
                const bars = Storage.get_status_bars();
                const bar = bars[constant_1.StatusBar.GROUPS_LIST];
                if (constant_1.StatusBar.ALL == bar) {
                    const groupvos = GroupVO.getAll(constant_1.SSHType.OFFLINE);
                    const nodes = Object.keys(groupvos).map((key) => {
                        const groupvo = groupvos[key];
                        if (groupvo.offlineSize > 0 && groupvo.workSpaceSize > 0) {
                            return new GroupNode(groupvos[key], constant_1.ViewType.WORKSPACE, constant_1.SSHType.OFFLINE);
                        }
                    });
                    return nodes;
                }
                else {
                    return this.getWorkspaces(bar, constant_1.SSHType.OFFLINE);
                }
            }
            else {
                return element.getChildren();
            }
        });
    }
}
exports.default = OfflineWorkspaceProvider;
