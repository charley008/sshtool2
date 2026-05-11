// Alias for sshapi
// Recovered module id: 19
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

const fs_1 = require("fs");
const { extname } = require("path");
const os = require("os");
const fs = require("../utils/fs-extra-runtime.js");
const path = require("path");
const prettyBytes = require("../utils/pretty-bytes.js");
const vscode = require("vscode");
const { Console } = require("../ui/console.js");
const constant_1 = require("../shared/constants.js");
const { Storage } = require("../storage/storage.js");
const { Util } = require("../utils/util.js");
const { Settings } = require("../utils/settings.js");
const Localize = require("../ui/localize.js").default;
const fileManager_1 = require("../utils/file-manager.js");
// Node classes loaded lazily in build_children() to avoid circular dependency
const { XtermTerminal } = require("../services/xterm-terminal.js");
const { SSHVO } = require("../models/ssh-model.js");
const { SSHConn } = require("../connections/ssh-connection.js");
const { SSHService } = require("../services/ssh-service.js");
const { WorkSpaceInfo } = require("../models/workspace-info.js");
const { WorkSpaceVO } = require("../models/workspace-model.js");
const { WorkSpace } = require("../models/workspace-entity.js");
const { RemoteService } = require("../services/remote-service.js");
const { QuickPickItemVo } = require("../models/quick-pick-item.js");
const { ForwardVO } = require("../models/forward-model.js");
const { RemoteVO } = require("../models/remote-model.js");
const { ForwardService } = require("../services/forward-service.js");
const { API } = require("./core-api.js");
const { ConfigVO } = require("../models/config-model.js");
class SSHAPI {
    //copy ssh 远程连接命令
    static copy_ssh_command(that) {
        let cpstr = '';
        if (constant_1.NodeType.GROUP == that.contextValue) {
            const sshs = SSHAPI.get_sshs();
            Object.keys(sshs).map(key => {
                const sshInfo = sshs[key];
                // 筛选组
                if (that.id == sshInfo.group) {
                    const ssh = sshInfo.ssh;
                    cpstr += `ssh -p ${ssh.port} ${ssh.username}@${ssh.host} \n`;
                }
            });
        }
        else {
            const sshInfo = that.info.ssh;
            const ssh = sshInfo.ssh;
            cpstr = `ssh -p ${ssh.port} ${ssh.username}@${ssh.host}`;
        }
        Util.copyToBoard(cpstr);
    }
    //copy主机信息
    static copy_ssh_info(sshInfo) {
        const title = SSHVO.title(sshInfo);
        const sshvo = SSHVO.get(sshInfo.id);
        const configvo = new ConfigVO(constant_1.Type.SSH);
        configvo.sshvo = sshvo;
        // convert JSON object to string
        let data = JSON.stringify(configvo, null, 0);
        // 加密
        data = Util.genSign(data);
        Util.copyToBoard(`ssh://${sshInfo.name}_${title}#\n${data}`);
    }
    //sshvo导入
    static import_sshvo(sshvo) {
        const sshInfo = sshvo.ssh;
        if (sshInfo && !sshInfo.name && sshInfo.ssh) {
            sshInfo.name = `${sshInfo.ssh.username || 'root'}@${sshInfo.ssh.host || 'unknown'}`;
        }
        if (sshInfo && !sshInfo.group) {
            sshInfo.group = 'default';
        }
        const remotes = sshvo.remotes;
        const forwards = sshvo.forwards;
        const workspaces = sshvo.workspaces;
        if (SSHVO.put(sshInfo)) {
            Console.info((0, Localize)("xplot.msg.conn.add.ok", SSHVO.title(sshInfo)));
            for (let r in remotes) {
                RemoteVO.put(remotes[r]);
            }
            for (let r in forwards) {
                ForwardVO.put(forwards[r]);
            }
            for (let r in workspaces) {
                WorkSpaceVO.put(workspaces[r]);
            }
        }
        else {
            Console.info((0, Localize)("xplot.msg.conn.add.no", SSHVO.title(sshInfo)));
        }
    }
    // 批量导入sshvo  { [key: string]: SSHVO }
    static import_sshvos(sshvos) {
        for (let i in sshvos) {
            const sshvo = sshvos[i];
            SSHAPI.import_sshvo(sshvo);
        }
    }
    //copy file name
    static copy_name(that) {
        Util.copyToBoard(`${that.file.filename}`);
    }
    //copy file path
    static copy_path(that) {
        Util.copyToBoard(`${that.fullPath}`);
    }
    //copy scp command 
    static copy_scp_command(info, fullPath) {
        const ssh = info.ssh;
        Util.copyToBoard(`scp -P${ssh.port} ${ssh.username}@${ssh.host}:${fullPath}`);
    }
    //文件重命名
    static file_rename(that) {
        let filename = "";
        if (that.contextValue == constant_1.NodeType.SSH_FOLDER) {
            filename = that.name;
        }
        else if (that.contextValue == constant_1.NodeType.SSH_FILE) {
            filename = that.file.filename;
        }
        vscode.window.showInputBox({ placeHolder: (0, Localize)("xplot.msg.api.file.rename.title", filename), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            if (input) {
                const rt = yield SSHConn.rename(that.info.ssh, that.fullPath, that.parentName + "/" + input);
                if (rt) {
                    API.refresh();
                    Console.info((0, Localize)("xplot.msg.api.file.rename.ok", filename, input));
                }
            }
            else {
                Console.info((0, Localize)("xplot.msg.api.file.rename.no", filename));
            }
        }));
    }
    //新建文件
    static new_file(that) {
        vscode.window.showInputBox({ placeHolder: (0, Localize)("xplot.msg.api.file.new.title"), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            if (input) {
                const sshInfo = that.info.ssh;
                const ssh = sshInfo.ssh;
                if (sshInfo.id === that.id) {
                    that.fullPath = "";
                }
                const keyDir = `${ssh.username}@${ssh.host}#${ssh.port}`;
                let fullPath = that.fullPath;
                // if (config.info.ostype == OSType.WINDOWS) {
                // 处理windows 盘符特殊字符转换  
                fullPath = Util.replace(that.fullPath);
                // }
                const targetPath = fullPath + "/" + input;
                const targetPath1 = that.fullPath + "/" + input;
                const tempPath = yield fileManager_1.FileManager.record(`temp/${keyDir}` + targetPath, "", fileManager_1.FileModel.WRITE);
                const rt = yield SSHConn.put(sshInfo, tempPath, targetPath1);
                if (rt) {
                    API.refresh();
                    Console.info((0, Localize)("xplot.msg.api.file.new.yes", input));
                }
            }
            else {
                Console.info((0, Localize)("xplot.msg.api.file.new.no"));
            }
        }));
    }
    //删除文件
    static file_delete(that) {
        let filename = "";
        if (that.contextValue == constant_1.NodeType.SSH_FOLDER) {
            filename = that.name;
        }
        else if (that.contextValue == constant_1.NodeType.SSH_FILE) {
            filename = that.file.filename;
        }
        vscode.window.showQuickPick([(0, Localize)("xplot.yes"), (0, Localize)("xplot.no")], { placeHolder: (0, Localize)("xplot.msg.api.file.delete.title", filename), canPickMany: false }).then((str) => __awaiter(this, void 0, void 0, function* () {
            if (str == (0, Localize)("xplot.yes")) {
                if (that.contextValue == constant_1.NodeType.SSH_FOLDER) {
                    const rt = yield SSHConn.rmdir(that.info.ssh, that.fullPath);
                    if (rt) {
                        API.refresh();
                        Console.info((0, Localize)("xplot.msg.api.file.delete.yes", that.fullPath));
                    }
                }
                else if (that.contextValue == constant_1.NodeType.SSH_FILE) {
                    const rt = yield SSHConn.delete(that.info.ssh, that.fullPath);
                    if (rt) {
                        API.refresh();
                        Console.info((0, Localize)("xplot.msg.api.file.delete.yes", that.fullPath));
                    }
                }
                else {
                    Console.warn((0, Localize)("xplot.msg.api.file.delete.err", that.contextValue));
                }
            }
        }));
    }
    //打开文件
    static file_open(that) {
        return __awaiter(this, void 0, void 0, function* () {
            const sshInfo = that.info.ssh;
            const ssh = sshInfo.ssh;
            const extName = path.extname(that.file.filename).toLowerCase();
            for (const ext of Settings.ProhibitFileExt) {
                if (extName == ext) {
                    Console.warn((0, Localize)("xplot.msg.api.file.open.err.fileext", extName));
                    return;
                }
            }
            if (that.file.attrs.size > Settings.OpenFileMaxSize * 1048576) {
                Console.warn((0, Localize)("xplot.msg.api.file.open.err.filemaxsize", that.file.filename, Settings.OpenFileMaxSize + "MB"));
                return;
            }
            const keyDir = `${ssh.username}@${ssh.host}#${ssh.port}`;
            const { sftp } = yield SSHConn.get(sshInfo);
            let fullPath = that.fullPath;
            // if (config.info.ostype == OSType.WINDOWS) {
            // 处理windows 盘符特殊字符转换  
            fullPath = Util.replace(that.fullPath);
            // }
            const tempPath = yield fileManager_1.FileManager.record(`temp/${keyDir}${fullPath}`, null, fileManager_1.FileModel.WRITE);
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: (0, Localize)("xplot.msg.api.file.open.title", that.fullPath),
                cancellable: true
            }, (progress, token) => {
                return new Promise((resolve) => {
                    let mark = setTimeout(() => {
                        resolve(false);
                        mark = null;
                    }, 6000);
                    const begin_time = new Date().getTime();
                    let before = 0;
                    let option = {
                        step: function (total_transferred, chunk, total) {
                            const percentage = Math.floor(total_transferred / total * 100);
                            progress.report({ increment: percentage - before, message: (0, Localize)("xplot.msg.api.file.open.remaining", prettyBytes(total - total_transferred)) });
                            before = percentage;
                        }
                    };
                    sftp.fastGet(that.fullPath, tempPath, option, (err) => __awaiter(this, void 0, void 0, function* () {
                        if (mark) {
                            clearTimeout(mark);
                            const end_time = new Date().getTime();
                            const time = ((end_time - begin_time) / 1000).toFixed(2);
                            if (err) {
                                Console.err(err);
                            }
                            else {
                                Console.info((0, Localize)("xplot.msg.api.file.open.ok", that.fullPath, time));
                                const hash_v = Util.fileHash(path.resolve(tempPath));
                                Storage.set_temp_file_remote(tempPath, { remote: that.fullPath, ssh: sshInfo, hash: hash_v });
                                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(tempPath));
                                resolve(null);
                                return;
                            }
                        }
                    }));
                });
            });
        });
    }
    // 统计过滤目录文件
    static file_verify(sshInfo, path, currpath = null) {
        const fpath = currpath ? `${path}/${currpath}` : path;
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const list = yield SSHConn.list(sshInfo, fpath);
            if (list) {
                let entrys = [];
                for (const entry of list) {
                    if (entry.longname.startsWith("-")) {
                        entry['path'] = path;
                        entry['currpath'] = currpath;
                        entrys.push(entry);
                    }
                    else if (entry.longname.startsWith("d")) {
                        const cpath = currpath ? `${currpath}/${entry.filename}` : entry.filename;
                        const drr = yield SSHAPI.file_verify(sshInfo, path, cpath);
                        entrys = entrys.concat(drr || []);
                    }
                    else {
                        let flag;
                        if (entry.longname.startsWith("l")) {
                            flag = constant_1.NodeType.SSH_LINK;
                        }
                        else if (entry.longname.startsWith("b")) {
                            flag = constant_1.NodeType.SSH_BLOCK;
                        }
                        else if (entry.longname.startsWith("c")) {
                            flag = constant_1.NodeType.SSH_CHARACTER;
                        }
                        else if (entry.longname.startsWith("p")) {
                            flag = constant_1.NodeType.SSH_PIPE;
                        }
                        else if (entry.longname.startsWith("s")) {
                            flag = constant_1.NodeType.SSH_SOCKETS;
                        }
                        const cpath = currpath ? `${currpath}/${entry.filename}` : entry.filename;
                        Console.info((0, Localize)("xplot.msg.api.file.download.filter", flag, cpath));
                    }
                }
                resolve(entrys);
            }
            else {
                resolve([]);
            }
        }));
    }
    //下载文件
    static file_download(that) {
        var _a;
        if (that.contextValue == constant_1.NodeType.SSH_FOLDER || that.contextValue == constant_1.NodeType.SSH_WORKSPACE) {
            vscode.window.showOpenDialog({ canSelectFiles: false, canSelectMany: false, canSelectFolders: true, openLabel: (0, Localize)("xplot.msg.conn.downloadfile") })
                .then((uri) => __awaiter(this, void 0, void 0, function* () {
                if (uri) {
                    const { sftp } = yield SSHConn.get(that.info.ssh);
                    var progressStream = require("../utils/progress-stream.js");
                    let filename = that.contextValue == constant_1.NodeType.SSH_WORKSPACE ? that.workSpace.name : that.file.filename;
                    let dpath;
                    filename = Util.replace(filename);
                    if (os.type() == constant_1.OSTypes.WINDOWS) {
                        dpath = uri[0].path.substr(1) + "/" + filename;
                    }
                    else {
                        dpath = uri[0].path + "/" + filename;
                    }
                    //若是目录存在，创建新目录
                    if (!fs.existsSync(dpath)) {
                        fs.mkdirpSync(dpath);
                    }
                    else {
                        const str = Math.random().toString(36).substr(2).slice(2, 5);
                        dpath += "_" + str;
                        fs.mkdirpSync(dpath);
                    }
                    const entrys = (yield SSHAPI.file_verify(that.info.ssh, that.fullPath)) || [];
                    const entry_list_size = entrys.length;
                    if (entry_list_size == 0) {
                        Console.info((0, Localize)("xplot.msg.api.file.download.null"));
                    }
                    let curr_entry_index = 0;
                    for (const entry of entrys) {
                        curr_entry_index += 1;
                        entry.currpath = entry.currpath ? Util.replace(entry.currpath) : entry.currpath;
                        let rfile = entry.currpath ? that.fullPath + "/" + entry.currpath + "/" + entry.filename : that.fullPath + "/" + entry.filename;
                        let lfile = entry.currpath ? dpath + "/" + entry.currpath + "/" + entry.filename : dpath + "/" + entry.filename;
                        let ldir = entry.currpath ? dpath + "/" + entry.currpath : dpath;
                        let currfile = entry.currpath ? entry.currpath + "/" + entry.filename : entry.filename;
                        if (!fs.existsSync(ldir)) {
                            fs.mkdirpSync(ldir);
                        }
                        yield vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: (0, Localize)("xplot.msg.api.file.download.title", `[${curr_entry_index}/${entry_list_size}] ${that.fullPath} for ${currfile}`),
                            cancellable: true
                        }, (progress, token) => {
                            return new Promise((resolve) => {
                                let mark = setTimeout(() => {
                                    resolve(null);
                                    mark = null;
                                }, 6000);
                                const fileReadStream = sftp.createReadStream(rfile);
                                if (mark) {
                                    clearTimeout(mark);
                                    var str = progressStream({
                                        length: entry.attrs.size,
                                        time: 100
                                    });
                                    let before = 0;
                                    str.on("progress", (progressData) => {
                                        if (progressData.percentage == 100) {
                                            resolve(null);
                                            Console.info((0, Localize)("xplot.msg.api.file.download.ok", `[${curr_entry_index}/${entry_list_size}] ${that.fullPath} for ${currfile} to ${ldir}`, progressData.runtime + 1));
                                            return;
                                        }
                                        progress.report({ increment: progressData.percentage - before, message: (0, Localize)("xplot.msg.api.file.download.remaining", prettyBytes(progressData.remaining)) });
                                        before = progressData.percentage;
                                    });
                                    str.on("error", err => {
                                        Console.err(err);
                                    });
                                    const outStream = (0, fs_1.createWriteStream)(lfile);
                                    fileReadStream.pipe(str).pipe(outStream);
                                    token.onCancellationRequested(() => {
                                        fileReadStream.destroy();
                                        outStream.destroy();
                                    });
                                }
                                // API.refresh();
                            });
                        });
                    }
                }
            }));
        }
        else {
            const extName = (_a = (0, extname)(that.file.filename)) === null || _a === void 0 ? void 0 : _a.replace(".", "");
            vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(that.file.filename), filters: { "Type": [extName] }, saveLabel: (0, Localize)("xplot.msg.conn.downloadfile") })
                .then((uri) => __awaiter(this, void 0, void 0, function* () {
                if (uri) {
                    const { sftp } = yield SSHConn.get(that.info.ssh);
                    var progressStream = require("../utils/progress-stream.js");
                    vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: (0, Localize)("xplot.msg.api.file.download.title", that.fullPath),
                        cancellable: true
                    }, (progress, token) => {
                        return new Promise((resolve) => {
                            let mark = setTimeout(() => {
                                resolve(null);
                                mark = null;
                            }, 6000);
                            const fileReadStream = sftp.createReadStream(that.fullPath);
                            if (mark) {
                                clearTimeout(mark);
                                var str = progressStream({
                                    length: that.file.attrs.size,
                                    time: 100
                                });
                                let before = 0;
                                str.on("progress", (progressData) => {
                                    if (progressData.percentage == 100) {
                                        resolve(null);
                                        Console.info((0, Localize)("xplot.msg.api.file.download.ok", that.fullPath, progressData.runtime + 1));
                                        return;
                                    }
                                    progress.report({ increment: progressData.percentage - before, message: (0, Localize)("xplot.msg.api.file.download.remaining", prettyBytes(progressData.remaining)) });
                                    before = progressData.percentage;
                                });
                                str.on("error", err => {
                                    Console.err(err);
                                });
                                const outStream = (0, fs_1.createWriteStream)(uri.fsPath);
                                fileReadStream.pipe(str).pipe(outStream);
                                token.onCancellationRequested(() => {
                                    fileReadStream.destroy();
                                    outStream.destroy();
                                });
                            }
                            // API.refresh();
                        });
                    });
                }
            }));
        }
    }
    // 新建目录
    static new_folder(that) {
        vscode.window.showInputBox({ placeHolder: (0, Localize)("xplot.msg.api.folder.new.title"), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            if (input) {
                const sshInfo = that.info.ssh;
                const ssh = sshInfo.ssh;
                if (sshInfo.id === that.id) {
                    that.fullPath = "";
                }
                const rt = yield SSHConn.mkdir(sshInfo, that.fullPath + "/" + input);
                if (rt) {
                    API.refresh();
                    Console.info((0, Localize)("xplot.msg.api.folder.new.yes", input));
                }
            }
            else {
                Console.info((0, Localize)("xplot.msg.api.folder.new.no"));
            }
        }));
    }
    // 上传文件
    static file_upload(that) {
        vscode.window.showOpenDialog({ canSelectFiles: true, canSelectMany: true, canSelectFolders: false, openLabel: (0, Localize)("xplot.msg.conn.uploadfile") })
            .then((uri) => __awaiter(this, void 0, void 0, function* () {
            if (uri) {
                const { sftp } = yield SSHConn.get(that.info.ssh);
                var progressStream = require("../utils/progress-stream.js");
                const url_size = uri.length;
                let curr_url_index = 0;
                for (const item of uri) {
                    curr_url_index += 1;
                    const targetPath = item.fsPath;
                    yield vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: (0, Localize)("xplot.msg.api.file.upload.title", `[${curr_url_index}/${url_size}] ${targetPath}`),
                        cancellable: true
                    }, (progress, token) => {
                        return new Promise((resolve) => {
                            let mark = setTimeout(() => {
                                resolve(null);
                                mark = null;
                            }, 6000);
                            const fileReadStream = (0, fs_1.createReadStream)(targetPath);
                            if (mark) {
                                clearTimeout(mark);
                                var str = progressStream({
                                    length: (0, fs_1.statSync)(targetPath).size,
                                    time: 100
                                });
                                let before = 0;
                                str.on("progress", (progressData) => {
                                    if (progressData.percentage == 100) {
                                        resolve(null);
                                        Console.info((0, Localize)("xplot.msg.api.file.upload.ok", `[${curr_url_index}/${url_size}] ${targetPath}`, progressData.runtime + 1));
                                        return;
                                    }
                                    progress.report({ increment: progressData.percentage - before, message: (0, Localize)("xplot.msg.api.file.upload.remaining", prettyBytes(progressData.remaining)) });
                                    before = progressData.percentage;
                                });
                                str.on("error", err => {
                                    Console.err(err);
                                });
                                const outStream = sftp.createWriteStream(that.fullPath + "/" + path.basename(targetPath));
                                fileReadStream.pipe(str).pipe(outStream);
                                token.onCancellationRequested(() => {
                                    fileReadStream.destroy();
                                    outStream.destroy();
                                });
                                API.refresh();
                            }
                        });
                    });
                }
            }
        }));
    }
    static start_socks5_proxy(sshInfo) {
        const vo = SSHVO.get(sshInfo.id);
        const forwards = vo.forwards;
        let forwardArr = [];
        for (let i in forwards) {
            const forward = forwards[i];
            let qvo = new QuickPickItemVo();
            if (forward.mark) {
                qvo.label = forward.name;
                let desc = null;
                if (forward.forward.type == 0) {
                    desc = (0, Localize)("xplot.view.forward.type.local.port.forward.title");
                    desc = `[${desc}]   [${forward.forward.localHost}:${forward.forward.localPort}] -> [${forward.forward.remoteHost}:${forward.forward.remotePort}]`;
                }
                else if (forward.forward.type == 1) {
                    desc = (0, Localize)("xplot.view.forward.type.remote.port.forward.title");
                    desc = `[${desc}]   [${forward.forward.localHost}:${forward.forward.localPort}] <- [${forward.forward.remoteHost}:${forward.forward.remotePort}]`;
                }
                else if (forward.forward.type == 2) {
                    desc = (0, Localize)("xplot.view.forward.type.socks5proxy.title");
                    desc = `[${desc}]   [${forward.forward.localHost}:${forward.forward.localPort}]`;
                }
                if (desc) {
                    qvo.description = desc;
                    qvo.forward = forward;
                    forwardArr.push(qvo);
                }
            }
        }
        if (forwardArr.length == 0) {
            Console.info((0, Localize)("xplot.msg.show.forward.list.null.title"));
            return;
        }
        if (forwardArr.length == 1) {
            new ForwardService().start(forwardArr[0].forward.id);
            return;
        }
        vscode.window.showQuickPick(forwardArr, { placeHolder: (0, Localize)("xplot.msg.show.forward.list.title") }).then(vo => {
            if (vo) {
                new ForwardService().start(vo.forward.id);
            }
        });
    }
    // 打开远程桌面
    static open_rdesktop(sshInfo) {
        try {
            const vo = SSHVO.get(sshInfo.id);
            const remotes = vo.remotes;
            let remoteArr = [];
            for (let i in remotes) {
                const remote = remotes[i];
                let qvo = new QuickPickItemVo();
                if (remote.mark) {
                    qvo.label = remote.name;
                    qvo.description = `[${remote.mode == 0 ? 'RDP' : 'Unknown'}][${remote.rdp.desktopGeometry}]`;
                    qvo.remote = remote;
                    remoteArr.push(qvo);
                }
            }
            if (remoteArr.length == 0) {
                Console.info((0, Localize)("xplot.msg.show.remote.list.null.title"));
                return;
            }
            if (remoteArr.length == 1) {
                new RemoteService().start(remoteArr[0].remote.id);
                return;
            }
            vscode.window.showQuickPick(remoteArr, { placeHolder: (0, Localize)("xplot.msg.show.remote.list.title") }).then(vo => {
                if (vo) {
                    new RemoteService().start(vo.remote.id);
                }
            });
        }
        catch (e) {
            Console.warn((0, Localize)("xplot.msg.connect.rdesktop.active.no", SSHVO.title(sshInfo)));
        }
    }
    // 打开命令行窗口
    static open_terminal(sshInfo) {
        let terminalService = new XtermTerminal();
        terminalService.openMethod(sshInfo);
    }
    // 打开所选目录命令行窗口
    static open_in_teriminal(sshInfo, fullPath) {
        let terminalService = new XtermTerminal();
        terminalService.openPath(sshInfo, fullPath);
    }
    //根据文件类型，细化处理
    static build_children(that, entryList, parentName) {
        const { BlockNode } = require("../nodes/ssh-block-node.js");
        const { CharacterNode } = require("../nodes/ssh-character-node.js");
        const { FileNode } = require("../nodes/ssh-file-node.js");
        const { FolderNode } = require("../nodes/ssh-folder-node.js");
        const { LinkNode } = require("../nodes/ssh-link-node.js");
        const { PipeNode } = require("../nodes/ssh-pipe-node.js");
        const { SocketskNode } = require("../nodes/ssh-socket-node.js");
        const folderList = [];
        const linkList = [];
        const fileList = [];
        const blockList = [];
        const characterList = [];
        const pipeList = [];
        const socketsList = [];
        for (const entry of entryList) {
            if (Settings.ShowHiddenFilesAndFolders == false && entry.filename.indexOf(".") == 0) {
                continue;
            }
            if (entry.longname.startsWith("d")) {
                // 盘符正则
                const reg = /^\/([A-Z]):\/$/;
                const flag = reg.test(parentName);
                if (Settings.ShowHiddenFilesAndFolders == false && constant_1.OSTypes.WINDOWS == os.type() && flag &&
                    (entry.filename == "$Recycle.Bin" ||
                        entry.filename == "$RECYCLE.BIN" ||
                        entry.filename == "System Volume Information" ||
                        entry.filename == "Documents and Settings")) {
                    continue;
                }
                folderList.push(new FolderNode(that.info, that.viewType, entry.filename, entry, parentName));
            }
            else if (entry.longname.startsWith("l")) {
                if (entry.filename.indexOf(".") != -1) {
                    fileList.push(new FileNode(that.info, that.viewType, entry, parentName));
                }
                else {
                    linkList.push(new LinkNode(that.info, that.viewType, entry.filename, entry, parentName));
                }
            }
            else if (entry.longname.startsWith("b")) {
                blockList.push(new BlockNode(that.info, entry, parentName));
            }
            else if (entry.longname.startsWith("c")) {
                characterList.push(new CharacterNode(that.info, entry, parentName));
            }
            else if (entry.longname.startsWith("p")) {
                pipeList.push(new PipeNode(that.info, entry, parentName));
            }
            else if (entry.longname.startsWith("s")) {
                socketsList.push(new SocketskNode(that.info, entry, parentName));
            }
            else {
                fileList.push(new FileNode(that.info, that.viewType, entry, parentName));
            }
        }
        const fileArr = [].concat(fileList)
            .concat(blockList)
            .concat(socketsList)
            .concat(characterList)
            .concat(pipeList)
            .sort((a, b) => a.file.filename.localeCompare(b.file.filename));
        const folderArr = [].concat(folderList)
            .concat(linkList)
            .sort((a, b) => a.name.localeCompare(b.name));
        return [].concat(folderArr).concat(fileArr);
    }
    // 保存文件
    static file_save(tempPath, tempFile) {
        return __awaiter(this, void 0, void 0, function* () {
            const remotePath = tempFile.remote;
            const tssh = tempFile.ssh;
            const tfHash = tempFile.hash;
            const currtfHash = Util.fileHash(tempPath);
            const sshs = SSHAPI.get_sshs();
            const id = tssh.id;
            if (sshs[id].status == constant_1.SSHType.ONLINE) {
            }
            else {
                Console.warn((0, Localize)("xplot.msg.api.file.save.err", remotePath, id));
                return;
            }
            // console.log(tfHash,currtfHash) 
            if (currtfHash == tfHash) {
                Console.info((0, Localize)("xplot.msg.api.file.save.ok", remotePath, 0.01));
                Storage.touch_temp_file_remote(tempPath, { remote: remotePath, ssh: tssh, hash: currtfHash });
                return;
            }
            const { sftp } = yield SSHConn.get(tssh);
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: (0, Localize)("xplot.msg.api.file.save.title", remotePath),
                cancellable: true
            }, (progress, token) => {
                return new Promise((resolve) => {
                    let mark = setTimeout(() => {
                        resolve(null);
                        mark = null;
                    }, 6000);
                    const begin_time = new Date().getTime();
                    let before = 0;
                    let option = {
                        step: function (total_transferred, chunk, total) {
                            const percentage = Math.floor(total_transferred / total * 100);
                            progress.report({ increment: percentage - before, message: (0, Localize)("xplot.msg.api.file.save.remaining", prettyBytes(total - total_transferred)) });
                            before = percentage;
                        }
                    };
                    sftp.fastPut(tempPath, remotePath, option, (err) => __awaiter(this, void 0, void 0, function* () {
                        if (mark) {
                            clearTimeout(mark);
                            const end_time = new Date().getTime();
                            const time = ((end_time - begin_time) / 1000).toFixed(2);
                            if (err) {
                                Console.err(err);
                            }
                            else {
                                Console.info((0, Localize)("xplot.msg.api.file.save.ok", remotePath, time));
                                Storage.touch_temp_file_remote(tempPath, { remote: remotePath, ssh: tssh, hash: currtfHash });
                                API.refresh();
                                resolve(null);
                                return;
                            }
                        }
                    }));
                });
            });
        });
    }
    // 添加修改连接，处理connect view页面事件
    static ssh_save(sshInfo, flag = "add") {
        new SSHService().createSSHView(sshInfo, flag);
    }
    // 删除某个配置信息
    static ssh_delete(info) {
        SSHVO.del(info.ssh.id);
        Console.info((0, Localize)("xplot.msg.conn.delete.ok", SSHVO.title(info.ssh)));
        API.refresh();
    }
    // 断开某个主机的连接
    static ssh_unlink(infovo) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client } = yield SSHConn.verifySSH(infovo.ssh);
            const title = SSHVO.title(infovo.ssh);
            const sshvo = SSHVO.get(infovo.ssh.id);
            let state = false;
            // 关闭远程桌面
            const remotes = sshvo.remotes;
            if (Object.keys(remotes).length > 0) {
                for (let ri in remotes) {
                    const remote = remotes[ri];
                    if (remote.status) {
                        new RemoteService().stop(remote.id);
                        state = true;
                    }
                }
            }
            if (client) {
                yield SSHConn.closeSSH(infovo.ssh);
                state = true;
                Console.info((0, Localize)("xplot.msg.conn.unlink.ok", title));
            }
            if (!state) {
                Console.info((0, Localize)("xplot.msg.conn.unlink.no", title));
            }
        });
    }
    // 添加工作区
    static workspace_add(infovo, name, dir) {
        if (WorkSpaceVO.put(new WorkSpaceInfo(infovo.ssh.id, name, new WorkSpace(dir), "desc"))) {
            Console.info((0, Localize)("xplot.msg.api.workspace.add.ok", dir, name));
            API.refresh();
        }
        else {
            Console.info((0, Localize)("xplot.msg.api.workspace.add.no", name));
        }
    }
    // 删除工作区
    static workspace_del(ws) {
        if (WorkSpaceVO.del(ws.id)) {
            Console.info((0, Localize)("xplot.msg.api.workspace.delete.ok", WorkSpaceVO.title(ws)));
            API.refresh();
        }
    }
    // 修改工作区
    static workspace_modify(ws, new_name) {
        const wsvo = WorkSpaceVO.get(ws.id);
        wsvo.workspace.name = new_name;
        if (WorkSpaceVO.post(wsvo.workspace)) {
            Console.info((0, Localize)("xplot.msg.api.workspace.modify.ok", ws.name, new_name));
            API.refresh();
        }
        else {
            Console.info((0, Localize)("xplot.msg.api.workspace.modify.no", ws.name));
        }
    }
    // 更新配置信息,更新后刷新视图
    static get_sshs() {
        const sshs = SSHVO.getAll();
        return sshs;
    }
    // 获取所有在线主机
    static get_online_sshs() {
        const sshs = SSHVO.getAll();
        const ret = {};
        for (let i in sshs) {
            if (sshs[i].status == constant_1.SSHType.ONLINE) {
                ret[i] = sshs[i];
            }
        }
        return ret;
    }
    // 获取所有离线主机
    static get_offline_sshs() {
        const sshs = SSHVO.getAll();
        const ret = {};
        for (let i in sshs) {
            if (sshs[i].status == constant_1.SSHType.OFFLINE) {
                ret[i] = sshs[i];
            }
        }
        return ret;
    }
}
exports.SSHAPI = SSHAPI;
