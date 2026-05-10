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
const fs = require("../utils/graceful-fs-runtime.js");
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
const { SSHAPI } = require("./ssh-api.js");
const { FTPAPI } = require("./ftp-api.js");
const { GroupAPI } = require("./group-api.js");
const { ConfigAPI } = require("./config-api.js");
class API {
    //init自动刷新
    static auto() {
        Console.debug("api.ts func auto begin");
        this.init_update_configs_version();
        this.auto_verify();
        this.autoVerifyStatusBars();
        this.autoOnlineRefresh();
        this.autoOfflineRefresh();
        this.autoManagerRefresh();
        this.autoWorkspaceOnlineRefresh();
        this.autoWorkspaceOfflineRefresh();
        this.autoVerifyTempFileRemotes();
        this.init_keys();
        Console.debug("api.ts func auto end");
    }
    //刷新所有视图
    static refresh() {
        Console.debug("api.ts func refresh begin");
        API.init_status_bar();
        vscode.commands.executeCommand(constant_1.Command.ONLINE_REFRESH);
        vscode.commands.executeCommand(constant_1.Command.OFFLINE_REFRESH);
        vscode.commands.executeCommand(constant_1.Command.MANAGER_REFRESH);
        vscode.commands.executeCommand(constant_1.Command.WORKSPACE_ONLINE_REFRESH);
        vscode.commands.executeCommand(constant_1.Command.WORKSPACE_OFFLINE_REFRESH);
        Console.debug("api.ts func refresh end");
    }
    // status keys初始化 (ConsoleOututSwitch)
    static init_keys() {
        Console.debug("api.ts func init_keys begin");
        const keys = Storage.get_status_keys();
        if (!keys[constant_1.ConsoleOututSwitch.KEY]) {
            keys[constant_1.ConsoleOututSwitch.KEY] = constant_1.ConsoleOututSwitch.OFF;
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
        vscode.commands.executeCommand('setContext', 'xplot.console.switch', keys[constant_1.ConsoleOututSwitch.KEY]);
        vscode.commands.executeCommand('setContext', 'xplot.debug', keys[constant_1.DebugSwitch.KEY]);
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
        if (flag == constant_1.ConsoleOututSwitch.KEY) {
            // 输出
            if (keys[constant_1.ConsoleOututSwitch.KEY] == constant_1.ConsoleOututSwitch.ON) {
                vscode.commands.executeCommand('setContext', 'xplot.console.switch', constant_1.ConsoleOututSwitch.OFF);
                keys[constant_1.ConsoleOututSwitch.KEY] = constant_1.ConsoleOututSwitch.OFF;
                Console.info((0, Localize)("xplot.console.switch.off.title"));
            }
            else if (keys[constant_1.ConsoleOututSwitch.KEY] == constant_1.ConsoleOututSwitch.OFF) {
                vscode.commands.executeCommand('setContext', 'xplot.console.switch', constant_1.ConsoleOututSwitch.ON);
                keys[constant_1.ConsoleOututSwitch.KEY] = constant_1.ConsoleOututSwitch.ON;
                Console.info((0, Localize)("xplot.console.switch.on.title"));
            }
            else {
                keys[constant_1.ConsoleOututSwitch.KEY] = constant_1.ConsoleOututSwitch.ON;
            }
        }
        if (flag == constant_1.DebugSwitch.KEY) {
            // 调试
            if (keys[constant_1.DebugSwitch.KEY] == constant_1.DebugSwitch.ON) {
                vscode.commands.executeCommand('setContext', 'xplot.debug', constant_1.DebugSwitch.OFF);
                keys[constant_1.DebugSwitch.KEY] = constant_1.DebugSwitch.OFF;
                Console.info((0, Localize)("xplot.debug.off.title"));
            }
            else if (keys[constant_1.DebugSwitch.KEY] == constant_1.DebugSwitch.OFF) {
                vscode.commands.executeCommand('setContext', 'xplot.debug', constant_1.DebugSwitch.ON);
                keys[constant_1.DebugSwitch.KEY] = constant_1.DebugSwitch.ON;
                Console.info((0, Localize)("xplot.debug.on.title"));
            }
            else {
                keys[constant_1.DebugSwitch.KEY] = constant_1.DebugSwitch.ON;
            }
        }
        Storage.update_status_keys(keys);
        Console.debug("api.ts func console_output_switch end");
    }
    //自动检查本地缓存文件是否过期
    static autoVerifyTempFileRemotes() {
        return __awaiter(this, void 0, void 0, function* () {
            Console.debug("api.ts func autoVerifyTempFileRemotes begin");
            const tempFileRemotes = Storage.get_temp_file_remotes();
            const timestamp = new Date().getTime();
            const oneDayLong = 24 * 3600 * 1000; //定义3天毫秒
            for (let i in tempFileRemotes) { //连接时间大于三天将删除
                let state = false;
                if (timestamp - tempFileRemotes[i]['timeStamp'] < oneDayLong) {
                    state = true;
                }
                if (!state) {
                    delete tempFileRemotes[i];
                    Storage.update_temp_file_remotes(tempFileRemotes);
                }
            }
            Console.debug("api.ts func autoVerifyTempFileRemotes end");
        });
    }
    //升级老版本配置文件到最新v1
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
    static init_update_configs_version() {
        Console.debug("api.ts func init_update_configs_version begin");
        const configs = Storage.get_conections_config();
        if (Object.keys(configs).length > 0) {
            const configvos = Util.configs_old_2_new(configs);
            ConfigAPI.import_configvos(configvos);
            Storage.delete_configs();
        }
        Console.debug("api.ts func init_update_configs_version end");
    }
    //自动检查主机主机、forward、rdesktop状态
    static auto_verify() {
        return __awaiter(this, void 0, void 0, function* () {
            _sm.default._intervals.push(setInterval(function () {
                API.auto_varify_icmp();
            }, Settings.PingHostTime * 1000));
        });
    }
    //自动刷新 ssh 在线视图
    static autoOnlineRefresh() {
        return __awaiter(this, void 0, void 0, function* () {
            _sm.default._intervals.push(setInterval(function () {
                vscode.commands.executeCommand(constant_1.Command.ONLINE_REFRESH);
            }, Settings.RefreshNodeTime * 1000));
        });
    }
    //自动刷新 ssh 离线视图
    static autoOfflineRefresh() {
        return __awaiter(this, void 0, void 0, function* () {
            _sm.default._intervals.push(setInterval(function () {
                vscode.commands.executeCommand(constant_1.Command.OFFLINE_REFRESH);
            }, Settings.RefreshNodeTime * 1000));
        });
    }
    //自动刷新 ssh 管理视图
    static autoManagerRefresh() {
        return __awaiter(this, void 0, void 0, function* () {
            _sm.default._intervals.push(setInterval(function () {
                vscode.commands.executeCommand(constant_1.Command.MANAGER_REFRESH);
            }, Settings.RefreshNodeTime * 1000));
        });
    }
    //自动刷新 workspace 在线视图
    static autoWorkspaceOnlineRefresh() {
        return __awaiter(this, void 0, void 0, function* () {
            _sm.default._intervals.push(setInterval(function () {
                vscode.commands.executeCommand(constant_1.Command.WORKSPACE_ONLINE_REFRESH);
            }, Settings.RefreshNodeTime * 1000));
        });
    }
    //自动刷新 workspace 离线视图
    static autoWorkspaceOfflineRefresh() {
        return __awaiter(this, void 0, void 0, function* () {
            _sm.default._intervals.push(setInterval(function () {
                vscode.commands.executeCommand(constant_1.Command.WORKSPACE_OFFLINE_REFRESH);
            }, Settings.RefreshNodeTime * 1000));
        });
    }
    static autoVerifyStatusBars() {
        return __awaiter(this, void 0, void 0, function* () {
            _sm.default._intervals.push(setInterval(function () {
                API.init_status_bar();
            }, Settings.RefreshNodeTime * 1000));
        });
    }
    // 添加信息 主机  或  ftp
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
        vscode.window.showQuickPick(typeArr, { placeHolder: (0, Localize)("xplot.conn.add.title") }).then(vo => {
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
        return __awaiter(this, void 0, void 0, function* () {
            const Evilscan = require("../utils/evilscan.js");
            const sshs = require("./ssh-api.js").SSHAPI.get_sshs();
            const ftps = require("./ftp-api.js").FTPAPI.get_ftps();
            const forwards_server = Storage.get_forwards_server();
            const rdesktops_server = Storage.get_rdesktops_server();
            for (let i in sshs) {
                // ping.sys.probe(ssh[i].host, function(isAlive){ 
                //     if(isAlive){
                //         ssh[i].info.status = SSHType.ONLINE; 
                //     }else{   
                //         ssh[i].info.status = SSHType.OFFLINE;
                //     } 
                // })
                const ssh = sshs[i];
                const sshvo = SSHVO.get(ssh.id);
                // 检测主机是否在线 
                const options = {
                    target: ssh.ssh.host,
                    port: ssh.ssh.port,
                    status: 'TROU',
                    banner: false
                };
                new Evilscan(options, function (err, scan) {
                    return __awaiter(this, void 0, void 0, function* () {
                        scan.on('result', data => {
                            if (data.status === "open") {
                                ssh.status = constant_1.SSHType.ONLINE;
                            }
                            else {
                                ssh.status = constant_1.SSHType.OFFLINE;
                            }
                        });
                        scan.on('error', err => {
                            ssh.status = constant_1.SSHType.OFFLINE;
                        });
                        scan.run();
                        SSHVO.post(ssh);
                    });
                });
                // 检测forward运行状态
                const forwards = sshvo.forwards;
                if (Object.keys(forwards).length > 0) {
                    for (let f in forwards) {
                        const forward = forwards[f];
                        if (forwards_server[forward.id]) {
                            if (forwards_server[forward.id].pid) {
                                //检查进程是否存在
                                const processes = yield (0, GetProcesses)();
                                const p = processes.find(v => v.pid === forwards_server[forward.id].pid);
                                p ? forward.status = true : forward.status = false;
                            }
                            else {
                                forward.status = true;
                            }
                        }
                        else {
                            forward.status = false;
                        }
                        ForwardVO.post(forward);
                    }
                }
                // 检测rdesktop运行状态
                const remotes = sshvo.remotes;
                if (Object.keys(remotes).length > 0) {
                    for (let ri in remotes) {
                        const remote = remotes[ri];
                        if (rdesktops_server[ri]) {
                            if (rdesktops_server[ri].pid) {
                                //检查进程是否存在
                                const processes = yield (0, GetProcesses)();
                                const p = processes.find(v => v.pid === rdesktops_server[ri].pid);
                                p ? remote.status = true : remote.status = false;
                            }
                            else {
                                remote.status = true;
                            }
                        }
                        else {
                            remote.status = false;
                        }
                        RemoteVO.post(remote);
                    }
                }
            }
            for (let i in ftps) {
                const ftp = ftps[i];
                const ftpvo = FTPVO.get(ftp.id);
                // 检测主机是否在线 
                const options = {
                    target: ftp.ftp.host,
                    port: ftp.ftp.port,
                    status: 'TROU',
                    banner: false
                };
                new Evilscan(options, function (err, scan) {
                    return __awaiter(this, void 0, void 0, function* () {
                        scan.on('result', data => {
                            if (data.status === "open") {
                                ftp.status = constant_1.SSHType.ONLINE;
                            }
                            else {
                                ftp.status = constant_1.SSHType.OFFLINE;
                            }
                        });
                        scan.on('error', err => {
                            ftp.status = constant_1.SSHType.OFFLINE;
                        });
                        scan.run();
                        FTPVO.post(ftp);
                    });
                });
            }
        });
    }
    //重新加载sshtools
    static reload() {
        Console.debug("api.ts func reload begin");
        vscode.window.showQuickPick([(0, Localize)("xplot.yes"), (0, Localize)("xplot.no")], { placeHolder: (0, Localize)("xplot.tools.reload.title"), ignoreFocusOut: false, canPickMany: false }).then((str) => __awaiter(this, void 0, void 0, function* () {
            if (str == (0, Localize)("xplot.yes")) {
                vscode.commands.executeCommand("workbench.action.reloadWindow");
            }
            Console.debug("api.ts func reload end");
        }));
    }
}
exports.API = API;
