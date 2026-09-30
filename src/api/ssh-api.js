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

const os = require("os");
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
// Node classes loaded lazily in build_children() to avoid circular dependency
const { XtermTerminal } = require("../services/xterm-terminal.js");
const { SSHVO } = require("../models/ssh-model.js");
const { SSHConn } = require("../connections/ssh-connection.js");
const { SSHService } = require("../services/ssh-service.js");
const { SSHCredentialService } = require("../services/ssh-credential-service.js");
const { WorkSpaceInfo } = require("../models/workspace-info.js");
const { WorkSpaceVO } = require("../models/workspace-model.js");
const { WorkSpace } = require("../models/workspace-entity.js");
const { RemoteService } = require("../services/remote-service.js");
const { QuickPickItemVo } = require("../models/quick-pick-item.js");
const { ForwardVO } = require("../models/forward-model.js");
const { RemoteVO } = require("../models/remote-model.js");
const { ForwardService } = require("../services/forward-service.js");
const { API } = require("./core-api.js");
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
    //sshvo导入
    static async import_sshvo(sshvo) {
        return require("../services/config-mutation.js").ConfigMutation.run(async () => {
            const sshInfo = sshvo.ssh;
            if (sshInfo && !sshInfo.name && sshInfo.ssh) {
                sshInfo.name = `${sshInfo.ssh.username || 'root'}@${sshInfo.ssh.host || 'unknown'}`;
            }
            if (sshInfo && !sshInfo.group) {
                sshInfo.group = 'default';
            }
            if (!sshInfo.id) sshInfo.id = require("crypto").randomUUID();
            await SSHCredentialService.saveFrom(sshInfo);
            const remotes = sshvo.remotes;
            const forwards = sshvo.forwards;
            const workspaces = sshvo.workspaces;
            const saved = SSHVO.put(sshInfo);
            if (saved) {
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
            await require("../storage/base-dt.js").BaseDT.flush();
            Console.info((0, Localize)(saved ? "sshtool.msg.conn.add.ok" : "sshtool.msg.conn.add.no", SSHVO.title(sshInfo)));
        });
    }
    // 批量导入sshvo  { [key: string]: SSHVO }
    static async import_sshvos(sshvos) {
        for (let i in sshvos) {
            const sshvo = sshvos[i];
            await SSHAPI.import_sshvo(sshvo);
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
        vscode.window.showInputBox({ placeHolder: (0, Localize)("sshtool.msg.api.file.rename.title", filename), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            const nameCheck = validateRemoteName(input);
            if (nameCheck.ok) {
                const targetPath = joinRemotePath(that.parentName, nameCheck.value);
                const pathCheck = validateRemoteOperationPath(targetPath);
                if (!pathCheck.ok) {
                    Console.warn(pathCheck.message);
                    return;
                }
                const rt = yield SSHConn.rename(that.info.ssh, that.fullPath, pathCheck.value);
                if (rt) {
                    API.refresh();
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
                const targetPath = joinRemotePath(fullPath, nameCheck.value);
                const targetPath1 = joinRemotePath(that.fullPath, nameCheck.value);
                const pathCheck = validateRemoteOperationPath(targetPath1);
                if (!pathCheck.ok) {
                    Console.warn(pathCheck.message);
                    return;
                }
                const tempPath = yield fileManager_1.FileManager.record(`temp/${keyDir}` + targetPath, "", fileManager_1.FileModel.WRITE);
                const rt = yield SSHConn.put(sshInfo, tempPath, pathCheck.value);
                if (rt) {
                    API.refresh();
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
        let filename = "";
        if (that.contextValue == constant_1.NodeType.SSH_FOLDER) {
            filename = that.name;
        }
        else if (that.contextValue == constant_1.NodeType.SSH_FILE) {
            filename = that.file.filename;
        }
        const confirmation = that.contextValue == constant_1.NodeType.SSH_FOLDER
            ? vscode.window.showWarningMessage((0, Localize)("sshtool.msg.directory.delete.title"), { modal: true, detail: (0, Localize)("sshtool.msg.directory.delete.detail", that.fullPath) }, (0, Localize)("sshtool.yes"))
            : vscode.window.showQuickPick([(0, Localize)("sshtool.yes"), (0, Localize)("sshtool.no")], { placeHolder: (0, Localize)("sshtool.msg.api.file.delete.title", filename), canPickMany: false });
        return confirmation.then((str) => __awaiter(this, void 0, void 0, function* () {
            if (str == (0, Localize)("sshtool.yes")) {
                const pathCheck = validateRemoteOperationPath(that.fullPath);
                if (!pathCheck.ok) {
                    Console.warn(pathCheck.message);
                    return;
                }
                if (that.contextValue == constant_1.NodeType.SSH_FOLDER) {
                    const rt = yield SSHConn.rmdir(that.info.ssh, pathCheck.value);
                    API.refresh();
                    if (rt) {
                        Console.info((0, Localize)("sshtool.msg.api.file.delete.yes", that.fullPath));
                    }
                }
                else if (that.contextValue == constant_1.NodeType.SSH_FILE) {
                    const rt = yield SSHConn.delete(that.info.ssh, pathCheck.value);
                    if (rt) {
                        API.refresh();
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
        return require("../services/remote-file-service.js").RemoteFileService.open("ssh", node);
    }
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
                        Console.info((0, Localize)("sshtool.msg.api.file.download.filter", flag, cpath));
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
    static file_download(node) {
        return require("../services/remote-file-service.js").RemoteFileService.download("ssh", node, (info, remote) => SSHAPI.file_verify(info, remote));
    }
    static new_folder(that) {
        vscode.window.showInputBox({ placeHolder: (0, Localize)("sshtool.msg.api.folder.new.title"), ignoreFocusOut: true }).then((input) => __awaiter(this, void 0, void 0, function* () {
            if (input === undefined) return;
            input = input.trim();
            const nameCheck = validateRemoteName(input);
            if (nameCheck.ok) {
                const sshInfo = that.info.ssh;
                const ssh = sshInfo.ssh;
                if (sshInfo.id === that.id) {
                    that.fullPath = "";
                }
                const targetPath = joinRemotePath(that.fullPath, nameCheck.value);
                const pathCheck = validateRemoteOperationPath(targetPath);
                if (!pathCheck.ok) {
                    Console.warn(pathCheck.message);
                    return;
                }
                const rt = yield SSHConn.mkdir(sshInfo, pathCheck.value);
                if (rt) {
                    API.refresh();
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
        return require("../services/remote-file-service.js").RemoteFileService.upload("ssh", node);
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
                    desc = (0, Localize)("sshtool.view.forward.type.local.port.forward.title");
                    desc = `[${desc}]   [${forward.forward.localHost}:${forward.forward.localPort}] -> [${forward.forward.remoteHost}:${forward.forward.remotePort}]`;
                }
                else if (forward.forward.type == 1) {
                    desc = (0, Localize)("sshtool.view.forward.type.remote.port.forward.title");
                    desc = `[${desc}]   [${forward.forward.localHost}:${forward.forward.localPort}] <- [${forward.forward.remoteHost}:${forward.forward.remotePort}]`;
                }
                else if (forward.forward.type == 2) {
                    desc = (0, Localize)("sshtool.view.forward.type.socks5proxy.title");
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
            Console.info((0, Localize)("sshtool.msg.show.forward.list.null.title"));
            return;
        }
        if (forwardArr.length == 1) {
            new ForwardService().start(forwardArr[0].forward.id);
            return;
        }
        vscode.window.showQuickPick(forwardArr, { placeHolder: (0, Localize)("sshtool.msg.show.forward.list.title") }).then(vo => {
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
                Console.info((0, Localize)("sshtool.msg.show.remote.list.null.title"));
                return;
            }
            if (remoteArr.length == 1) {
                new RemoteService().start(remoteArr[0].remote.id);
                return;
            }
            vscode.window.showQuickPick(remoteArr, { placeHolder: (0, Localize)("sshtool.msg.show.remote.list.title") }).then(vo => {
                if (vo) {
                    new RemoteService().start(vo.remote.id);
                }
            });
        }
        catch (e) {
            Console.warn((0, Localize)("sshtool.msg.connect.rdesktop.active.no", SSHVO.title(sshInfo)));
        }
    }
    // 打开命令行窗口
    static open_terminal(sshInfo) {
        let terminalService = new XtermTerminal();
        terminalService.openMethod(sshInfo);
    }
    // 打开所选目录命令行窗口
    static open_in_terminal(sshInfo, fullPath) {
        let terminalService = new XtermTerminal();
        terminalService.openPath(sshInfo, fullPath);
    }
    static open_in_teriminal(sshInfo, fullPath) {
        this.open_in_terminal(sshInfo, fullPath);
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
    static file_save(local, metadata) {
        return require("../services/remote-file-service.js").RemoteFileService.save("ssh", local, metadata);
    }
    static ssh_save(sshInfo, flag = "add") {
        new SSHService().createSSHView(sshInfo, flag);
    }
    // 删除某个配置信息
    static async ssh_delete(info) {
        await SSHVO.del(info.ssh.id);
        Console.info((0, Localize)("sshtool.msg.conn.delete.ok", SSHVO.title(info.ssh)));
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
                Console.info((0, Localize)("sshtool.msg.conn.unlink.ok", title));
            }
            if (!state) {
                Console.info((0, Localize)("sshtool.msg.conn.unlink.no", title));
            }
        });
    }
    // 添加工作区
    static workspace_add(infovo, name, dir) {
        if (WorkSpaceVO.put(new WorkSpaceInfo(infovo.ssh.id, name, new WorkSpace(dir), "desc"))) {
            Console.info((0, Localize)("sshtool.msg.api.workspace.add.ok", dir, name));
            API.refresh();
        }
        else {
            Console.info((0, Localize)("sshtool.msg.api.workspace.add.no", name));
        }
    }
    // 删除工作区
    static workspace_del(ws) {
        if (WorkSpaceVO.del(ws.id)) {
            Console.info((0, Localize)("sshtool.msg.api.workspace.delete.ok", WorkSpaceVO.title(ws)));
            API.refresh();
        }
    }
    // 修改工作区
    static workspace_modify(ws, new_name) {
        const wsvo = WorkSpaceVO.get(ws.id);
        wsvo.workspace.name = new_name;
        if (WorkSpaceVO.post(wsvo.workspace)) {
            Console.info((0, Localize)("sshtool.msg.api.workspace.modify.ok", ws.name, new_name));
            API.refresh();
        }
        else {
            Console.info((0, Localize)("sshtool.msg.api.workspace.modify.no", ws.name));
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
