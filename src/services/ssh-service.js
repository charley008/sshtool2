// Alias for sshservice
// Recovered module id: 227
"use strict";

const { API } = require("../api/core-api.js");
const { GroupAPI } = require("../api/group-api.js");
const { Console } = require("../ui/console.js");
const { Util } = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const { SSHConn } = require("../connections/ssh-connection.js");
const { SSHVO } = require("../models/ssh-model.js");
const { ViewManager } = require("../ui/view-option.js");
class SSHService {
    getJumpHostOptions(currentId = "") {
        const all = SSHVO.getAll() || {};
        return Object.keys(all)
            .map(id => all[id])
            .filter(item => item && item.id !== currentId)
            .map(item => ({
            id: item.id,
            label: SSHVO.title(item),
            name: item.name || SSHVO.title(item)
        }));
    }
    validateJumpHost(sshi) {
        const jump = Object.assign({ enabled: false, sshId: "" }, (sshi.ssh && sshi.ssh.jump) || {});
        sshi.ssh.jump = jump;
        if (!jump.enabled) {
            jump.sshId = "";
            return null;
        }
        if (!jump.sshId) {
            return "请选择跳板机";
        }
        if (jump.sshId === sshi.id) {
            return "不能选择当前连接作为跳板机";
        }
        const jumpVO = SSHVO.get(jump.sshId);
        if (!jumpVO || !jumpVO.ssh) {
            return "跳板机不存在";
        }
        const nestedJump = Object.assign({ enabled: false }, (jumpVO.ssh.ssh && jumpVO.ssh.ssh.jump) || {});
        if (nestedJump.enabled) {
            return "暂不支持多级跳板";
        }
        return null;
    }
    createSSHView(sshInfo, flag) {
        const tis = {
            tab_host_info_title: (0, Localize)("xplot.view.connect.tab.host.info.title"),
            connect_err_title: (0, Localize)("xplot.view.connect.connect.err.title"),
            connect_name_title: (0, Localize)("xplot.view.connect.connect.name.title"),
            connect_name_placeholder_title: (0, Localize)("xplot.view.connect.connect.name.placeholder.title"),
            host_title: (0, Localize)("xplot.view.connect.host.title"),
            host_placeholder_title: (0, Localize)("xplot.view.connect.host.placeholder.title"),
            port_title: (0, Localize)("xplot.view.connect.port.title"),
            port_placeholder_title: (0, Localize)("xplot.view.connect.port.placeholder.title"),
            user_title: (0, Localize)("xplot.view.connect.user.title"),
            user_placeholder_title: (0, Localize)("xplot.view.connect.user.placeholder.title"),
            group_title: (0, Localize)("xplot.view.connect.group.title"),
            group_placeholder_title: (0, Localize)("xplot.view.connect.group.placeholder.title"),
            ostype_title: (0, Localize)("xplot.view.connect.ostype.title"),
            ostype_windows_description: (0, Localize)("xplot.view.connect.ostype.windows.description"),
            type_title: (0, Localize)("xplot.view.connect.type.title"),
            password_title: (0, Localize)("xplot.view.connect.password.title"),
            password_placeholder_title: (0, Localize)("xplot.view.connect.password.placeholder.title"),
            privatekey_title: (0, Localize)("xplot.view.connect.privatekey.title"),
            privatekey_placeholder_title: (0, Localize)("xplot.view.connect.privatekey.placeholder.title"),
            passphrase_title: (0, Localize)("xplot.view.connect.passphrase.title"),
            passphrase_placeholder_title: (0, Localize)("xplot.view.connect.passphrase.placeholder.title"),
            save_title: (0, Localize)("xplot.view.connect.save.title"),
            connect_title: (0, Localize)("xplot.view.connect.connect.title"),
            tab_workspace_name_title: (0, Localize)("xplot.view.connect.tab.workspace.name.title"),
            workspace_name_title: (0, Localize)("xplot.view.connect.workspace.name.title"),
            workspace_dir_title: (0, Localize)("xplot.view.connect.workspace.dir.title"),
            workspace_rename_title: (0, Localize)("xplot.view.connect.workspace.rename.title"),
            workspace_delete_title: (0, Localize)("xplot.view.connect.workspace.delete.title"),
            rdesktop_title: (0, Localize)("xplot.view.connect.rdesktop.title"),
            rdesktop_active_title: (0, Localize)("xplot.view.connect.rdesktop.active.title"),
            rdesktop_fullscreen_title: (0, Localize)("xplot.view.connect.rdesktop.fullscreen.title"),
            rdesktop_mode_title: (0, Localize)("xplot.view.connect.rdesktop.mode.title"),
            rdesktop_port_title: (0, Localize)("xplot.view.connect.rdesktop.port.title"),
            rdesktop_colordepth_title: (0, Localize)("xplot.view.connect.rdesktop.colordepth.title"),
            rdesktop_desktopgeometry_title: (0, Localize)("xplot.view.connect.rdesktop.desktopgeometry.title"),
        };
        let viewicsvg = "";
        let viewtitle = "";
        if (flag == "edit") {
            viewicsvg = "edit.svg";
            viewtitle = `ssh://${SSHVO.title(sshInfo)}`;
        }
        else {
            viewicsvg = "add.svg";
            viewtitle = `ssh://${(0, Localize)("xplot.conn.add.title")}`;
        }
        ViewManager.createWebviewPanel({
            iconPath: Util.getExtPath("resources", "images", "icons", viewicsvg),
            path: "app", title: viewtitle, splitView: false, singlePage: true, killHidden: true,
            eventHandler: (handler) => {
                handler.on("init", () => {
                    handler.emit("route", 'ssh');
                }).on("route-ssh", () => {
                    const groups = GroupAPI.groups_list();
                    const jumpHosts = this.getJumpHostOptions(sshInfo && sshInfo.id ? sshInfo.id : "");
                    if (flag == "edit") {
                        handler.emit("edit", { sshInfo: sshInfo, titles: tis, groups: groups, jumpHosts });
                    }
                    else {
                        handler.emit("add", { sshInfo: sshInfo, titles: tis, groups: groups, jumpHosts });
                    }
                }).on("CONNECT_SSH_INFO_CONNECT", (content) => {
                    let sshi = content.sshInfo;
                    let msg = null;
                    if (!sshi.ssh.username) {
                        msg = (0, Localize)("xplot.msg.conn.input.username");
                    }
                    if (!sshi.ssh.password && !sshi.ssh.privates) {
                        msg = (0, Localize)("xplot.msg.conn.input.password");
                    }
                    if (!sshi.ssh.host) {
                        msg = (0, Localize)("xplot.msg.conn.input.host");
                    }
                    if (!sshi.ssh.port) {
                        msg = (0, Localize)("xplot.msg.conn.input.port");
                    }
                    if (msg) {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: msg });
                        return;
                    }
                    msg = this.validateJumpHost(sshi);
                    if (msg) {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: msg });
                        return;
                    }
                    sshi = this.parsPrivates2PrivateKey(sshi);
                    SSHConn.get(sshi, false).then(() => {
                        if (content.type == "edit" ? SSHVO.post(sshi) : SSHVO.put(sshi)) {
                            API.refresh();
                            Console.info((0, Localize)("xplot.msg.conn.add.ok", SSHVO.title(sshi)));
                            handler.panel.dispose();
                        }
                        else {
                            Console.info((0, Localize)("xplot.msg.conn.add.no", SSHVO.title(sshi)));
                        }
                    }).catch(err => {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: err.message });
                    });
                }).on("CONNECT_SSH_INFO_TEST", (content) => {
                    let sshi = content.sshInfo;
                    let msg = null;
                    if (!sshi.ssh.username) {
                        msg = (0, Localize)("xplot.msg.conn.input.username");
                    }
                    if (!sshi.ssh.password && !sshi.ssh.privates) {
                        msg = (0, Localize)("xplot.msg.conn.input.password");
                    }
                    if (!sshi.ssh.host) {
                        msg = (0, Localize)("xplot.msg.conn.input.host");
                    }
                    if (!sshi.ssh.port) {
                        msg = (0, Localize)("xplot.msg.conn.input.port");
                    }
                    if (msg) {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: msg });
                        return;
                    }
                    msg = this.validateJumpHost(sshi);
                    if (msg) {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: msg });
                        return;
                    }
                    try {
                        sshi = this.parsPrivates2PrivateKey(sshi);
                    } catch(e) {
                        Console.debug(`Private key parse failed: ${e && e.message ? e.message : e}`);
                    }
                    SSHConn.get(sshi, false).then(() => {
                        handler.emit('CONNECTION_TEST_OK', { titles: tis, msg: '连接测试成功' });
                        SSHConn.closeSSH(sshi);
                    }).catch(err => {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: err.message });
                    });
                }).on("CONNECT_SSH_INFO_SAVE", (content) => {
                    let sshi = content.sshInfo;
                    let msg = null;
                    if (!sshi.ssh.username) {
                        msg = (0, Localize)("xplot.msg.conn.input.username");
                    }
                    if (!sshi.ssh.password && !sshi.ssh.privates) {
                        msg = (0, Localize)("xplot.msg.conn.input.password");
                    }
                    if (!sshi.ssh.host) {
                        msg = (0, Localize)("xplot.msg.conn.input.host");
                    }
                    if (!sshi.ssh.port) {
                        msg = (0, Localize)("xplot.msg.conn.input.port");
                    }
                    if (msg) {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: msg });
                        return;
                    }
                    msg = this.validateJumpHost(sshi);
                    if (msg) {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: msg });
                        return;
                    }
                    sshi = this.parsPrivates2PrivateKey(sshi);
                    const result = content.type == "edit" ? SSHVO.post(sshi) : SSHVO.put(sshi);
                    if (result) {
                        API.refresh();
                        handler.panel.dispose();
                    }
                    else {
                        handler.emit('CONNECTION_ERROR', { titles: tis, msg: '保存失败，请检查连接信息' });
                    }
                });
            }
        });
    }
    parsPrivates2PrivateKey(sshi) {
        // 检查使用密码还是密钥，解析privates 赋值privateKey
        if (!sshi.ssh.password && sshi.ssh.privates) {
            const title = (0, Localize)("xplot.view.connect.passphrase.save.title");
            if (sshi.ssh.privates != title) {
                sshi.ssh.privateKey = sshi.ssh.privates;
                sshi.ssh.privates = title;
            }
        }
        return sshi;
    }
}
exports.SSHService = SSHService;
