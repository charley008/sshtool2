// Alias for api
// Recovered module id: 5
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
const path = require("path");
const fs = require("fs-extra");
const net = require("net");
const { Console } = require("../ui/console.js");
const constant_1 = require("../shared/constants.js");
const { Storage } = require("../storage/storage.js");
const { Util } = require("../utils/util.js");
const { Settings } = require("../utils/settings.js");
const { fileIcons } = require("../ui/file-icons.js");
const { folderIcons } = require("../ui/folder-icons.js");
const Localize = require("../ui/localize.js").default;
var _sm = require("../services/service-manager.js");
const GetProcesses = require("../utils/get-processes.js").default;
const { Global } = require("../ui/global-status.js");
const { SSHVO } = require("../models/ssh-model.js");
const { QuickPickItemVo } = require("../models/quick-pick-item.js");
const { ForwardVO } = require("../models/forward-model.js");
const { RemoteVO } = require("../models/remote-model.js");
const { FTPVO } = require("../models/ftp-model.js");
const { GroupAPI } = require("./group-api.js");
const { ConfigAPI } = require("./config-api.js");
class API {
    //init自动刷新
    static async auto() {
        Console.debug("api.ts func auto begin");
        await this.init_update_configs_version();
        this.auto_verify();
        this.startRefresh();
        this.autoVerifyTempFileRemotes();
        this.init_keys();
        Console.debug("api.ts func auto end");
    }
    //刷新所有视图
    static refresh() {
        Console.debug("api.ts func refresh begin");
        API.init_status_bar();
        vscode.commands.executeCommand(constant_1.Command.ONLINE_REFRESH, { background: true });
        vscode.commands.executeCommand(constant_1.Command.OFFLINE_REFRESH, { background: true });
        vscode.commands.executeCommand(constant_1.Command.MANAGER_REFRESH, { background: true });
        vscode.commands.executeCommand(constant_1.Command.WORKSPACE_ONLINE_REFRESH, { background: true });
        vscode.commands.executeCommand(constant_1.Command.WORKSPACE_OFFLINE_REFRESH, { background: true });
        Console.debug("api.ts func refresh end");
    }
    // status keys初始化 (ConsoleOututSwitch)
    static init_keys() {
        Console.debug("api.ts func init_keys begin");
        const keys = Storage.get_status_keys();
        if (!keys[constant_1.ConsoleOutputSwitch.KEY]) {
            keys[constant_1.ConsoleOutputSwitch.KEY] = constant_1.ConsoleOutputSwitch.OFF;
        }
        if (!keys[constant_1.DebugSwitch.KEY]) {
            keys[constant_1.DebugSwitch.KEY] = constant_1.DebugSwitch.OFF;
        }
        if (!keys[constant_1.TempKeys.TEMP_KEYS_TerminalOptions] || Object.keys(keys[constant_1.TempKeys.TEMP_KEYS_TerminalOptions]).length == 0) {
            const options = {};
            options.fontSize = 18;
            keys[constant_1.TempKeys.TEMP_KEYS_TerminalOptions] = options;
        }
        Storage.update_status_keys(keys);
        vscode.commands.executeCommand('setContext', 'sshtools2.console.switch', keys[constant_1.ConsoleOutputSwitch.KEY]);
        vscode.commands.executeCommand('setContext', 'sshtools2.debug', keys[constant_1.DebugSwitch.KEY]);
        Console.debug("api.ts func init_keys end");
    }
    // status_bar 初始化
    static init_status_bar() {
        Console.debug("api.ts func init_status_bar begin");
        const bars = Storage.get_status_bars();
        if (bars[constant_1.StatusBar.GROUPS_LIST]) {
            const bar = bars[constant_1.StatusBar.GROUPS_LIST];
            if (constant_1.StatusBar.ALL != bar) {
                const groups = GroupAPI.groupvo_list();
                for (let i in groups) {
                    const groupvo = groups[i];
                    if (groupvo.name == bar) {
                        Global.updateStatusBarItems(constant_1.StatusBar.GROUPS_LIST, bar);
                    }
                }
            }
            else {
                Global.updateStatusBarItems(constant_1.StatusBar.GROUPS_LIST, constant_1.StatusBar.ALL);
            }
        }
        else {
            Global.updateStatusBarItems(constant_1.StatusBar.GROUPS_LIST, constant_1.StatusBar.ALL);
        }
        Console.debug("api.ts func init_status_bar end");
    }
    //管理console output 是否开启
    static console_output_switch(flag) {
        Console.debug("api.ts func console_output_switch begin");
        const keys = Storage.get_status_keys();
        if (flag == constant_1.ConsoleOutputSwitch.KEY) {
            // 输出
            if (keys[constant_1.ConsoleOutputSwitch.KEY] == constant_1.ConsoleOutputSwitch.ON) {
                vscode.commands.executeCommand('setContext', 'sshtools2.console.switch', constant_1.ConsoleOutputSwitch.OFF);
                keys[constant_1.ConsoleOutputSwitch.KEY] = constant_1.ConsoleOutputSwitch.OFF;
                Console.info((0, Localize)("sshtool.console.switch.off.title"));
            }
            else if (keys[constant_1.ConsoleOutputSwitch.KEY] == constant_1.ConsoleOutputSwitch.OFF) {
                vscode.commands.executeCommand('setContext', 'sshtools2.console.switch', constant_1.ConsoleOutputSwitch.ON);
                keys[constant_1.ConsoleOutputSwitch.KEY] = constant_1.ConsoleOutputSwitch.ON;
                Console.info((0, Localize)("sshtool.console.switch.on.title"));
            }
            else {
                keys[constant_1.ConsoleOutputSwitch.KEY] = constant_1.ConsoleOutputSwitch.ON;
            }
        }
        if (flag == constant_1.DebugSwitch.KEY) {
            // 调试
            if (keys[constant_1.DebugSwitch.KEY] == constant_1.DebugSwitch.ON) {
                vscode.commands.executeCommand('setContext', 'sshtools2.debug', constant_1.DebugSwitch.OFF);
                keys[constant_1.DebugSwitch.KEY] = constant_1.DebugSwitch.OFF;
                Console.info((0, Localize)("sshtool.debug.off.title"));
            }
            else if (keys[constant_1.DebugSwitch.KEY] == constant_1.DebugSwitch.OFF) {
                vscode.commands.executeCommand('setContext', 'sshtools2.debug', constant_1.DebugSwitch.ON);
                keys[constant_1.DebugSwitch.KEY] = constant_1.DebugSwitch.ON;
                Console.info((0, Localize)("sshtool.debug.on.title"));
            }
            else {
                keys[constant_1.DebugSwitch.KEY] = constant_1.DebugSwitch.ON;
            }
        }
        Storage.update_status_keys(keys);
        Console.debug("api.ts func console_output_switch end");
    }
    static autoVerifyTempFileRemotes() {
        return __awaiter(this, void 0, void 0, function* () {
            Console.debug("api.ts func autoVerifyTempFileRemotes begin");
            const tempFileRemotes = Storage.get_temp_file_remotes();
            const openTempPaths = new Set(vscode.workspace.textDocuments
                .filter(document => document.uri && document.uri.scheme === "file")
                .map(document => Storage.normalize_temp_file_path(document.uri.fsPath)));
            const timestamp = new Date().getTime();
            const oneDayLong = 24 * 3600 * 1000;
            for (let i in tempFileRemotes) {
                if (openTempPaths.has(i)) {
                    Storage.touch_temp_file_remote(i);
                    continue;
                }
                const tempFileRemote = tempFileRemotes[i] || {};
                const tempTimestamp = typeof tempFileRemote.timeStamp === "number" ? tempFileRemote.timeStamp : 0;
                if (timestamp - tempTimestamp >= oneDayLong) {
                    Storage.delete_temp_file_remote(i);
                }
            }
            Console.debug("api.ts func autoVerifyTempFileRemotes end");
        });
    }
    static async init_update_configs_version() {
        Console.debug("api.ts func init_update_configs_version begin");
        const configs = Storage.get_conections_config();
        if (Object.keys(configs).length > 0) {
            const configvos = Util.configs_old_2_new(configs);
            await ConfigAPI.import_configvos(configvos);
            Storage.delete_configs();
        }
        Console.debug("api.ts func init_update_configs_version end");
    }
    //自动检查主机主机、forward、rdesktop状态
    static auto_verify() {
        this.verificationPaused = false;
        if (this.verifyTimer) return;
        const schedule = () => {
            if (this.verificationPaused || this.verifyTimer) return;
            this.verifyTimer = setTimeout(async () => {
                this.verifyTimer = null;
                try { await this.auto_varify_icmp(); }
                catch (error) { Console.err(error); }
                schedule();
            }, Math.max(1000, Settings.PingHostTime * 1000));
        };
        schedule();
    }
    static stopVerification() {
        this.verificationPaused = true;
        this.verifyGeneration = (this.verifyGeneration || 0) + 1;
        clearTimeout(this.verifyTimer);
        this.verifyTimer = null;
        for (const socket of this.probeSockets || []) socket.destroy();
        return this.verifyRun ? this.verifyRun.catch(() => {}) : Promise.resolve();
    }
    static startRefresh() {
        clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => this.refresh(), Math.max(1000, Settings.RefreshNodeTime * 1000));
    }
    static stopRefresh() {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
    }
    // 添加信息 主机  或  ftp
    static probeTcp(host, port, timeout = 2000) {
        return new Promise((resolve) => {
            const socket = net.createConnection({ host, port: Number(port), timeout });
            if (!this.probeSockets) this.probeSockets = new Set();
            this.probeSockets.add(socket);
            let settled = false;
            const finish = (open) => {
                if (settled) {
                    return;
                }
                settled = true;
                this.probeSockets.delete(socket);
                socket.destroy();
                resolve(open);
            };
            socket.on("connect", () => finish(true));
            socket.on("timeout", () => finish(false));
            socket.on("error", () => finish(false));
            socket.on("close", () => finish(false));
        });
    }
    static open_add() {
        Console.debug("api.ts func open_add begin");
        const types = ['SSH', 'FTP'];
        let typeArr = [];
        for (let i in types) {
            const t = types[i];
            let qvo = new QuickPickItemVo();
            qvo.label = t;
            qvo.description = `     [${t}]`;
            typeArr.push(qvo);
        }
        vscode.window.showQuickPick(typeArr, { placeHolder: (0, Localize)("sshtool.conn.add.title") }).then(vo => {
            if (vo) {
                if (vo.label == types[0]) {
                    vscode.commands.executeCommand(constant_1.Command.ADD_SSH);
                }
                else if (vo.label == types[1]) {
                    vscode.commands.executeCommand(constant_1.Command.ADD_FTP);
                }
            }
            Console.debug("api.ts func open_add end");
        });
    }
    // 文件图标
    static file_icon(that) {
        const fileName = that.info.type == constant_1.Type.SSH ? that.file.filename : that.file.name;
        Console.debug(`api.ts func file_icon fileName:${fileName}`);
        let defaultFileIcon = fileIcons.defaultIcon.name;
        if (that.contextValue == constant_1.NodeType.SSH_BLOCK || that.contextValue == constant_1.NodeType.FTP_BLOCK) {
            defaultFileIcon = fileIcons.defaultBlockIcon.name;
        }
        else if (that.contextValue == constant_1.NodeType.SSH_CHARACTER || that.contextValue == constant_1.NodeType.FTP_CHARACTER) {
            defaultFileIcon = fileIcons.defaultCharacterIcon.name;
        }
        else if (that.contextValue == constant_1.NodeType.SSH_PIPE || that.contextValue == constant_1.NodeType.FTP_PIPE) {
            defaultFileIcon = fileIcons.defaultPipeIcon.name;
        }
        else if (that.contextValue == constant_1.NodeType.SSH_SOCKETS || that.contextValue == constant_1.NodeType.FTP_SOCKETS) {
            defaultFileIcon = fileIcons.defaultSocketsIcon.name;
        }
        else {
            defaultFileIcon = fileIcons.defaultIcon.name;
        }
        const extPath = _sm.default.context.extensionPath;
        const ficons = fileIcons;
        var f = 1;
        if (that.viewType == constant_1.ViewType.WORKSPACE) {
            for (var i in ficons.icons) {
                const iconObj = ficons.icons[i];
                const fname = fileName.toLowerCase();
                for (var t in iconObj.fileNames) {
                    const iext = iconObj.fileNames[t];
                    if (fname == iext) {
                        f = 0;
                        break;
                    }
                }
                if (f == 0) {
                    defaultFileIcon = iconObj.name;
                    break;
                }
            }
            if (f != 0) {
                for (var i in ficons.icons) {
                    const iconObj = ficons.icons[i];
                    const fname = fileName.toLowerCase();
                    for (var t in iconObj.fileExtensions) {
                        const iext = "." + iconObj.fileExtensions[t];
                        const e = fname.length - iext.length;
                        if (e >= 0 && fname.lastIndexOf(iext) == e) {
                            f = 0;
                            break;
                        }
                    }
                    if (f == 0) {
                        defaultFileIcon = iconObj.name;
                        break;
                    }
                }
            }
        }
        else {
            for (var i in ficons.icons) {
                const iconObj = ficons.icons[i];
                const fname = fileName.toLowerCase();
                for (var t in iconObj.fileExtensions) {
                    const iext = "." + iconObj.fileExtensions[t];
                    const e = fname.length - iext.length;
                    if (e >= 0 && fname.lastIndexOf(iext) == e) {
                        f = 0;
                        break;
                    }
                }
                if (f == 0) {
                    defaultFileIcon = iconObj.name;
                    break;
                }
            }
            if (f != 0) {
                for (var i in ficons.icons) {
                    const iconObj = ficons.icons[i];
                    const fname = fileName.toLowerCase();
                    for (var t in iconObj.fileNames) {
                        const iext = iconObj.fileNames[t];
                        if (fname == iext) {
                            f = 0;
                            break;
                        }
                    }
                    if (f == 0) {
                        defaultFileIcon = iconObj.name;
                        break;
                    }
                }
            }
        }
        return `${extPath}/resources/images/icons/${defaultFileIcon}.svg`;
    }
    // 文件夹图标
    static folder_icon(that) {
        let folderName = that.info.type == constant_1.Type.SSH ? that.file.filename : that.file.name;
        Console.debug(`api.ts func folder_icon folderName:${folderName}`);
        const folder_icons = folderIcons[0];
        let defaultFolderIcon = folder_icons.defaultIcon.name;
        if (that.contextValue == constant_1.NodeType.SSH_LINK || that.contextValue == constant_1.NodeType.FTP_LINK) {
            defaultFolderIcon = folder_icons.defaultLinkIcon.name;
        }
        else {
            defaultFolderIcon = folder_icons.defaultIcon.name;
        }
        const extPath = _sm.default.context.extensionPath;
        folderName = folderName.toLocaleLowerCase();
        for (var i in folder_icons.icons) {
            var f = 1;
            const iconObj = folder_icons.icons[i];
            for (var t in iconObj.folderNames) {
                const iext = iconObj.folderNames[t];
                if (folderName == iext) {
                    f = 0;
                    break;
                }
            }
            if (f == 0) {
                defaultFolderIcon = iconObj.name;
                break;
            }
        }
        if (folderName == "root") {
            defaultFolderIcon = folder_icons.rootFolder.name;
        }
        if (folderName == "home") {
            defaultFolderIcon = folder_icons.homeFolder.name;
        }
        return `${extPath}/resources/images/icons/${defaultFolderIcon}.svg`;
    }
    // 自动检查主机是否在线
    static auto_varify_icmp() {
        if (this.verificationPaused) return Promise.resolve();
        if (this.verifyRun) return this.verifyRun;
        const generation = this.verifyGeneration || 0;
        const run = (async () => {
            const targets = [
                ...Object.values(SSHVO.getAll()).map(info => ({ kind: "ssh", info })),
                ...Object.values(FTPVO.getAll()).map(info => ({ kind: "ftp", info })),
            ];
            let cursor = 0;
            const worker = async () => {
                while (cursor < targets.length && generation === (this.verifyGeneration || 0)) {
                    const { kind, info } = targets[cursor++];
                    const config = info[kind];
                    let open;
                    if (kind === "ssh" && config.jump && config.jump.enabled) {
                        const conn = require("../connections/ssh-connection.js").SSHConn;
                        const existing = await conn.verifySSH(info);
                        if (existing.client) open = true;
                        else {
                            try {
                                const { client } = await conn.get(info, false, null, true);
                                client.end(); client.destroy(); open = true;
                            } catch (_) { open = false; }
                        }
                    } else {
                        open = await this.probeTcp(config.host, config.port, 2000);
                    }
                    if (generation !== (this.verifyGeneration || 0)) return;
                    const model = kind === "ssh" ? SSHVO : FTPVO;
                    const latest = model.get(info.id)[kind];
                    if (!latest || JSON.stringify(latest[kind]) !== JSON.stringify(config)) continue;
                    const status = open ? constant_1.SSHType.ONLINE : constant_1.SSHType.OFFLINE;
                    if (latest.status !== status) model.post(Object.assign({}, latest, { status }));
                }
            };
            await Promise.all(Array.from({ length: Math.min(4, targets.length) }, worker));
            const resources = [Storage.get_forwards_server(), Storage.get_rdesktops_server()];
            const hasProcesses = resources.some(items => Object.values(items).some(item => item.pid));
            const processes = hasProcesses ? await GetProcesses() : [];
            if (generation !== (this.verifyGeneration || 0)) return;
            for (const [model, live] of [[ForwardVO, resources[0]], [RemoteVO, resources[1]]]) {
                for (const item of Object.values(model.getAll())) {
                    const running = live[item.id];
                    const status = !!running && (!running.pid || processes.some(process => process.pid === running.pid));
                    if (item.status !== status) model.post(Object.assign({}, item, { status }));
                }
            }
            await require("../storage/base-dt.js").BaseDT.flush();
        })();
        this.verifyRun = run;
        run.finally(() => { if (this.verifyRun === run) this.verifyRun = null; }).catch(() => {});
        return run;
    }
    //重新加载sshtools
    static reload() {
        Console.debug("api.ts func reload begin");
        vscode.window.showQuickPick([(0, Localize)("sshtool.yes"), (0, Localize)("sshtool.no")], { placeHolder: (0, Localize)("sshtool.tools.reload.title"), ignoreFocusOut: false, canPickMany: false }).then((str) => __awaiter(this, void 0, void 0, function* () {
            if (str == (0, Localize)("sshtool.yes")) {
                vscode.commands.executeCommand("workbench.action.reloadWindow");
            }
            Console.debug("api.ts func reload end");
        }));
    }
}
exports.API = API;
