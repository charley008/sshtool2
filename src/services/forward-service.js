// Alias for forward-service
// Recovered module id: 80
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
const os = require("os");
const path = require("path");
const fs = require("fs");
const { Util } = require("../utils/util.js");
const { ViewManager } = require("../ui/view-option.js");
const Localize = require("../ui/localize.js").default;
const { Console } = require("../ui/console.js");
const { ForwardApi } = require("../api/forward-api.js");
const { SSHVO } = require("../models/ssh-model.js");
const { ForwardVO } = require("../models/forward-model.js");
const { ForWardInfo } = require("../models/forward-info.js");
class ForwardService {
    createForwardView(sshInfo) {
        ViewManager.createWebviewPanel({
            iconPath: Util.getExtPath("resources", "images", "icons", "forward.svg"),
            splitView: false, singlePage: true, killHidden: true, path: "app", title: `fwd://${SSHVO.title(sshInfo)}`,
            eventHandler: (handler) => {
                const titles = {
                    connect_err_title: (0, Localize)("sshtool.view.forward.connect.err.title"),
                    host_title: (0, Localize)("sshtool.view.forward.host.title"),
                    name_title: (0, Localize)("sshtool.view.forward.name.title"),
                    localhost_title: (0, Localize)("sshtool.view.forward.localhost.title"),
                    localport_title: (0, Localize)("sshtool.view.forward.localport.title"),
                    remotehost_title: (0, Localize)("sshtool.view.forward.remotehost.title"),
                    remoteport_title: (0, Localize)("sshtool.view.forward.remoteport.title"),
                    type_title: (0, Localize)("sshtool.view.forward.type.title"),
                    operation_mode_title: (0, Localize)("sshtool.view.forward.operation.mode.title"),
                    operation_mode_ssh2_forward_title: (0, Localize)("sshtool.view.forward.operation.mode.ssh2.forward.title"),
                    operation_mode_local_ssh_exec_title: (0, Localize)("sshtool.view.forward.operation.mode.local.ssh.exec.title"),
                    operation_mode_description: os.type() == "Windows_NT"
                        ? (0, Localize)("sshtool.view.forward.operation.mode.description.windows.title")
                        : (0, Localize)("sshtool.view.forward.operation.mode.description.linux.title"),
                    type_local_port_forward_title: (0, Localize)("sshtool.view.forward.type.local.port.forward.title"),
                    type_remote_port_forward_title: (0, Localize)("sshtool.view.forward.type.remote.port.forward.title"),
                    type_socks5proxy_title: (0, Localize)("sshtool.view.forward.type.socks5proxy.title"),
                    state_title: (0, Localize)("sshtool.view.forward.state.title"),
                    description_title: (0, Localize)("sshtool.view.forward.description.title"),
                    but_create_title: (0, Localize)("sshtool.view.forward.but.create.title"),
                    but_update_title: (0, Localize)("sshtool.view.forward.but.update.title"),
                    but_start_title: (0, Localize)("sshtool.view.forward.but.start.title"),
                    but_stop_title: (0, Localize)("sshtool.view.forward.but.stop.title"),
                    but_edit_title: (0, Localize)("sshtool.view.forward.but.edit.title"),
                    but_reload_title: (0, Localize)("sshtool.view.forward.but.reload.title"),
                    but_delete_title: (0, Localize)("sshtool.view.forward.but.delete.title"),
                    but_command_title: (0, Localize)("sshtool.view.forward.but.command.title"),
                    panel_create_title: (0, Localize)("sshtool.view.forward.panel.create.title"),
                    panel_edit_title: (0, Localize)("sshtool.view.forward.panel.edit.title"),
                    but_cancel_title: (0, Localize)("sshtool.view.forward.but.cancel.title"),
                    but_save_title: (0, Localize)("sshtool.view.forward.but.save.title"),
                    state_running_title: (0, Localize)("sshtool.view.forward.state.running.title"),
                    state_stoped_title: (0, Localize)("sshtool.view.forward.state.stoped.title"),
                };
                handler.on("init", () => {
                    handler.emit("route", 'forward');
                }).on("route-forward", () => {
                    handler.emit("show", { sshvo: this.load(sshInfo), titles: titles });
                }).on("insert", (content) => __awaiter(this, void 0, void 0, function* () {
                    const forward = content;
                    if (!forward.id) forward.id = require('crypto').randomUUID();
                    if (!forward.sshId) forward.sshId = sshInfo.id;
                    try {
                        ForwardVO.put(forward);
                        const loaded = this.load(sshInfo);
                        Console.info((0, Localize)("sshtool.msg.forward.add.ok", ForwardVO.title(forward)));
                        handler.emit("show", { sshvo: loaded, titles: titles });
                    }
                    catch (err) {
                        Console.warn((0, Localize)("sshtool.msg.forward.add.no", ForwardVO.title(forward), err.message));
                        // handler.emit("error", err.message)
                    }
                })).on("update", (content) => __awaiter(this, void 0, void 0, function* () {
                    const forward = content;
                    if (!forward.id) forward.id = require('crypto').randomUUID();
                    if (!forward.sshId) forward.sshId = sshInfo.id;
                    try {
                        ForwardVO.post(forward);
                        Console.info((0, Localize)("sshtool.msg.forward.update.ok", ForwardVO.title(forward)));
                        handler.emit("show", { sshvo: this.load(sshInfo), titles: titles });
                    }
                    catch (err) {
                        Console.warn((0, Localize)("sshtool.msg.forward.add.no", ForwardVO.title(forward), err.message));
                        // handler.emit("error", err.message)
                    }
                })).on("start", (content) => __awaiter(this, void 0, void 0, function* () {
                    const forward = content;
                    if (!forward.id) forward.id = require('crypto').randomUUID();
                    if (!forward.sshId) forward.sshId = sshInfo.id;
                    try {
                        yield this.start(forward.id);
                        Console.info((0, Localize)("sshtool.msg.forward.start.ok", ForwardVO.title(forward)));
                        handler.emit("show", { sshvo: this.load(sshInfo), titles: titles });
                        handler.emit("success");
                    }
                    catch (e) {
                        Console.warn((0, Localize)("sshtool.msg.forward.start.no", ForwardVO.title(forward), e.message));
                    }
                })).on("stop", (content) => __awaiter(this, void 0, void 0, function* () {
                    const forward = content;
                    if (!forward.id) forward.id = require('crypto').randomUUID();
                    if (!forward.sshId) forward.sshId = sshInfo.id;
                    try {
                        yield this.stop(forward.id);
                        Console.info((0, Localize)("sshtool.msg.forward.stop.ok", ForwardVO.title(forward)));
                        handler.emit("show", { sshvo: this.load(sshInfo), titles: titles });
                        handler.emit("success");
                    }
                    catch (e) {
                        Console.warn((0, Localize)("sshtool.msg.forward.stop.no", ForwardVO.title(forward), e.message));
                    }
                })).on("remove", content => {
                    const forward = content;
                    if (!forward.id) forward.id = require('crypto').randomUUID();
                    if (!forward.sshId) forward.sshId = sshInfo.id;
                    vscode.window.showQuickPick([(0, Localize)("sshtool.yes"), (0, Localize)("sshtool.no")], { placeHolder: (0, Localize)("sshtool.msg.forward.remove.title", ForwardVO.title(forward)), canPickMany: false }).then((str) => __awaiter(this, void 0, void 0, function* () {
                        if (str == (0, Localize)("sshtool.yes")) {
                            try {
                                ForwardVO.del(forward.id);
                                Console.info((0, Localize)("sshtool.msg.forward.remove.ok", ForwardVO.title(forward)));
                                handler.emit("show", { sshvo: this.load(sshInfo), titles: titles });
                            }
                            catch (e) {
                                Console.warn((0, Localize)("sshtool.msg.forward.remove.no", ForwardVO.title(forward), e.message));
                            }
                        }
                    }));
                }).on("load", () => {
                    handler.emit("show", { sshvo: this.load(sshInfo), titles: titles });
                }).on("new", () => {
                    const forward = ForWardInfo.New(sshInfo.id);
                    handler.emit("new", { forward: forward, titles: titles });
                });
            }
        });
    }
    load(sshInfo) {
        return SSHVO.get(sshInfo.id);
    }
    start(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const forwardvo = ForwardVO.get(id);
            try {
                yield new ForwardApi(forwardvo).start();
                forwardvo.forward.status = true;
                ForwardVO.post(forwardvo.forward);
            }
            catch (e) {
                throw e;
            }
        });
    }
    stop(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const forwardvo = ForwardVO.get(id);
            try {
                yield new ForwardApi(forwardvo).stop();
                forwardvo.forward.status = false;
                ForwardVO.post(forwardvo.forward);
            }
            catch (e) {
                throw e;
            }
        });
    }
}
exports.ForwardService = ForwardService;
