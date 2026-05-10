// Alias for remote-service
// Recovered module id: 108
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
const { Console } = require("../ui/console.js");
const { Util } = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const { RemoteInfo } = require("../models/remote-info.js");
const { RemoteVO } = require("../models/remote-model.js");
const { SSHVO } = require("../models/ssh-model.js");
const { ViewManager } = require("../ui/view-option.js");
const { RDesktopAPI } = require("../api/remote-desktop-api.js");
class RemoteService {
    createRemoteView(sshInfo) {
        const tis = {
            title: (0, Localize)("xplot.view.rdesktop.title"),
            name_title: (0, Localize)("xplot.view.rdesktop.name.title"),
            active_title: (0, Localize)("xplot.view.rdesktop.active.title"),
            fullscreen_title: (0, Localize)("xplot.view.rdesktop.fullscreen.title"),
            mode_title: (0, Localize)("xplot.view.rdesktop.mode.title"),
            port_title: (0, Localize)("xplot.view.rdesktop.port.title"),
            colordepth_title: (0, Localize)("xplot.view.rdesktop.colordepth.title"),
            desktopgeometry_title: (0, Localize)("xplot.view.rdesktop.desktopgeometry.title"),
            status_title: (0, Localize)("xplot.view.rdesktop.status.title"),
            but_create_title: (0, Localize)("xplot.view.forward.but.create.title"),
            but_update_title: (0, Localize)("xplot.view.forward.but.update.title"),
            but_start_title: (0, Localize)("xplot.view.forward.but.start.title"),
            but_stop_title: (0, Localize)("xplot.view.forward.but.stop.title"),
            but_edit_title: (0, Localize)("xplot.view.forward.but.edit.title"),
            but_reload_title: (0, Localize)("xplot.view.forward.but.reload.title"),
            but_delete_title: (0, Localize)("xplot.view.forward.but.delete.title"),
            but_command_title: (0, Localize)("xplot.view.forward.but.command.title"),
            panel_create_title: (0, Localize)("xplot.view.forward.panel.create.title"),
            panel_edit_title: (0, Localize)("xplot.view.forward.panel.edit.title"),
            but_cancel_title: (0, Localize)("xplot.view.forward.but.cancel.title"),
            but_save_title: (0, Localize)("xplot.view.forward.but.save.title"),
            status_running_title: (0, Localize)("xplot.view.forward.state.running.title"),
            status_stoped_title: (0, Localize)("xplot.view.forward.state.stoped.title"),
        };
        ViewManager.createWebviewPanel({
            iconPath: Util.getExtPath("resources", "images", "icons", "remote.svg"),
            path: "app", title: `rdp://${SSHVO.title(sshInfo)}`, splitView: false, singlePage: true, killHidden: true,
            eventHandler: (handler) => {
                handler.on("init", () => {
                    handler.emit("route", 'remote');
                }).on("route-remote", () => {
                    handler.emit("show", { sshvo: this.load(sshInfo), titles: tis });
                }).on("insert", (content) => __awaiter(this, void 0, void 0, function* () {
                    const remote = content;
                    if (!remote.id) remote.id = require('crypto').randomUUID();
                    if (!remote.eId) remote.eId = sshInfo.id;
                    try {
                        RemoteVO.put(remote);
                        Console.info((0, Localize)("xplot.msg.forward.add.ok", RemoteVO.title(remote)));
                        handler.emit("show", { sshvo: this.load(sshInfo), titles: tis });
                    }
                    catch (err) {
                        Console.warn((0, Localize)("xplot.msg.forward.add.no", RemoteVO.title(remote), err.message));
                        // handler.emit("error", err.message)
                    }
                })).on("update", (content) => __awaiter(this, void 0, void 0, function* () {
                    const remote = content;
                    if (!remote.id) remote.id = require('crypto').randomUUID();
                    if (!remote.eId) remote.eId = sshInfo.id;
                    try {
                        RemoteVO.post(remote);
                        Console.info((0, Localize)("xplot.msg.forward.update.ok", RemoteVO.title(remote)));
                        handler.emit("show", { sshvo: this.load(sshInfo), titles: tis });
                    }
                    catch (err) {
                        Console.warn((0, Localize)("xplot.msg.forward.add.no", RemoteVO.title(remote), err.message));
                        // handler.emit("error", err.message)
                    }
                })).on("start", (content) => __awaiter(this, void 0, void 0, function* () {
                    const remote = content;
                    if (!remote.id) remote.id = require('crypto').randomUUID();
                    if (!remote.eId) remote.eId = sshInfo.id;
                    yield this.start(remote.id);
                    handler.emit("show", { sshvo: this.load(sshInfo), titles: tis });
                })).on("stop", (content) => __awaiter(this, void 0, void 0, function* () {
                    const remote = content;
                    if (!remote.id) remote.id = require('crypto').randomUUID();
                    if (!remote.eId) remote.eId = sshInfo.id;
                    yield this.stop(remote.id);
                    handler.emit("show", { sshvo: this.load(sshInfo), titles: tis });
                })).on("remove", content => {
                    const remote = content;
                    if (!remote.id) remote.id = require('crypto').randomUUID();
                    if (!remote.eId) remote.eId = sshInfo.id;
                    vscode.window.showQuickPick([(0, Localize)("xplot.yes"), (0, Localize)("xplot.no")], { placeHolder: (0, Localize)("xplot.msg.forward.remove.title", RemoteVO.title(remote)), canPickMany: false }).then((str) => __awaiter(this, void 0, void 0, function* () {
                        if (str == (0, Localize)("xplot.yes")) {
                            try {
                                RemoteVO.del(remote.id);
                                Console.info((0, Localize)("xplot.msg.forward.remove.ok", RemoteVO.title(remote)));
                                handler.emit("show", { sshvo: this.load(sshInfo), titles: tis });
                            }
                            catch (e) {
                                Console.warn((0, Localize)("xplot.msg.forward.remove.no", RemoteVO.title(remote), e.message));
                            }
                        }
                    }));
                }).on("load", () => {
                    handler.emit("show", { sshvo: this.load(sshInfo), titles: tis });
                }).on("new", () => {
                    const remote = RemoteInfo.NewRDP(sshInfo.id);
                    handler.emit("new", { remote: remote, titles: tis });
                });
            }
        });
    }
    load(sshInfo) {
        return SSHVO.get(sshInfo.id);
    }
    start(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const vo = RemoteVO.get(id);
            try {
                yield new RDesktopAPI(vo).start();
            }
            catch (e) {
                Console.warn((0, Localize)("xplot.msg.connect.rdesktop.start.err", RemoteVO.title(vo.remote), e.message));
                throw e;
            }
            vo.remote.status = true;
            Console.info((0, Localize)("xplot.msg.connect.rdesktop.start.ok", RemoteVO.title(vo.remote)));
            RemoteVO.post(vo.remote);
        });
    }
    stop(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const vo = RemoteVO.get(id);
            try {
                yield new RDesktopAPI(vo).stop();
            }
            catch (e) {
                Console.warn((0, Localize)("xplot.msg.connect.rdesktop.stop.err", RemoteVO.title(vo.remote), e.message));
                throw e;
            }
            vo.remote.status = false;
            Console.info((0, Localize)("xplot.msg.connect.rdesktop.stop.ok", RemoteVO.title(vo.remote)));
            RemoteVO.post(vo.remote);
        });
    }
}
exports.RemoteService = RemoteService;
