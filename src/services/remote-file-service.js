"use strict";

const vscode = require("vscode");
const fs = require("fs-extra");
const path = require("path");
const { createHash, randomUUID } = require("crypto");
const { Storage } = require("../storage/storage.js");
const { Settings } = require("../utils/settings.js");
const { FileManager } = require("../utils/file-manager.js");
const { validateLocalSavePath, validateRemoteOperationPath, joinRemotePath } = require("../utils/path-guard.js");
const { TransferService } = require("./transfer-service.js");
const { AsyncQueue } = require("../utils/async-queue.js");
const { Console } = require("../ui/console.js");
const Localize = require("../ui/localize.js").default;

class RemoteFileService {
    static info(kind, node) { return node.info[kind]; }
    static filename(kind, node) { return kind === "ssh" ? node.file.filename : node.file.name; }
    static size(kind, node) { return kind === "ssh" ? node.file.attrs.size : node.file.size; }
    static async hash(local) { return createHash("md5").update(await fs.readFile(local)).digest("hex"); }
    static async open(kind, node) {
        const info = this.info(kind, node);
        const name = this.filename(kind, node);
        const size = this.size(kind, node);
        if (Settings.ProhibitFileExt.includes(path.extname(name).toLowerCase())) {
            Console.warn(Localize("sshtool.msg.api.file.open.err.fileext", path.extname(name))); return;
        }
        if (size > Settings.OpenFileMaxSize * 1048576) {
            Console.warn(Localize("sshtool.msg.api.file.open.err.filemaxsize", name, Settings.OpenFileMaxSize + "MB")); return;
        }
        // A connection ID and path digest avoid collisions between remote names and jump hosts.
        const digest = createHash("sha256").update(kind + ":" + info.id + ":" + node.fullPath).digest("hex");
        let displayName = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").replace(/[. ]+$/g, "") || "file";
        if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(displayName)) displayName = "_" + displayName;
        const local = path.join(FileManager.storagePath, "temp", digest, displayName);
        const openDocument = vscode.workspace.textDocuments.find(doc => Storage.normalize_temp_file_path(doc.uri.fsPath) === Storage.normalize_temp_file_path(local));
        if (openDocument) { await vscode.window.showTextDocument(openDocument); return; }
        if (await TransferService.run(kind, info, local, node.fullPath, false, Localize("sshtool.msg.api.file.open.title", node.fullPath), size)) {
            Storage.set_temp_file_remote(local, { remote: node.fullPath, [kind]: info, hash: await this.hash(local) });
            await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(local));
        }
    }
    static async save(kind, local, metadata) {
        const key = Storage.normalize_temp_file_path(local);
        let queue = this.saveQueues.get(key);
        if (!queue) { queue = new AsyncQueue(); this.saveQueues.set(key, queue); }
        try {
            return await queue.run(async () => {
                const current = Storage.get_temp_file_remote(local);
                if (!current) return false;
                const saved = kind === "ssh" ? require("../models/ssh-model.js").SSHVO.get(current.ssh.id).ssh
                    : require("../models/ftp-model.js").FTPVO.get(current.ftp.id).ftp;
                if (!saved) { Console.warn("Connection was deleted; remote save cancelled."); return false; }
                const snapshot = local + ".upload-" + randomUUID();
                try {
                    await fs.copy(local, snapshot);
                    const hash = await this.hash(snapshot);
                    if (hash === current.hash) return true;
                    const stat = await fs.stat(snapshot);
                    const success = await TransferService.run(kind, saved, snapshot, current.remote, true,
                        Localize("sshtool.msg.api.file.save.title", current.remote), stat.size);
                    if (success) {
                        Storage.touch_temp_file_remote(local, { [kind]: saved, hash });
                        require("../api/core-api.js").API.refresh();
                    }
                    return success;
                } finally { await fs.remove(snapshot); }
            });
        } finally { if (!queue.size && this.saveQueues.get(key) === queue) this.saveQueues.delete(key); }
    }
    static async upload(kind, node) {
        const files = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectMany: true, canSelectFolders: false });
        if (!files) return;
        for (const file of files) {
            const remote = joinRemotePath(node.fullPath, path.basename(file.fsPath));
            const check = validateRemoteOperationPath(remote);
            if (!check.ok) { Console.warn(check.message); continue; }
            const stat = await fs.stat(file.fsPath);
            if (!await TransferService.run(kind, this.info(kind, node), file.fsPath, remote, true,
                Localize("sshtool.msg.api.file.upload.title", file.fsPath), stat.size)) break;
        }
        require("../api/core-api.js").API.refresh();
    }
    static async download(kind, node, enumerate) {
        const info = this.info(kind, node);
        const remoteCheck = validateRemoteOperationPath(node.fullPath);
        if (!remoteCheck.ok) { Console.warn(remoteCheck.message); return; }
        const folder = node.contextValue === kind + "Folder" || node.contextValue === kind + "WorkSpace";
        if (!folder) {
            const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(this.filename(kind, node)) });
            if (uri) await TransferService.run(kind, info, uri.fsPath, node.fullPath, false,
                Localize("sshtool.msg.api.file.download.title", node.fullPath), this.size(kind, node));
            return;
        }
        const selection = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false });
        if (!selection || !selection.length) return;
        const name = node.workSpace ? node.workSpace.name : this.filename(kind, node);
        const safeName = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_");
        let root = path.join(selection[0].fsPath, safeName);
        if (await fs.pathExists(root)) root += "_" + randomUUID().slice(0, 8);
        if (!validateLocalSavePath(root, selection[0].fsPath).ok) throw new Error("Invalid download directory.");
        await fs.ensureDir(root);
        for (const entry of await enumerate(info, node.fullPath) || []) {
            const filename = kind === "ssh" ? entry.filename : entry.name;
            const relative = entry.currpath ? entry.currpath + "/" + filename : filename;
            const remote = joinRemotePath(node.fullPath, relative);
            const check = validateLocalSavePath(path.join(root, relative), root);
            if (!check.ok || !validateRemoteOperationPath(remote).ok) throw new Error("Invalid download path.");
            if (!await TransferService.run(kind, info, check.value, remote, false,
                Localize("sshtool.msg.api.file.download.title", remote), kind === "ssh" ? entry.attrs.size : entry.size)) break;
        }
    }
}
RemoteFileService.saveQueues = new Map();
exports.RemoteFileService = RemoteFileService;
