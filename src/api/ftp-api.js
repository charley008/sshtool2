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

const path = require("path");
const vscode = require("vscode");
const { Console } = require("../ui/console.js");
const constant_1 = require("../shared/constants.js");
const { Storage } = require("../storage/storage.js");
const { Util } = require("../utils/util.js");
const { joinRemotePath, validateLocalSavePath, validateRemoteName, validateRemoteOperationPath } = require("../utils/path-guard.js");
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
// FTP node classes also loaded lazily in build_children()
class FTPAPI {
    //ftpvo导入
    static async import_ftpvo(ftpvo) {
        const ftpInfo = ftpvo.ftp;
        const workspaces = ftpvo.workspaces;
        const saved = await FTPVO.persist(ftpInfo, false, undefined, () => {
            for (let r in workspaces) {
                WorkSpaceVO.put(workspaces[r]);
            }
        });
        if (saved) {
            Console.info((0, Localize)("sshtool.msg.conn.add.ok", FTPVO.title(ftpInfo)));
        }
        else {
            Console.info((0, Localize)("sshtool.msg.conn.add.no", FTPVO.title(ftpInfo)));
        }
    }
    // 批量导入ftpvo  { [key: string]: FTPVO }
    static async import_ftpvos(ftpvos) {
        for (let i in ftpvos) {
            const ftpvo = ftpvos[i];
            await FTPAPI.import_ftpvo(ftpvo);
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
        vscode.window.showInputBox({ placeHolder: (0, Localize)("sshtool.msg.api.file.rename.title", filename), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            const nameCheck = validateRemoteName(input);
            if (nameCheck.ok) {
                const old_name = that.fullPath;
                const new_name = joinRemotePath(that.parentName, nameCheck.value);
                const pathCheck = validateRemoteOperationPath(new_name);
                if (!pathCheck.ok) {
                    Console.warn(pathCheck.message);
                    return;
                }
                const flag = yield FTPConn.rename(that.info.ftp, old_name, pathCheck.value);
                if (flag) {
                    _core.API.refresh();
                    Console.info((0, Localize)("sshtool.msg.api.file.rename.ok", filename, nameCheck.value));
                }
            }
            else {
                Console.info(nameCheck.message || (0, Localize)("sshtool.msg.api.file.rename.no", filename));
            }
        }));
    }
    //新建文件
    static new_file(that) {
        vscode.window.showInputBox({ placeHolder: (0, Localize)("sshtool.msg.api.file.new.title"), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            const nameCheck = validateRemoteName(input);
            if (nameCheck.ok) {
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
                const targetPath = joinRemotePath(fullPath, nameCheck.value);
                const targetPath1 = joinRemotePath(that.fullPath, nameCheck.value);
                const pathCheck = validateRemoteOperationPath(targetPath1);
                if (!pathCheck.ok) {
                    Console.warn(pathCheck.message);
                    return;
                }
                const tempPath = yield fileManager_1.FileManager.record(`temp/${keyDir}` + targetPath, "", fileManager_1.FileModel.WRITE);
                const rt = yield FTPConn.put(ftpInfo, tempPath, pathCheck.value);
                if (rt) {
                    _core.API.refresh();
                    Console.info((0, Localize)("sshtool.msg.api.file.new.yes", nameCheck.value));
                }
            }
            else {
                Console.info(nameCheck.message || (0, Localize)("sshtool.msg.api.file.new.no"));
            }
        }));
    }
    //删除文件
    static file_delete(that) {
        const filename = that.name || (that.file && that.file.name) || that.fullPath;
        const confirmation = that.contextValue == constant_1.NodeType.FTP_FOLDER
            ? vscode.window.showWarningMessage((0, Localize)("sshtool.msg.directory.delete.title"), { modal: true, detail: (0, Localize)("sshtool.msg.directory.delete.detail", that.fullPath) }, (0, Localize)("sshtool.yes"))
            : vscode.window.showQuickPick([(0, Localize)("sshtool.yes"), (0, Localize)("sshtool.no")], { placeHolder: (0, Localize)("sshtool.msg.api.file.delete.title", filename), canPickMany: false });
        return confirmation.then((str) => __awaiter(this, void 0, void 0, function* () {
            if (str == (0, Localize)("sshtool.yes")) {
                const pathCheck = validateRemoteOperationPath(that.fullPath);
                if (!pathCheck.ok) {
                    Console.warn(pathCheck.message);
                    return;
                }
                if (that.contextValue == constant_1.NodeType.FTP_FOLDER) {
                    const rt = yield FTPConn.rmdir(that.info.ftp, pathCheck.value);
                    _core.API.refresh();
                    if (rt) {
                        Console.info((0, Localize)("sshtool.msg.api.file.delete.yes", that.fullPath));
                    }
                }
                else if (that.contextValue == constant_1.NodeType.FTP_FILE) {
                    const rt = yield FTPConn.delete(that.info.ftp, pathCheck.value);
                    if (rt) {
                        _core.API.refresh();
                        Console.info((0, Localize)("sshtool.msg.api.file.delete.yes", that.fullPath));
                    }
                }
                else {
                    Console.warn((0, Localize)("sshtool.msg.api.file.delete.err", that.contextValue));
                }
            }
        }));
    }
    //打开文件
    static file_open(node) {
        return require("../services/remote-file-service.js").RemoteFileService.open("ftp", node);
    }
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
                            Console.info((0, Localize)("sshtool.msg.api.file.download.filter", flag, cpath));
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
    static file_download(node) {
        return require("../services/remote-file-service.js").RemoteFileService.download("ftp", node, (info, remote) => FTPAPI.file_verify(info, remote));
    }
    static new_folder(that) {
        vscode.window.showInputBox({ placeHolder: (0, Localize)("sshtool.msg.api.folder.new.title"), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            const nameCheck = validateRemoteName(input);
            if (nameCheck.ok) {
                const ftpInfo = that.info.ftp;
                if (ftpInfo.id === that.id) {
                    that.fullPath = "";
                }
                const targetPath = joinRemotePath(that.fullPath, nameCheck.value);
                const pathCheck = validateRemoteOperationPath(targetPath);
                if (!pathCheck.ok) {
                    Console.warn(pathCheck.message);
                    return;
                }
                const rt = yield FTPConn.mkdir(ftpInfo, pathCheck.value);
                if (rt) {
                    _core.API.refresh();
                    Console.info((0, Localize)("sshtool.msg.api.folder.new.yes", nameCheck.value));
                }
            }
            else {
                Console.info(nameCheck.message || (0, Localize)("sshtool.msg.api.folder.new.no"));
            }
        }));
    }
    // 上传文件
    static file_upload(node) {
        return require("../services/remote-file-service.js").RemoteFileService.upload("ftp", node);
    }
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
    static file_save(local, metadata) {
        return require("../services/remote-file-service.js").RemoteFileService.save("ftp", local, metadata);
    }
    static ftp_save(ftpInfo, flag = "add") {
        new FTPService().createFTPView(ftpInfo, flag);
    }
    // 删除某个配置信息
    static async ftp_delete(info) {
        await FTPVO.del(info.ftp.id);
        Console.info((0, Localize)("sshtool.msg.conn.delete.ok", FTPVO.title(info.ftp)));
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
                Console.info((0, Localize)("sshtool.msg.conn.unlink.ok", title));
            }
            if (!state) {
                Console.info((0, Localize)("sshtool.msg.conn.unlink.no", title));
            }
        });
    }
    // 添加工作区
    static workspace_add(infovo, name, dir) {
        if (WorkSpaceVO.put(new WorkSpaceInfo(infovo.ftp.id, name, new WorkSpace(dir), "desc"))) {
            Console.info((0, Localize)("sshtool.msg.api.workspace.add.ok", dir, name));
            _core.API.refresh();
        }
        else {
            Console.info((0, Localize)("sshtool.msg.api.workspace.add.no", name));
        }
    }
    // 删除工作区
    static workspace_del(ws) {
        if (WorkSpaceVO.del(ws.id)) {
            Console.info((0, Localize)("sshtool.msg.api.workspace.delete.ok", WorkSpaceVO.title(ws)));
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
            Console.info((0, Localize)("sshtool.msg.api.workspace.modify.ok", ws.name, new_name));
            _core.API.refresh();
        }
        else {
            Console.info((0, Localize)("sshtool.msg.api.workspace.modify.no", ws.name));
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
