// Alias for ftpapi
// Recovered module id: 23
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

const { createWriteStream } = require("fs");
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
const { WorkSpaceInfo } = require("../models/workspace-info.js");
const { WorkSpaceVO } = require("../models/workspace-model.js");
const { WorkSpace } = require("../models/workspace-entity.js");
const { FTPService } = require("../services/ftp-service.js");
const { FTPVO } = require("../models/ftp-model.js");
// Node classes loaded lazily in build_children() to avoid circular dependency
const { FTPConn } = require("../connections/ftp-connection.js");
const _core = require("./core-api.js");
const { ConfigVO } = require("../models/config-model.js");
// FTP node classes also loaded lazily in build_children()
class FTPAPI {
    //copy主机信息
    static copy_ftp_info(ftpInfo) {
        const title = FTPVO.title(ftpInfo);
        const ftpvo = FTPVO.get(ftpInfo.id);
        const configvo = new ConfigVO(constant_1.Type.FTP);
        configvo.ftpvo = ftpvo;
        // convert JSON object to string
        let data = JSON.stringify(configvo, null, 0);
        // 加密
        data = Util.genSign(data);
        Util.copyToBoard(`ftp://${ftpInfo.name}_${title}#\n${data}`);
    }
    //ftpvo导入
    static import_ftpvo(ftpvo) {
        const ftpInfo = ftpvo.ftp;
        const workspaces = ftpvo.workspaces;
        if (FTPVO.put(ftpInfo)) {
            Console.info((0, Localize)("xplot.msg.conn.add.ok", FTPVO.title(ftpInfo)));
            for (let r in workspaces) {
                WorkSpaceVO.put(workspaces[r]);
            }
        }
        else {
            Console.info((0, Localize)("xplot.msg.conn.add.no", FTPVO.title(ftpInfo)));
        }
    }
    // 批量导入ftpvo  { [key: string]: FTPVO }
    static import_ftpvos(ftpvos) {
        for (let i in ftpvos) {
            const ftpvo = ftpvos[i];
            FTPAPI.import_ftpvo(ftpvo);
        }
    }
    //copy file name
    static copy_name(that) {
        Util.copyToBoard(`${that.file.name}`);
    }
    //copy file path
    static copy_path(that) {
        Util.copyToBoard(`${that.fullPath}`);
    }
    //文件重命名
    static file_rename(that) {
        let filename = that.file.name;
        vscode.window.showInputBox({ placeHolder: (0, Localize)("xplot.msg.api.file.rename.title", filename), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            if (input) {
                const old_name = that.fullPath;
                const new_name = that.parentName + "/" + input;
                const flag = yield FTPConn.rename(that.info.ftp, old_name, new_name);
                if (flag) {
                    _core.API.refresh();
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
                const infovo = that.info;
                const ftpInfo = infovo.ftp;
                if (ftpInfo.id === that.id) {
                    that.fullPath = "";
                }
                const keyDir = `${ftpInfo.ftp.user}@${ftpInfo.ftp.host}#${ftpInfo.ftp.port}`;
                let fullPath = that.fullPath;
                // if (config.info.ostype == OSType.WINDOWS) {
                // 处理windows 盘符特殊字符转换  
                fullPath = Util.replace(that.fullPath);
                // }
                const targetPath = fullPath + "/" + input;
                const targetPath1 = that.fullPath + "/" + input;
                const tempPath = yield fileManager_1.FileManager.record(`temp/${keyDir}` + targetPath, "", fileManager_1.FileModel.WRITE);
                const rt = yield FTPConn.put(ftpInfo, tempPath, targetPath1);
                if (rt) {
                    _core.API.refresh();
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
        let filename = that.file.name;
        vscode.window.showQuickPick([(0, Localize)("xplot.yes"), (0, Localize)("xplot.no")], { placeHolder: (0, Localize)("xplot.msg.api.file.delete.title", filename), canPickMany: false }).then((str) => __awaiter(this, void 0, void 0, function* () {
            if (str == (0, Localize)("xplot.yes")) {
                if (that.contextValue == constant_1.NodeType.FTP_FOLDER) {
                    const rt = yield FTPConn.rmdir(that.info.ftp, that.fullPath);
                    if (rt) {
                        _core.API.refresh();
                        Console.info((0, Localize)("xplot.msg.api.file.delete.yes", that.fullPath));
                    }
                }
                else if (that.contextValue == constant_1.NodeType.FTP_FILE) {
                    const rt = yield FTPConn.delete(that.info.ftp, that.fullPath);
                    if (rt) {
                        _core.API.refresh();
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
            var progressStream = require("../utils/progress-stream.js");
            const infovo = that.info;
            const ftpInfo = infovo.ftp;
            const extName = path.extname(that.file.name).toLowerCase();
            for (const ext of Settings.ProhibitFileExt) {
                if (extName == ext) {
                    Console.warn((0, Localize)("xplot.msg.api.file.open.err.fileext", extName));
                    return;
                }
            }
            if (that.file.size > Settings.OpenFileMaxSize * 1048576) {
                Console.warn((0, Localize)("xplot.msg.api.file.open.err.filemaxsize", that.file.name, Settings.OpenFileMaxSize + "MB"));
                return;
            }
            const keyDir = `${ftpInfo.ftp.user}@${ftpInfo.ftp.host}#${ftpInfo.ftp.port}`;
            const { client } = yield FTPConn.get(ftpInfo);
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
                    client.get(that.fullPath, (err, fileReadStream) => __awaiter(this, void 0, void 0, function* () {
                        if (mark) {
                            clearTimeout(mark);
                            const end_time = new Date().getTime();
                            const time = ((end_time - begin_time) / 1000).toFixed(2);
                            if (err) {
                                Console.err(err);
                            }
                            else {
                                var str = progressStream({
                                    length: that.file.size,
                                    time: 100
                                });
                                const outStream = (0, createWriteStream)(tempPath);
                                fileReadStream.pipe(str).pipe(outStream);
                                token.onCancellationRequested(() => {
                                    fileReadStream.destroy();
                                    outStream.destroy();
                                });
                                outStream.on("finish", () => {
                                    Console.info((0, Localize)("xplot.msg.api.file.open.ok", that.fullPath, time));
                                    const hash_v = Util.fileHash(path.resolve(tempPath));
                                    Storage.set_temp_file_remote(tempPath, { remote: that.fullPath, ftp: ftpInfo, hash: hash_v });
                                    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(tempPath));
                                    resolve(null);
                                });
                                outStream.on("error", err => {
                                    Console.err(err);
                                    resolve(null);
                                });
                                return;
                            }
                        }
                    }));
                });
            });
        });
    }
    // 统计过滤目录文件
    static file_verify(ftpInfo, path, currpath = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const fpath = currpath ? `${path}/${currpath}` : path;
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const entryList = yield FTPConn.list(ftpInfo, fpath);
                if (entryList) {
                    let entrys = [];
                    for (const entry of entryList) {
                        if (entry.type.startsWith("-")) {
                            entry['path'] = path;
                            entry['currpath'] = currpath;
                            entrys.push(entry);
                        }
                        else if (entry.type.startsWith("d")) {
                            const cpath = currpath ? `${currpath}/${entry.name}` : entry.name;
                            const drr = yield FTPAPI.file_verify(ftpInfo, path, cpath);
                            entrys = entrys.concat(drr || []);
                        }
                        else {
                            let flag;
                            if (entry.type == "l") {
                                flag = constant_1.NodeType.FTP_LINK;
                            }
                            else if (entry.type == "b") {
                                flag = constant_1.NodeType.FTP_BLOCK;
                            }
                            else if (entry.type == "c") {
                                flag = constant_1.NodeType.FTP_CHARACTER;
                            }
                            else if (entry.type == "p") {
                                flag = constant_1.NodeType.FTP_PIPE;
                            }
                            else if (entry.type == "s") {
                                flag = constant_1.NodeType.FTP_SOCKETS;
                            }
                            else {
                                flag = "Unknown";
                            }
                            const cpath = currpath ? `${currpath}/${entry.name}` : entry.name;
                            Console.info((0, Localize)("xplot.msg.api.file.download.filter", flag, cpath));
                        }
                    }
                    resolve(entrys);
                }
                else {
                    resolve([]);
                }
            }));
        });
    }
    //下载文件
    static file_download(that) {
        var _a;
        if (that.contextValue == constant_1.NodeType.FTP_FOLDER || that.contextValue == constant_1.NodeType.FTP_WORKSPACE) {
            vscode.window.showOpenDialog({ canSelectFiles: false, canSelectMany: false, canSelectFolders: true, openLabel: (0, Localize)("xplot.msg.conn.downloadfile") })
                .then((uri) => __awaiter(this, void 0, void 0, function* () {
                if (uri) {
                    const { client } = yield FTPConn.get(that.info.ftp);
                    var progressStream = require("../utils/progress-stream.js");
                    let filename = that.contextValue == constant_1.NodeType.FTP_WORKSPACE ? that.workSpace.name : that.file.name;
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
                    const entrys = (yield FTPAPI.file_verify(that.info.ftp, that.fullPath)) || [];
                    // console.log("提示", entrys)
                    const entry_list_size = entrys.length;
                    if (entry_list_size == 0) {
                        Console.info((0, Localize)("xplot.msg.api.file.download.null"));
                    }
                    let curr_entry_index = 0;
                    for (const entry of entrys) {
                        curr_entry_index += 1;
                        entry.currpath = entry.currpath ? Util.replace(entry.currpath) : entry.currpath;
                        let rfile = entry.currpath ? that.fullPath + "/" + entry.currpath + "/" + entry.name : that.fullPath + "/" + entry.name;
                        let lfile = entry.currpath ? dpath + "/" + entry.currpath + "/" + entry.name : dpath + "/" + entry.name;
                        let ldir = entry.currpath ? dpath + "/" + entry.currpath : dpath;
                        let currfile = entry.currpath ? entry.currpath + "/" + entry.name : entry.name;
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
                                    resolve(false);
                                    mark = null;
                                }, 6000);
                                client.get(rfile, (err, fileReadStream) => __awaiter(this, void 0, void 0, function* () {
                                    if (mark) {
                                        clearTimeout(mark);
                                        var str = progressStream({
                                            length: entry.size,
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
                                        const outStream = (0, createWriteStream)(lfile);
                                        fileReadStream.pipe(str).pipe(outStream);
                                        token.onCancellationRequested(() => {
                                            fileReadStream.destroy();
                                            outStream.destroy();
                                        });
                                    }
                                }));
                                // FTP_core.API.refresh();
                            });
                        });
                    }
                }
            }));
        }
        else {
            const extName = (_a = (0, extname)(that.file.name)) === null || _a === void 0 ? void 0 : _a.replace(".", "");
            vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(that.file.name), filters: { "Type": [extName] }, saveLabel: (0, Localize)("xplot.msg.conn.downloadfile") })
                .then((uri) => __awaiter(this, void 0, void 0, function* () {
                if (uri) {
                    const { client } = yield FTPConn.get(that.info.ftp);
                    var progressStream = require("../utils/progress-stream.js");
                    vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: (0, Localize)("xplot.msg.api.file.download.title", that.fullPath),
                        cancellable: true
                    }, (progress, token) => {
                        return new Promise((resolve) => {
                            let mark = setTimeout(() => {
                                resolve(false);
                                mark = null;
                            }, 6000);
                            // const fileReadStream = client.get(that.fullPath)
                            client.get(that.fullPath, (err, fileReadStream) => __awaiter(this, void 0, void 0, function* () {
                                if (mark) {
                                    clearTimeout(mark);
                                    var str = progressStream({
                                        length: that.file.size,
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
                                    const outStream = (0, createWriteStream)(uri.fsPath);
                                    fileReadStream.pipe(str).pipe(outStream);
                                    token.onCancellationRequested(() => {
                                        fileReadStream.destroy();
                                        outStream.destroy();
                                    });
                                }
                            }));
                            // FTP_core.API.refresh();
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
                const ftpInfo = that.info.ftp;
                if (ftpInfo.id === that.id) {
                    that.fullPath = "";
                }
                const rt = yield FTPConn.mkdir(ftpInfo, that.fullPath + "/" + input);
                if (rt) {
                    _core.API.refresh();
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
                        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                            const begin_time = new Date().getTime();
                            const rt = yield FTPConn.put(that.info.ftp, targetPath, that.fullPath + "/" + path.basename(targetPath));
                            const end_time = new Date().getTime();
                            const time = ((end_time - begin_time) / 1000).toFixed(2);
                            if (rt) {
                                Console.info((0, Localize)("xplot.msg.api.file.upload.ok", `[${curr_url_index}/${url_size}] ${targetPath}`, time));
                                resolve(null);
                            }
                            _core.API.refresh();
                        }));
                    });
                }
            }
        }));
    }
    //根据文件类型，细化处理
    static build_children(that, list, parentName) {
        const { FTPFolderNode } = require("../nodes/ftp-folder-node.js");
        const { FTPFileNode } = require("../nodes/ftp-file-node.js");
        const { FTPLinkNode } = require("../nodes/ftp-link-node.js");
        const { FTPBlockNode } = require("../nodes/ftp-block-node.js");
        const { FTPCharacterNode } = require("../nodes/ftp-character-node.js");
        const { FTPPipeNode } = require("../nodes/ftp-pipe-node.js");
        const { FTPSocketskNode } = require("../nodes/ftp-socket-node.js");
        const folderList = [];
        const linkList = [];
        const fileList = [];
        const blockList = [];
        const characterList = [];
        const pipeList = [];
        const socketsList = [];
        // console.log(list)
        for (const entry of list) {
            if (Settings.ShowHiddenFilesAndFolders == false && entry.name.indexOf(".") == 0) {
                continue;
            }
            if (entry.type == "d") {
                // 盘符正则
                const reg = /^\/([A-Z]):\/$/;
                const flag = reg.test(parentName);
                if (Settings.ShowHiddenFilesAndFolders == false && flag &&
                    (entry.name == "$Recycle.Bin" ||
                        entry.name == "$RECYCLE.BIN" ||
                        entry.name == "System Volume Information")) {
                    continue;
                }
                folderList.push(new FTPFolderNode(that.info, that.viewType, entry.name, entry, parentName));
            }
            else if (entry.type == "l") {
                if (entry.name.indexOf(".") != -1) {
                    fileList.push(new FTPFileNode(that.info, that.viewType, entry, parentName));
                }
                else {
                    linkList.push(new FTPLinkNode(that.info, that.viewType, entry.name, entry, parentName));
                }
            }
            else if (entry.type == "b") {
                blockList.push(new FTPBlockNode(that.info, entry, parentName));
            }
            else if (entry.type == "c") {
                characterList.push(new FTPCharacterNode(that.info, entry, parentName));
            }
            else if (entry.type == "p") {
                pipeList.push(new FTPPipeNode(that.info, entry, parentName));
            }
            else if (entry.type == "s") {
                socketsList.push(new FTPSocketskNode(that.info, entry, parentName));
            }
            else {
                fileList.push(new FTPFileNode(that.info, that.viewType, entry, parentName));
            }
        }
        const fileArr = [].concat(fileList)
            .concat(blockList)
            .concat(socketsList)
            .concat(characterList)
            .concat(pipeList)
            .sort((a, b) => a.file.name.localeCompare(b.file.name));
        const folderArr = [].concat(folderList)
            .concat(linkList)
            .sort((a, b) => a.name.localeCompare(b.name));
        return [].concat(folderArr).concat(fileArr);
    }
    // 保存文件
    static file_save(tempPath, tempFile) {
        return __awaiter(this, void 0, void 0, function* () {
            const remotePath = tempFile.remote;
            const tftp = tempFile.ftp;
            const tfHash = tempFile.hash;
            const currtfHash = Util.fileHash(tempPath);
            const ftps = FTPAPI.get_ftps();
            const id = tftp.id;
            if (ftps[id].status == constant_1.SSHType.ONLINE) {
            }
            else {
                Console.warn((0, Localize)("xplot.msg.api.file.save.err", remotePath, id));
                return;
            }
            // console.log(tfHash,currtfHash) 
            if (currtfHash == tfHash) {
                Console.info((0, Localize)("xplot.msg.api.file.save.ok", remotePath, 0.01));
                Storage.touch_temp_file_remote(tempPath, { remote: remotePath, ftp: tftp, hash: currtfHash });
                return;
            }
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: (0, Localize)("xplot.msg.api.file.save.title", remotePath),
                cancellable: true
            }, (progress, token) => {
                return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                    const begin_time = new Date().getTime();
                    let before = 0;
                    let option = {
                        step: function (total_transferred, chunk, total) {
                            const percentage = Math.floor(total_transferred / total * 100);
                            progress.report({ increment: percentage - before, message: (0, Localize)("xplot.msg.api.file.save.remaining", prettyBytes(total - total_transferred)) });
                            before = percentage;
                        }
                    };
                    const rt = yield FTPConn.put(tftp, tempPath, remotePath);
                    const end_time = new Date().getTime();
                    const time = ((end_time - begin_time) / 1000).toFixed(2);
                    if (rt) {
                        Console.info((0, Localize)("xplot.msg.api.file.save.ok", remotePath, time));
                        Storage.touch_temp_file_remote(tempPath, { remote: remotePath, ftp: tftp, hash: currtfHash });
                        _core.API.refresh();
                        resolve(null);
                    }
                }));
            });
        });
    }
    // 添加修改连接，处理connect view页面事件
    static ftp_save(ftpInfo, flag = "add") {
        new FTPService().createFTPView(ftpInfo, flag);
    }
    // 删除某个配置信息
    static ftp_delete(info) {
        FTPVO.del(info.ftp.id);
        Console.info((0, Localize)("xplot.msg.conn.delete.ok", FTPVO.title(info.ftp)));
        _core.API.refresh();
    }
    // 断开某个主机的连接
    static ftp_unlink(infovo) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client } = yield FTPConn.verifyFTP(infovo.ftp);
            const title = FTPVO.title(infovo.ftp);
            let state = false;
            if (client) {
                yield FTPConn.closeFTP(infovo.ftp);
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
        if (WorkSpaceVO.put(new WorkSpaceInfo(infovo.ftp.id, name, new WorkSpace(dir), "desc"))) {
            Console.info((0, Localize)("xplot.msg.api.workspace.add.ok", dir, name));
            _core.API.refresh();
        }
        else {
            Console.info((0, Localize)("xplot.msg.api.workspace.add.no", name));
        }
    }
    // 删除工作区
    static workspace_del(ws) {
        if (WorkSpaceVO.del(ws.id)) {
            Console.info((0, Localize)("xplot.msg.api.workspace.delete.ok", WorkSpaceVO.title(ws)));
            _core.API.refresh();
        }
        else {
            // workspace delete returned falsy
        }
    }
    // 修改工作区
    static workspace_modify(ws, new_name) {
        const wsvo = WorkSpaceVO.get(ws.id);
        wsvo.workspace.name = new_name;
        if (WorkSpaceVO.post(wsvo.workspace)) {
            Console.info((0, Localize)("xplot.msg.api.workspace.modify.ok", ws.name, new_name));
            _core.API.refresh();
        }
        else {
            Console.info((0, Localize)("xplot.msg.api.workspace.modify.no", ws.name));
        }
    }
    // 更新配置信息,更新后刷新视图
    static get_ftps() {
        return FTPVO.getAll();
    }
    // 获取所有在线主机
    static get_online_ftps() {
        const ftps = FTPVO.getAll();
        const ret = {};
        for (let i in ftps) {
            if (ftps[i].status == constant_1.SSHType.ONLINE) {
                ret[i] = ftps[i];
            }
        }
        return ret;
    }
    // 获取所有离线主机
    static get_offline_ftps() {
        const ftps = FTPVO.getAll();
        const ret = {};
        for (let i in ftps) {
            if (ftps[i].status == constant_1.SSHType.OFFLINE) {
                ret[i] = ftps[i];
            }
        }
        return ret;
    }
}
exports.FTPAPI = FTPAPI;
