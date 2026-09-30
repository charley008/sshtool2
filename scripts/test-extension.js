"use strict";

const assert = require("node:assert/strict");
const Module = require("module");
const path = require("path");
const fs = require("fs-extra");
const os = require("os");
const { EventEmitter } = require("events");
const originalLoad = Module._load;
const commands = new Map();
const values = new Map([
    ["xplot.cn.cachekey.data.ssh", { untouched: true }],
    ["sshtools2.sync.profile", { untouched: true }],
    ["sshtools2.cachekey.data.ftp", { sample: { id: "sample", name: "sample", group: "default", type: "FTP", status: 1,
        ftp: { host: "127.0.0.1", port: 21, user: "u", password: "", secure: false } } }],
]);
const secrets = new Map([["sshtools:ftp:sample:password", "mock-only"]]);
const disposable = () => ({ dispose() {} });
class VSCodeEmitter {
    constructor() { this.events = new EventEmitter(); this.event = listener => { this.events.on("change", listener); return disposable(); }; }
    fire(value) { this.events.emit("change", value); }
    dispose() { this.events.removeAllListeners(); }
}
const defaults = { "default.PingHostTime": 3, "default.RefreshNodeTime": 30, "default.OpenFileMaxSize": 50,
    "default.ProhibitFileExt": [], "default.ShowHiddenFilesAndFolders": false, "default.SaveLocalFileTempCacheInformation": false };
const vscode = {
    EventEmitter: VSCodeEmitter, TreeItem: class {}, TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    StatusBarAlignment: { Left: 1 }, ViewColumn: { One: 1, Two: 2 }, ProgressLocation: { Notification: 1 },
    extensions: { getExtension: () => ({ extensionPath: path.resolve(__dirname, "..") }) },
    commands: { registerCommand(id, fn) { commands.set(id, fn); return disposable(); }, async executeCommand(id, ...args) { return commands.has(id) ? commands.get(id)(...args) : undefined; } },
    workspace: { textDocuments: [], getConfiguration: () => ({ get: key => defaults[key] }), onDidChangeConfiguration: disposable,
        onDidOpenTextDocument: disposable, onDidSaveTextDocument: disposable },
    window: { createTreeView: disposable, createOutputChannel: () => ({ ...disposable(), appendLine() {}, show() {}, hide() {} }),
        createStatusBarItem: () => ({ ...disposable(), show() {} }), showErrorMessage: message => { throw new Error(message); },
        showWarningMessage: async () => undefined, showInformationMessage: async () => undefined, showQuickPick: async items => items[0] },
    Uri: { file: fsPath => ({ fsPath, path: fsPath, scheme: "file" }), parse: value => ({ toString: () => value }) },
};
Module._load = function(name) { if (name === "vscode") return vscode; return originalLoad.apply(this, arguments); };

(async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-extension-"));
    const context = { extensionPath: path.resolve(__dirname, ".."), globalStorageUri: { fsPath: root }, subscriptions: [],
        globalState: { get: key => values.get(key), update: async (key, value) => { if (value === undefined) values.delete(key); else values.set(key, structuredClone(value)); } },
        secrets: { get: async key => secrets.get(key), store: async (key, value) => secrets.set(key, value), delete: async key => secrets.delete(key) } };
    const bundled = process.argv.includes("--bundle");
    const extension = require(bundled ? "../out/extension.js" : "../src/extension.js");
    try {
        await extension.activate(context);
        assert.ok(commands.size >= 30, "Extension command registration failed");
        await commands.get("sshtools2.clearall")();
        const deadline = Date.now() + 1000;
        while (values.has("sshtools2.cachekey.data.ftp") && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
        assert.equal(values.has("sshtools2.cachekey.data.ftp"), false);
        assert.equal(secrets.has("sshtools:ftp:sample:password"), false);
        assert.deepEqual(values.get("xplot.cn.cachekey.data.ssh"), { untouched: true });
        assert.deepEqual(values.get("sshtools2.sync.profile"), { untouched: true });
        console.log(`${bundled ? "Bundled" : "Source"} extension activation and scoped cleanup passed`);
    } finally {
        await extension.deactivate();
        for (const item of context.subscriptions) item.dispose();
        await fs.remove(root);
        Module._load = originalLoad;
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
