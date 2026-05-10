// Alias for work-space-service
// Recovered module id: 46
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

const vscode = require("vscode");
const { SSHAPI } = require("../api/ssh-api.js");
const { Type } = require("../shared/constants.js");
const { Util } = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const { FTPVO } = require("../models/ftp-model.js");
const { SSHVO } = require("../models/ssh-model.js");
const { ViewManager } = require("../ui/view-option.js");
class WorkSpaceService {
    createWorkSpaceView(infovo) {
        const tis = {
            save_title: (0, Localize)("xplot.view.connect.save.title"),
            connect_title: (0, Localize)("xplot.view.connect.connect.title"),
            workspace_name_title: (0, Localize)("xplot.view.connect.workspace.name.title"),
            workspace_dir_title: (0, Localize)("xplot.view.connect.workspace.dir.title"),
            workspace_rename_title: (0, Localize)("xplot.view.connect.workspace.rename.title"),
            workspace_delete_title: (0, Localize)("xplot.view.connect.workspace.delete.title")
        };
        let info;
        let info_title;
        if (infovo.type == Type.SSH) {
            info = infovo.ssh;
            info_title = SSHVO.title(info);
        }
        else {
            info = infovo.ftp;
            info_title = FTPVO.title(info);
        }
        ViewManager.createWebviewPanel({
            iconPath: Util.getExtPath("resources", "images", "icons", "workspace.svg"),
            path: "app", title: `ws://${info_title}`, splitView: false, singlePage: true, killHidden: true,
            eventHandler: (handler) => {
                handler.on("init", () => {
                    handler.emit("route", 'workspace');
                }).on("route-workspace", () => {
                    const sshvo = this.getvo(infovo);
                    handler.emit("show", { sshvo: sshvo, titles: tis });
                }).on("CONNECT_SSH_INFO_REFRESH", (content) => {
                    const sshvo = this.getvo(infovo);
                    handler.emit("show", { sshvo: sshvo, titles: tis });
                }).on("CONNECT_SSH_WORKSPACES_DELETE", (content) => {
                    vscode.window.showQuickPick([(0, Localize)("xplot.yes"), (0, Localize)("xplot.no")], { placeHolder: (0, Localize)("xplot.msg.api.workspace.delete.title"), canPickMany: false }).then((str) => __awaiter(this, void 0, void 0, function* () {
                        if (str == (0, Localize)("xplot.yes")) {
                            const wsinfo = content.workspace;
                            SSHAPI.workspace_del(wsinfo);
                            const sshvo = this.getvo(infovo);
                            handler.emit("show", { sshvo: sshvo, titles: tis });
                        }
                    }));
                }).on("CONNECT_SSH_WORKSPACES_MODIFY", (content) => {
                    const wsinfo = content.workspace;
                    vscode.window.showInputBox({ placeHolder: (0, Localize)("xplot.msg.api.workspace.modify.title", wsinfo.name), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
                        if (input === undefined) return;
                        const wsinfo = content.workspace;
                        input = input.trim() ? input : wsinfo.name;
                        SSHAPI.workspace_modify(wsinfo, input);
                        const sshvo = this.getvo(infovo);
                        handler.emit("show", { sshvo: sshvo, titles: tis });
                    }));
                });
            }
        });
    }
    getvo(infovo) {
        if (infovo.type == Type.SSH) {
            return SSHVO.get(infovo.ssh.id);
        }
        else {
            return FTPVO.get(infovo.ftp.id);
        }
    }
}
exports.WorkSpaceService = WorkSpaceService;
