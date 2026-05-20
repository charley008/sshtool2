// Alias for ftpservice
// Recovered module id: 189
"use strict";

const _core = require("../api/core-api.js");
const { GroupAPI } = require("../api/group-api.js");
const { Console } = require("../ui/console.js");
const { Util } = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const { FTPConn } = require("../connections/ftp-connection.js");
const { FTPVO } = require("../models/ftp-model.js");
const { FTPCredentialService } = require("./ftp-credential-service.js");
const { ViewManager } = require("../ui/view-option.js");
class FTPService {
    createFTPView(ftpInfo, flag) {
        const tis = {
            tab_host_info_title: (0, Localize)("sshtool.view.ftp.tab.host.info.title"),
            connect_err_title: (0, Localize)("sshtool.view.ftp.connect.err.title"),
            connect_name_title: (0, Localize)("sshtool.view.ftp.connect.name.title"),
            connect_name_placeholder_title: (0, Localize)("sshtool.view.ftp.connect.name.placeholder.title"),
            host_title: (0, Localize)("sshtool.view.ftp.host.title"),
            host_placeholder_title: (0, Localize)("sshtool.view.ftp.host.placeholder.title"),
            port_title: (0, Localize)("sshtool.view.ftp.port.title"),
            port_placeholder_title: (0, Localize)("sshtool.view.ftp.port.placeholder.title"),
            user_title: (0, Localize)("sshtool.view.ftp.user.title"),
            user_placeholder_title: (0, Localize)("sshtool.view.ftp.user.placeholder.title"),
            group_title: (0, Localize)("sshtool.view.ftp.group.title"),
            group_placeholder_title: (0, Localize)("sshtool.view.ftp.group.placeholder.title"),
            type_title: (0, Localize)("sshtool.view.ftp.type.title"),
            password_title: (0, Localize)("sshtool.view.ftp.password.title"),
            password_placeholder_title: (0, Localize)("sshtool.view.ftp.password.placeholder.title"),
            save_title: (0, Localize)("sshtool.view.ftp.save.title"),
            connect_title: (0, Localize)("sshtool.view.ftp.connect.title"),
        };
        let viewicsvg = "";
        let viewtitle = "";
        if (flag == "edit") {
            viewicsvg = "edit.svg";
            viewtitle = `ftp://${FTPVO.title(ftpInfo)}`;
        }
        else {
            viewicsvg = "add.svg";
            viewtitle = `ftp://${(0, Localize)("sshtool.conn.add.title")}`;
        }
        ViewManager.createWebviewPanel({
            iconPath: Util.getExtPath("resources", "images", "icons", viewicsvg),
            path: "app", title: viewtitle, splitView: false, singlePage: true, killHidden: true,
            eventHandler: (handler) => {
                handler.on("init", () => {
                    handler.emit("route", 'ftp');
                }).on("route-ftp", () => {
                    const groups = GroupAPI.groups_list();
                    if (flag == "edit") {
                        handler.emit("edit", { ftpInfo: FTPCredentialService.sanitize(ftpInfo), titles: tis, groups: groups });
                    }
                    else {
                        handler.emit("add", { ftpInfo: ftpInfo, titles: tis, groups: groups });
                    }
                }).on("CONNECT_FTP_INFO_CONNECT", (content) => {
                    const ftpi = content.ftpInfo;
                    // API.config_filter(content.ftpInfo, true);
                    let msg = null;
                    if (!ftpi.ftp.user) {
                        msg = (0, Localize)("sshtool.msg.ftp.input.username");
                    }
                    if (!ftpi.ftp.host) {
                        msg = (0, Localize)("sshtool.msg.ftp.input.host");
                    }
                    if (!ftpi.ftp.port) {
                        msg = (0, Localize)("sshtool.msg.ftp.input.port");
                    }
                    if (msg) {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: msg });
                        return;
                    }
                    FTPConn.get(ftpi).then(() => {
                        handler.emit('CONNECTION_TEST_OK', { msg: `连接成功 ${ftpi.ftp.host}:${ftpi.ftp.port}` });
                    }).catch(err => {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: err.message });
                    });
                }).on("CONNECT_FTP_INFO_SAVE", (content) => {
                    const ftpi = content.ftpInfo;
                    // const ftpi: FTPInfo = API.config_filter(content.ftpInfo, true);
                    let msg = null;
                    if (!ftpi.ftp.user) {
                        msg = (0, Localize)("sshtool.msg.ftp.input.username");
                    }
                    if (!ftpi.ftp.host) {
                        msg = (0, Localize)("sshtool.msg.ftp.input.host");
                    }
                    if (!ftpi.ftp.port) {
                        msg = (0, Localize)("sshtool.msg.ftp.input.port");
                    }
                    if (msg) {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: msg });
                        return;
                    }
                    if (content.type == "edit" ? FTPVO.post(ftpi) : FTPVO.put(ftpi)) {
                        _core.API.refresh();
                        Console.info((0, Localize)("sshtool.msg.ftp.save.ok", FTPVO.title(ftpi)));
                        handler.panel.dispose();
                    }
                    else {
                        Console.info((0, Localize)("sshtool.msg.ftp.save.no", FTPVO.title(ftpi)));
                    }
                });
            }
        });
    }
}
exports.FTPService = FTPService;
