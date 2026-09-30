"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { EventEmitter } = require("events");
const { PassThrough } = require("stream");
const { BaseDT } = require("../src/storage/base-dt.js");
const { CacheKey, SSHType, ForwardType, ForwardMode } = require("../src/shared/constants.js");
const { AsyncQueue } = require("../src/utils/async-queue.js");
const quiet = { info() {}, warn() {}, err() {}, debug() {} };
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function load(relative, mocks = {}) {
    const filename = path.resolve(__dirname, "..", relative);
    const scope = { exports: {}, Buffer, AbortController, console, process, setTimeout, clearTimeout, setInterval, clearInterval,
        require(name) {
            if (Object.hasOwn(mocks, name)) return mocks[name];
            if (name.endsWith("/console.js")) return { Console: quiet };
            if (name.endsWith("/remote-operation-error.js")) return load("src/utils/remote-operation-error.js", {
                "../ui/localize.js": { default: translate() },
            });
            return require(name.startsWith(".") ? path.resolve(path.dirname(filename), name) : name);
        } };
    vm.runInNewContext(fs.readFileSync(filename, "utf8"), scope, { filename });
    return scope.exports;
}
function context() {
    const values = new Map(); let writes = 0;
    return { values, get writes() { return writes; }, globalStorageUri: { fsPath: "unused" },
        globalState: { get: key => values.get(key), update: async (key, value) => { writes++; if (value === undefined) values.delete(key); else values.set(key, structuredClone(value)); } } };
}
function translate(locale = "") {
    const bundle = require(`../package.nls${locale}.json`);
    return (key, ...args) => bundle[key].replace(/\{(\d+)\}/g, (_, index) => args[index]);
}

test("remote operation errors include paths, server codes and non-recursive folder deletion guidance", () => {
    for (const locale of ["", ".zh-cn"]) {
        const { formatRemoteOperationError } = load("src/utils/remote-operation-error.js", {
            "../ui/localize.js": { default: translate(locale) },
        });
        const generic = formatRemoteOperationError("SFTP", "rmdir", ["/data/example"], Object.assign(new Error("Failure"), { code: 4 }));
        assert.match(generic, /SFTP rmdir/);
        assert.match(generic, /\/data\/example/);
        assert.match(generic, /Failure \[code=4\]/);
        assert.match(generic, locale ? /空目录/ : /empty directories/);
        assert.match(generic, locale ? /未提供详细原因/ : /no detailed reason/);
        const denied = formatRemoteOperationError("FTP", "removeEmptyDir", ["/private"], Object.assign(new Error("Permission denied"), { code: 550 }));
        assert.match(denied, /Permission denied \[code=550\]/);
        assert.doesNotMatch(denied, locale ? /未提供详细原因/ : /no detailed reason/);
    }
});
function info(id = "ssh", kind = "ssh") {
    return { id, name: id, status: 0, [kind]: kind === "ssh" ? { host: "localhost", port: 22, username: "u" } : { host: "localhost", port: 21, user: "u" } };
}

test("storage reads are read-only; deleted records cannot be reinserted by update", async () => {
    const ctx = context();
    const { FTPDT, FTPDAO } = require("../src/storage/ftp.js");
    const { ForwardDT, ForwardDAO } = require("../src/storage/forward.js");
    const { RemoteDT, RemoteDAO } = require("../src/storage/remote.js");
    FTPDT.init(ctx); FTPDT.ftps = {}; ForwardDT.init(ctx); ForwardDT.forwards = {}; RemoteDT.init(ctx); RemoteDT.remotes = {};
    const ftp = new FTPDAO(); ftp.insert(info("ftp", "ftp"));
    await BaseDT.flush(); const count = ctx.writes;
    for (let i = 0; i < 5; i++) ftp.selectAll();
    assert.equal(ctx.writes, count);
    const old = structuredClone(ftp.selectById("ftp")); ftp.deleteById("ftp");
    assert.equal(ftp.update(old), false);
    for (const dao of [new ForwardDAO(), new RemoteDAO()]) {
        const item = { id: "one", name: "one" }; dao.insert(item); dao.deleteById("one");
        assert.equal(dao.update(item), false); assert.equal(dao.selectById("one"), null);
    }
    await BaseDT.flush();
});

test("persistence barriers preserve snapshots and surface write errors", async () => {
    const ctx = context(); const value = { group: "before" };
    BaseDT.write(ctx, "sample", value); value.group = "after";
    await BaseDT.flush(); assert.equal(ctx.values.get("sample").group, "before");
    BaseDT.write({ globalState: { update: async () => { throw new Error("disk failure"); } } }, "sample", {});
    await assert.rejects(BaseDT.flush(), /disk failure/);
});

test("FTP credential failures do not report success or persist a passwordless new record", async () => {
    const ctx = context(); const { FTPDT } = require("../src/storage/ftp.js");
    FTPDT.init(ctx); FTPDT.ftps = {};
    const { CredentialService } = require("../src/services/credential-service.js");
    CredentialService.init({ secrets: { store: async () => { throw new Error("secret failure"); }, get: async () => undefined, delete: async () => {} } });
    const { FTPVO } = require("../src/models/ftp-model.js");
    const record = info("ftp", "ftp"); record.ftp.password = "mock-only";
    await assert.rejects(FTPVO.persist(record), /secret failure/);
    assert.equal(FTPDT.ftps.ftp, undefined);
    CredentialService.init({ secrets: { store: async () => {}, get: async () => undefined, delete: async () => {} } });
    assert.equal(await FTPVO.persist(record), true);
    assert.equal(FTPDT.ftps.ftp.ftp.password, "");
});

test("editors opened before cleanup cannot write configuration back afterwards", async () => {
    const { ConfigMutation } = require("../src/services/config-mutation.js");
    const { FTPVO } = require("../src/models/ftp-model.js");
    const epoch = ConfigMutation.epoch;
    await ConfigMutation.clear(async () => {});
    await assert.rejects(FTPVO.persist(info("stale", "ftp"), false, epoch), /Configuration changed/);
    assert.equal(FTPVO.verify("stale"), false);
});

function sshFixture() {
    const clients = [];
    const warnings = [];
    class Client extends EventEmitter {
        constructor() { super(); clients.push(this); this.destroyed = false; this.sftpCalls = 0; }
        connect() { setImmediate(() => { if (!this.destroyed) this.emit("ready"); }); }
        sftp(callback) { this.sftpCalls++; setImmediate(() => callback(null, {})); }
        end() { this.emit("end"); }
        destroy() { this.destroyed = true; }
    }
    const credentials = { sanitize: x => structuredClone(x), hydrate: async x => x };
    const { SSHConn } = load("src/connections/ssh-connection.js", {
        "../ui/console.js": { Console: { ...quiet, warn: message => warnings.push(message) } },
        ssh2: { Client }, "../services/ssh-credential-service.js": { SSHCredentialService: credentials },
        "../services/ssh-hostkey-service.js": { SSHHostKeyService: { createVerifier: () => ({}) } },
        "../models/ssh-model.js": { SSHVO: { get: () => ({ ssh: null }) } },
    });
    return { SSHConn, clients, credentials, warnings };
}
test("SFTP folder deletion reports operation context instead of a bare Failure", async () => {
    const { SSHConn, warnings } = sshFixture();
    SSHConn.get = async () => ({ sftp: { lstat: (remote, callback) => callback(Object.assign(new Error("Failure"), { code: 4 })) } });
    assert.equal(await SSHConn.rmdir(info(), "/data/folder"), false);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /SFTP removeDirectory/);
    assert.match(warnings[0], /\/data\/folder/);
    assert.match(warnings[0], /code=4/);
    assert.match(warnings[0], /Some contents may already/);
});

test("repeated directory permission errors notify once and rearm on refresh, success or reconnect", async () => {
    const { SSHConn, warnings } = sshFixture(); let denied = true, calls = 0;
    SSHConn.get = async () => ({ sftp: { readdir(remote, callback) {
        calls++;
        callback(denied ? Object.assign(new Error("Permission denied"), { code: 3 }) : null, denied ? undefined : []);
    } } });
    assert.equal(await SSHConn.list(info(), "/root/"), null);
    assert.equal(await SSHConn.list(info(), "/root"), null);
    SSHConn.clearListCache(info());
    assert.equal(await SSHConn.list(info(), "/root/"), null);
    assert.equal(warnings.length, 1); assert.equal(calls, 3, "failed listings must still be retried");
    await SSHConn.list(info(), "/private"); await SSHConn.list(info("other"), "/root/");
    assert.equal(warnings.length, 3, "different paths/connections notify independently");
    SSHConn.resetListErrors(info()); await SSHConn.list(info(), "/root/");
    assert.equal(warnings.length, 4);
    denied = false; assert.equal((await SSHConn.list(info(), "/root/")).length, 0);
    denied = true; SSHConn.clearListCache(info()); await SSHConn.list(info(), "/root/");
    assert.equal(warnings.length, 5);
    SSHConn.closeSSH(info()); await SSHConn.list(info(), "/root/"); assert.equal(warnings.length, 6);
    SSHConn.resetListErrors(); assert.equal(SSHConn.listErrors.size, 0);
});

test("directory notification deduplication preserves changed failures and explicit write errors", async () => {
    const { SSHConn, warnings } = sshFixture(); let message = "Permission denied";
    SSHConn.get = async () => ({ sftp: {
        readdir(remote, callback) { callback(Object.assign(new Error(message), { code: 3 })); },
        unlink(remote, callback) { callback(Object.assign(new Error("Permission denied"), { code: 3 })); },
    } });
    await SSHConn.list(info(), "/root/"); message = "Permission denied by ACL";
    await SSHConn.list(info(), "/root/"); assert.equal(warnings.length, 2);
    await SSHConn.delete(info(), "/root/file"); await SSHConn.delete(info(), "/root/file");
    assert.equal(warnings.length, 4, "deliberate write operations must always report failures");
});

function remoteTree() {
    const entries = new Map(Object.entries({
        "/data": "directory", "/data/.hidden": "file", "/data/nested": "directory",
        "/data/nested/file.txt": "file", "/data/space ; name": "file", "/data/link": "link",
        "/outside": "directory", "/outside/keep": "file",
    }));
    const removed = [];
    const kind = async target => {
        if (!entries.has(target)) throw Object.assign(new Error("No such file"), { code: 2 });
        return entries.get(target);
    };
    const names = target => [...entries.keys()].filter(key => path.posix.dirname(key) === target).map(key => path.posix.basename(key));
    const unlink = async target => { assert.notEqual(entries.get(target), "directory"); entries.delete(target); removed.push(target); };
    const rmdir = async target => { assert.equal(names(target).length, 0, "children must be removed first"); entries.delete(target); removed.push(target); };
    return { entries, removed, kind, names, unlink, rmdir, list: async target => [".", "..", ...names(target)], close() {} };
}

test("recursive deletion includes hidden files, deletes children first and never follows symlinks", async () => {
    const tree = remoteTree();
    const { removeRemoteDirectory } = require("../src/utils/remote-directory-delete.js");
    assert.equal(await removeRemoteDirectory(tree, "/data"), true);
    assert.equal(tree.removed.at(-1), "/data");
    assert.ok(tree.removed.includes("/data/.hidden"));
    assert.deepEqual([...tree.entries.keys()], ["/outside", "/outside/keep"]);
});

test("recursive deletion rejects roots/traversal and unsafe directory listing names", async () => {
    const { removeRemoteDirectory } = require("../src/utils/remote-directory-delete.js");
    const tree = remoteTree();
    for (const root of ["/", "//", ".", "", "C:/", "/C:/", "/data/..", "/data\nDELE x"]) {
        await assert.rejects(removeRemoteDirectory(tree, root), /Refusing/);
    }
    tree.list = async () => ["../outside", "valid"];
    await assert.rejects(removeRemoteDirectory(tree, "/data"), /Unsafe name/);
    assert.equal(tree.removed.length, 0);
});

test("recursive failures preserve child path/code and stalled requests close the connection", async () => {
    const { removeRemoteDirectory } = require("../src/utils/remote-directory-delete.js");
    const tree = remoteTree();
    tree.unlink = async () => { throw Object.assign(new Error("Permission denied"), { code: 3 }); };
    await assert.rejects(removeRemoteDirectory(tree, "/data"), error => error.code === 3 && error.remotePath === "/data/.hidden" && error.remoteMethod === "unlink");
    let closed = false;
    tree.kind = () => new Promise(() => {}); tree.close = () => { closed = true; };
    await assert.rejects(removeRemoteDirectory(tree, "/data", 10), error => error.code === "ETIMEDOUT" && error.remotePath === "/data");
    assert.equal(closed, true);
});

test("SFTP recursively deletes through lstat/readdir/unlink/rmdir without a shell command", async () => {
    const tree = remoteTree(); const { SSHConn, warnings } = sshFixture();
    const wrap = fn => (target, callback) => Promise.resolve().then(() => fn(target)).then(value => callback(null, value), callback);
    SSHConn.get = async () => ({ sftp: {
        lstat: wrap(async target => { const kind = await tree.kind(target); return { isSymbolicLink: () => kind === "link", isDirectory: () => kind === "directory" }; }),
        readdir: wrap(async target => (await tree.list(target)).map(filename => ({ filename }))),
        unlink: wrap(tree.unlink), rmdir: wrap(tree.rmdir),
    } });
    assert.equal(await SSHConn.rmdir(info(), "/data"), true);
    assert.equal(warnings.length, 0);
    assert.deepEqual([...tree.entries.keys()], ["/outside", "/outside/keep"]);
});

test("FTP recursive deletion holds one queue and leaves symlink targets untouched", async () => {
    const tree = remoteTree(); const warnings = [];
    const { FileType } = require("basic-ftp");
    const { FTPConn } = load("src/connections/ftp-connection.js", {
        "../ui/console.js": { Console: { ...quiet, warn: msg => warnings.push(msg) } },
        "../models/ftp-model.js": { FTPVO: { title: () => "ftp" } },
        "../services/ftp-credential-service.js": { FTPCredentialService: {} },
    });
    const queue = new AsyncQueue(); let active = 0, maximum = 0;
    const wrap = fn => async (...args) => { active++; maximum = Math.max(maximum, active); try { await tick(); return await fn(...args); } finally { active--; } };
    const raw = { pwd: wrap(async () => "/"),
        list: wrap(async target => tree.names(target).map(name => ({ name, type: { directory: FileType.Directory, file: FileType.File, link: FileType.SymbolicLink }[tree.entries.get(path.posix.join(target, name))] }))),
        remove: wrap(tree.unlink), removeEmptyDir: wrap(tree.rmdir),
    };
    FTPConn.get = async () => ({ client: { run: action => queue.run(() => action(raw)) } });
    const deleting = FTPConn.rmdir(info("ftp", "ftp"), "data");
    await tick();
    const listing = FTPConn.list(info("ftp", "ftp"), "/outside");
    assert.equal(await deleting, true); await listing;
    assert.equal(maximum, 1); assert.equal(warnings.length, 0);
    assert.deepEqual([...tree.entries.keys()], ["/outside", "/outside/keep"]);
    raw.remove = wrap(async () => { throw Object.assign(new Error("Permission denied"), { code: 550 }); });
    assert.equal(await FTPConn.rmdir(info("ftp", "ftp"), "/outside"), false);
    assert.match(warnings[0], /\/outside\/keep/);
    assert.match(warnings[0], /Permission denied \[code=550\]/);
});

test("operation notifications provide a details dialog with the full message", async () => {
    const calls = [];
    const { Console } = load("src/ui/console.js", {
        vscode: { window: { createOutputChannel: () => ({ appendLine() {}, hide() {} }), showWarningMessage: async (...args) => { calls.push(args); return calls.length === 1 ? "Show Details" : undefined; } } },
        "./localize.js": { default: translate() },
        "../storage/storage.js": { Storage: { get_status_keys: () => ({}) } },
        "../utils/file-manager.js": {},
    });
    Console.warn("Failed entry: /data/private\nPermission denied [code=3]", true);
    await tick();
    assert.equal(calls.length, 2);
    assert.equal(calls[1][1].modal, true);
    assert.match(calls[1][1].detail, /Permission denied \[code=3\]/);
});

test("SFTP and FTP folder deletion requires explicit recursive confirmation and refreshes partial failures", async () => {
    for (const kind of ["ssh", "ftp"]) {
        const relative = `src/api/${kind}-api.js`;
        const source = fs.readFileSync(path.resolve(__dirname, "..", relative), "utf8");
        const mocks = {};
        for (const match of source.matchAll(/require\("([^"]+)"\)/g)) mocks[match[1]] = {};
        let choice, deletes = 0, refreshes = 0; const dialogs = [];
        const constants = require("../src/shared/constants.js");
        mocks.vscode = { window: { showWarningMessage: async (...args) => { dialogs.push(args); return choice; }, showQuickPick: async () => { throw new Error("Folder confirmation must use a modal warning"); } } };
        mocks["../ui/localize.js"] = { default: translate() };
        mocks["../ui/console.js"] = { Console: quiet };
        mocks["../shared/constants.js"] = constants;
        mocks["../utils/path-guard.js"] = require("../src/utils/path-guard.js");
        mocks["./core-api.js"] = { API: { refresh: () => refreshes++ } };
        mocks[`../connections/${kind}-connection.js`] = { [kind === "ssh" ? "SSHConn" : "FTPConn"]: { rmdir: async () => { deletes++; return false; } } };
        const api = load(relative, mocks)[kind === "ssh" ? "SSHAPI" : "FTPAPI"];
        const node = { contextValue: constants.NodeType[kind === "ssh" ? "SSH_FOLDER" : "FTP_FOLDER"], name: "data", fullPath: "/data", info: { [kind]: info() } };
        await api.file_delete(node);
        assert.equal(deletes, 0);
        assert.equal(dialogs[0][1].modal, true);
        assert.match(dialogs[0][1].detail, /All subdirectories, files and hidden files/);
        choice = translate()("sshtool.yes");
        await api.file_delete(node);
        assert.equal(deletes, 1); assert.equal(refreshes, 1);
    }
});
test("SSH shares pending connections and upgrades a shared client to SFTP once", async () => {
    const { SSHConn, clients } = sshFixture();
    const pair = await Promise.all([SSHConn.get(info(), false), SSHConn.get(info(), false)]);
    assert.equal(clients.length, 1); assert.equal(pair[0].client, pair[1].client);
    await Promise.all([SSHConn.get(info()), SSHConn.get(info())]); assert.equal(clients[0].sftpCalls, 1);
    await SSHConn.closeSSH(info()); assert.equal(clients[0].destroyed, true);
});
test("an old SSH close event cannot destroy a replacement connection", async () => {
    const { SSHConn } = sshFixture(); const first = await SSHConn.get(info(), false);
    const changed = info(); changed.ssh.host = "different";
    const replacement = await SSHConn.get(changed, false);
    first.client.emit("end"); first.client.emit("close");
    assert.equal(replacement.client.destroyed, false);
    assert.equal(SSHConn.activeConn.ssh.client, replacement.client);
    SSHConn.closeAll();
});
test("closing a pending SSH connect prevents it from connecting after credential hydration", async () => {
    const { SSHConn, clients, credentials } = sshFixture(); const gate = deferred(); credentials.hydrate = () => gate.promise;
    const task = SSHConn.get(info(), false); await SSHConn.closeSSH(info());
    await assert.rejects(task, /cancelled/); gate.resolve(info()); await tick();
    assert.equal(clients[0].destroyed, true); assert.equal(Object.keys(SSHConn.activeConn).length, 0);
});
test("fresh SSH tests do not close or reuse the live connection", async () => {
    const { SSHConn } = sshFixture(); const live = await SSHConn.get(info(), false);
    const fresh = await SSHConn.get(info(), false, null, true);
    assert.notEqual(live.client, fresh.client); fresh.client.end(); fresh.client.destroy();
    assert.equal(live.client.destroyed, false); assert.equal(Object.keys(SSHConn.activeConn).length, 1);
    SSHConn.closeAll();
});
test("SSH operation connection failures settle instead of leaking an async executor rejection", async () => {
    const { SSHConn } = sshFixture(); SSHConn.get = async () => { throw new Error("connect failed"); };
    assert.equal(await SSHConn.rename(info(), "a", "b"), false);
});

test("FTP operations serialize on one deduplicated connection", async () => {
    const clients = []; let running = 0, max = 0;
    class Client {
        constructor() { clients.push(this); this.closed = false; }
        async access() { await tick(); }
        close() { this.closed = true; }
        async action() { running++; max = Math.max(max, running); await tick(); running--; }
        async uploadFrom() { await this.action(); }
        async list() { await this.action(); return []; }
    }
    const { FTPConn } = load("src/connections/ftp-connection.js", {
        "basic-ftp": { Client, FileType: {} }, "../models/ftp-model.js": { FTPVO: { title: () => "ftp" } },
        "../services/ftp-credential-service.js": { FTPCredentialService: { hydrate: async x => x, sanitize: x => x } },
    });
    const pair = await Promise.all([FTPConn.get(info("ftp", "ftp")), FTPConn.get(info("ftp", "ftp"))]);
    assert.equal(clients.length, 1); assert.equal(pair[0], pair[1]);
    await Promise.all([FTPConn.put(info("ftp", "ftp"), "local", "remote"), FTPConn.list(info("ftp", "ftp"), "/")]);
    assert.equal(max, 1); FTPConn.closeAll(); assert.equal(clients[0].closed, true);
});
test("queued operations are rejected after close and failures do not poison the queue", async () => {
    const queue = new AsyncQueue(); await assert.rejects(queue.run(() => { throw new Error("first"); }), /first/);
    assert.equal(await queue.run(() => 42), 42);
    const gate = deferred(); const first = queue.run(() => gate.promise);
    await tick(); const second = queue.run(() => 99); queue.close(); gate.resolve(); await first;
    await assert.rejects(second, /closed/); assert.equal(queue.size, 0);
});

test("clear waits for in-flight saves and rejects saves submitted while clearing", async () => {
    const { ConfigMutation } = require("../src/services/config-mutation.js");
    const gate = deferred(); const actions = [];
    const saving = ConfigMutation.run(async () => { await gate.promise; actions.push("saved"); });
    const clearing = ConfigMutation.clear(async () => { actions.push("cleared"); });
    await assert.rejects(ConfigMutation.run(() => actions.push("late")), /cleared/);
    gate.resolve(); await saving; await clearing;
    assert.deepEqual(actions, ["saved", "cleared"]);
    assert.equal(ConfigMutation.clearing, false);
});

function transferFixture(sftp, localFs = fs) {
    const listeners = new Set(); let disposed = 0;
    const token = { isCancellationRequested: false, onCancellationRequested(fn) { listeners.add(fn); return { dispose() { listeners.delete(fn); disposed++; } }; } };
    const { TransferService } = load("src/services/transfer-service.js", {
        "fs-extra": localFs,
        vscode: { ProgressLocation: { Notification: 1 }, window: { withProgress: (options, callback) => callback({ report() {} }, token) } },
        "../connections/ssh-connection.js": { SSHConn: { get: async () => ({ sftp }), clearListCache() {} } },
        "../connections/ftp-connection.js": { FTPConn: {} },
    });
    return { TransferService, token, cancel() { for (const fn of listeners) fn(); }, get disposed() { return disposed; } };
}

test("only remote write denials carry the sudo retry marker", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-permission-"));
    const local = path.join(root, "source");
    try {
        await fs.writeFile(local, "data");
        for (const code of [3, 4, "EACCES", "ENOSPC"]) {
            const fixture = transferFixture({ createWriteStream() {
                const stream = new PassThrough();
                setImmediate(() => stream.destroy(Object.assign(new Error(code === 3 ? "Permission denied" : "Failure"), { code })));
                return stream;
            } });
            await assert.rejects(fixture.TransferService.run("ssh", info(), local, "/remote", true, "save", 4, { throwOnError: true }), error => {
                assert.equal(error.remoteWriteDenied === true, code === 3 || code === "EACCES"); return true;
            });
        }
        const missing = transferFixture({ createWriteStream: () => new PassThrough() });
        await assert.rejects(missing.TransferService.run("ssh", info(), local + ".missing", "/remote", true, "save", 4, { throwOnError: true }),
            error => error.code === "ENOENT" && !error.remoteWriteDenied);
        const localDenied = transferFixture({ createWriteStream: () => new PassThrough() }, {
            ...fs, createReadStream() {
                const stream = new PassThrough();
                setImmediate(() => stream.destroy(Object.assign(new Error("Permission denied"), { code: "EACCES" })));
                return stream;
            },
        });
        await assert.rejects(localDenied.TransferService.run("ssh", info(), local, "/remote", true, "save", 4, { throwOnError: true }),
            error => error.code === "EACCES" && !error.remoteWriteDenied);
    } finally { await fs.remove(root); }
});

function remoteSaveFixture(records, transfer, choice, linux = true, options = {}) {
    const prompts = [], elevations = [], errors = [], messages = []; let activeProgress = 0;
    const { RemoteFileService } = load("src/services/remote-file-service.js", {
        vscode: { ProgressLocation: { Notification: 1 }, window: {
            showWarningMessage: async (message, button) => { prompts.push(message); return choice ? button : undefined; },
            withProgress: async (options, callback) => {
                activeProgress++;
                try { return await callback(); } finally { activeProgress--; }
            },
            setStatusBarMessage: (message, timeout) => {
                assert.equal(activeProgress, 0, "success notification must follow progress completion");
                assert.equal(timeout, 3000, "success status must disappear after three seconds");
                messages.push(message);
                return { dispose() {} };
            },
            showInformationMessage: () => { throw new Error("save success must not create a persistent notification"); },
        } },
        "../storage/storage.js": { Storage: {
            normalize_temp_file_path: value => value, get_temp_file_remote: value => records[value],
            touch_temp_file_remote: (value, patch) => Object.assign(records[value], patch),
        } },
        "../utils/settings.js": { Settings: {} }, "../utils/file-manager.js": { FileManager: {} },
        "../ui/localize.js": { default: translate(".zh-cn") }, "../ui/console.js": { Console: { ...quiet, err: error => errors.push(error) } },
        "./transfer-service.js": { TransferService: { run: transfer } },
        "./sudo-save-service.js": { SudoSaveService: {
            isLinux: async () => linux, save: async (...args) => { elevations.push(args); return true; },
        } },
        "../models/ssh-model.js": { SSHVO: { get: () => ({ ssh: info() }) } },
        "../models/ftp-model.js": { FTPVO: { get: () => ({ ftp: info("ftp", "ftp") }) } },
        "../api/core-api.js": { API: { refresh() {} } },
    });
    return { RemoteFileService, prompts, elevations, errors, messages, get activeProgress() { return activeProgress; } };
}

test("sudo authorization is per file and per save; normal saves and FTP never inherit it", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-save-"));
    const first = path.join(root, "first"), second = path.join(root, "second");
    try {
        await fs.writeFile(first, "first"); await fs.writeFile(second, "second");
        const records = { [first]: { ssh: info(), remote: "/first", hash: "old" }, [second]: { ssh: info(), remote: "/second", hash: "old" } };
        let attempts = 0;
        const fixture = remoteSaveFixture(records, async () => { attempts++; throw Object.assign(new Error("Permission denied"), { remoteWriteDenied: true }); }, true);
        assert.equal(await fixture.RemoteFileService.save("ssh", first), true);
        assert.equal(await fixture.RemoteFileService.save("ssh", second), true);
        await fs.writeFile(first, "first changed");
        assert.equal(await fixture.RemoteFileService.save("ssh", first), true);
        assert.equal(attempts, 3); assert.equal(fixture.prompts.length, 3);
        assert.deepEqual(fixture.elevations.map(args => args[2]), ["/first", "/second", "/first"]);
        assert.equal(records[first].sudo, undefined); assert.equal(records[second].sudo, undefined);
        records[first].hash = "old";
        const ordinary = remoteSaveFixture(records, async () => true, true);
        assert.equal(await ordinary.RemoteFileService.save("ssh", first), true); assert.equal(ordinary.prompts.length, 0);
        records[first] = { ftp: info("ftp", "ftp"), remote: "/first", hash: "old" };
        const ftp = remoteSaveFixture(records, async () => false, true);
        assert.equal(await ftp.RemoteFileService.save("ftp", first), false); assert.equal(ftp.prompts.length, 0);
        assert.deepEqual((await fs.readdir(root)).sort(), ["first", "second"]);
    } finally { await fs.remove(root); }
});

test("declining sudo or unrelated save errors preserve the local edits and saved hash", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-save-")); const local = path.join(root, "file");
    try {
        await fs.writeFile(local, "changes");
        for (const denied of [true, false]) {
            const records = { [local]: { ssh: info(), remote: "/file", hash: "old" } };
            const fixture = remoteSaveFixture(records, async () => { throw Object.assign(new Error(denied ? "Permission denied" : "Connection lost"), { remoteWriteDenied: denied }); }, false);
            assert.equal(await fixture.RemoteFileService.save("ssh", local), false);
            assert.equal(fixture.elevations.length, 0); assert.equal(fixture.prompts.length, denied ? 1 : 0);
            assert.equal(records[local].hash, "old"); assert.equal(await fs.readFile(local, "utf8"), "changes");
        }
    } finally { await fs.remove(root); }
});

function sudoFixture(options = {}) {
    const commands = [], inputs = [], removed = [], errors = [], credentialReads = [], passwordPrompts = [], debug = []; let dialogs = 0, writes = 0;
    const sftp = {
        realpath: (remote, callback) => callback(null, remote),
        lstat: (remote, callback) => callback(null, { isFile: () => true, mode: 0o100640 }),
        fastPut: (local, remote, attrs, callback) => { assert.equal(attrs.mode, 0o600); callback(null); },
        unlink: (remote, callback) => { removed.push(remote); callback(null); },
        rmdir: (remote, callback) => { removed.push(remote); callback(null); },
    };
    const client = { exec(command, callback) {
        commands.push(command);
        const channel = new EventEmitter(); channel.stderr = new EventEmitter();
        channel.destroy = () => channel.emit("close");
        channel.end = input => {
            inputs.push(input);
            setImmediate(() => {
                if ((options.hang && command.includes("cp --")) || (options.hangBackup && command.includes("cp -p --"))) return;
                if (options.hangCleanup && command.startsWith("rm -f --")) return;
                let code = 0, out = "", err = "";
                if (command === "uname -s") { code = options.probeError ? 1 : 0; out = (options.os || "Linux") + "\n"; }
                else if (command.includes("mktemp")) out = "/tmp/sshtools2-save.ABC123\n";
                else if (command.startsWith("rm -f --")) removed.push("/tmp/sshtools2-save.ABC123/content", "/tmp/sshtools2-save.ABC123/original", "/tmp/sshtools2-save.ABC123");
                else if (options.password && command.includes("sudo -k -n")) { code = 1; err = "sudo: a password is required"; }
                else if (options.rejectSaved && command.includes("sudo -k -S") && input === "stored-password\n") {
                    code = 1; err = "Sorry, try again. " + input;
                }
                else if (command.includes("cp --")) {
                    writes++;
                    if (options.failWrite) { code = 1; err = "write failed"; }
                } else if (options.failRestore && /cp -p --.*\/original' '\/etc\/file'/.test(command)) { code = 1; err = "restore failed"; }
                else if (options.wrongPassword && command.includes("sudo -k -S")) { code = 1; err = "Sorry, try again. " + input; }
                if (out) channel.emit("data", Buffer.from(out));
                if (err) channel.stderr.emit("data", Buffer.from(err));
                channel.emit("close", code);
            });
        };
        callback(null, channel);
    } };
    const { SudoSaveService } = load("src/services/sudo-save-service.js", {
        vscode: { window: { showInputBox: async opts => { dialogs++; passwordPrompts.push(opts.prompt); assert.equal(opts.password, true); return options.cancel ? undefined : "test-only-password"; },
            showInformationMessage: options.holdNotification ? () => new Promise(() => {}) : async () => {},
        } },
        "../connections/ssh-connection.js": { SSHConn: { get: async () => ({ client, sftp }), clearListCache() {} } },
        "./ssh-credential-service.js": { SSHCredentialService: options.credentialService || { getLoginPassword: async record => {
            credentialReads.push(record.id);
            return record.ssh.password || (options.passwords && options.passwords[record.id]) || options.savedPassword || "";
        } } },
        "../ui/localize.js": { default: translate(".zh-cn") },
        "../ui/console.js": { Console: { ...quiet, err: error => errors.push(error.message), debug: message => debug.push(message) } },
    });
    return { SudoSaveService, commands, inputs, removed, errors, credentialReads, passwordPrompts, debug, get dialogs() { return dialogs; }, get writes() { return writes; } };
}

test("sudo reuses only the target login password and falls back when it is rejected", async () => {
    const saved = sudoFixture({ password: true, passwords: { first: "first-secret", second: "second-secret" } });
    assert.equal(await saved.SudoSaveService.save(info("first"), "local", "/etc/first"), true);
    assert.equal(await saved.SudoSaveService.save(info("second"), "local", "/etc/second"), true);
    assert.equal(saved.dialogs, 0); assert.deepEqual(saved.credentialReads, ["first", "second"]);
    assert.ok(saved.inputs.includes("first-secret\n")); assert.ok(saved.inputs.includes("second-secret\n"));
    assert.ok(saved.commands.every(command => !/first-secret|second-secret/.test(command)));
    const rejected = sudoFixture({ password: true, savedPassword: "stored-password", rejectSaved: true });
    assert.equal(await rejected.SudoSaveService.save(info(), "local", "/etc/file"), true);
    assert.equal(rejected.dialogs, 1); assert.ok(rejected.inputs.includes("stored-password\n"));
    assert.match(rejected.passwordPrompts[0], /拒绝了当前连接/);
    assert.ok(rejected.inputs.includes("test-only-password\n")); assert.equal(rejected.errors.length, 0);
    const keyed = sudoFixture({ password: true, privateKey: "private-key-test", passphrase: "key-passphrase-test" });
    assert.equal(await keyed.SudoSaveService.save(info(), "local", "/etc/file"), true);
    assert.equal(keyed.dialogs, 1); assert.ok(keyed.inputs.every(value => !/private-key-test|key-passphrase-test/.test(value || "")));
    assert.match(keyed.passwordPrompts[0], /未读取到当前连接/);
    const passwordless = sudoFixture({ savedPassword: "stored-password" });
    assert.equal(await passwordless.SudoSaveService.save(info(), "local", "/etc/file"), true);
    assert.equal(passwordless.credentialReads.length, 0);
});

test("only confirmed Linux targets offer sudo; other platforms and probe failures do not elevate", async () => {
    for (const os of ["Darwin", "FreeBSD", "Windows_NT"]) {
        const fixture = sudoFixture({ os });
        assert.equal(await fixture.SudoSaveService.save(info(), "local", "/etc/file"), false);
        assert.deepEqual(fixture.commands, ["uname -s"]); assert.equal(fixture.credentialReads.length, 0);
    }
    const probeFailed = sudoFixture({ probeError: true });
    assert.equal(await probeFailed.SudoSaveService.isLinux(info()), false);
    const configuredWindows = sudoFixture(); const windows = info(); windows.ssh.ostype = "Windows_NT";
    assert.equal(await configuredWindows.SudoSaveService.isLinux(windows), false); assert.equal(configuredWindows.commands.length, 0);
    const ubuntu = sudoFixture(); const linux = info(); linux.ssh.ostype = "ubuntu";
    assert.equal(await ubuntu.SudoSaveService.isLinux(linux), true);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-linux-")); const local = path.join(root, "file");
    try {
        await fs.writeFile(local, "changes");
        const fixture = remoteSaveFixture({ [local]: { ssh: info(), remote: "/file", hash: "old" } },
            async () => { throw Object.assign(new Error("Permission denied"), { remoteWriteDenied: true }); }, true, false);
        assert.equal(await fixture.RemoteFileService.save("ssh", local), false);
        assert.equal(fixture.prompts.length, 0); assert.equal(fixture.elevations.length, 0);
    } finally { await fs.remove(root); }
});

test("sudo cp saves verify content, clean private files and never reuse passwords across files", async () => {
    const fixture = sudoFixture({ password: true });
    const target = "/etc/file'$(touch bad)";
    assert.equal(await fixture.SudoSaveService.save(info(), "local", target), true);
    assert.equal(await fixture.SudoSaveService.save(info(), "local", "/etc/second"), true);
    assert.equal(fixture.dialogs, 2); assert.equal(fixture.writes, 2);
    assert.equal(fixture.commands.filter(command => command.includes("sudo -k -n")).length, 2);
    assert.ok(fixture.commands.some(command => command.includes("cp --") && command.includes("'\\''")));
    assert.ok(fixture.commands.some(command => command.includes("cmp --")));
    assert.ok(fixture.commands.every(command => !command.includes("test-only-password")));
    assert.ok(fixture.commands.filter(command => command.includes("sudo")).every(command => command.includes("sudo -k")));
    await tick();
    assert.equal(fixture.removed.length, 6); assert.equal(fixture.errors.length, 0);
});

test("passwordless sudo and password cancellation do not write credentials or unwanted targets", { timeout: 1000 }, async () => {
    const passwordless = sudoFixture({ holdNotification: true });
    assert.equal(await passwordless.SudoSaveService.save(info(), "local", "/etc/file"), true);
    assert.equal(passwordless.dialogs, 0); assert.ok(passwordless.inputs.every(input => input === undefined));
    const cancelled = sudoFixture({ password: true, cancel: true });
    assert.equal(await cancelled.SudoSaveService.save(info(), "local", "/etc/file"), false);
    await tick();
    assert.equal(cancelled.writes, 0); assert.equal(cancelled.removed.length, 3);
    const wrong = sudoFixture({ password: true, wrongPassword: true });
    assert.equal(await wrong.SudoSaveService.save(info(), "local", "/etc/file"), false);
    assert.equal(wrong.writes, 0); assert.ok(wrong.errors.every(message => !message.includes("test-only-password")));
});

test("confirmed sudo write failures restore backups; unknown completion retains recovery files", async () => {
    const failed = sudoFixture({ failWrite: true });
    assert.equal(await failed.SudoSaveService.save(info(), "local", "/etc/file"), false);
    await tick();
    assert.ok(failed.commands.some(command => /cp -p --.*\/original' '\/etc\/file'/.test(command)));
    assert.match(failed.errors[0], /已恢复/); assert.equal(failed.removed.length, 3);
    const unknown = sudoFixture({ hang: true }); unknown.SudoSaveService.timeout = 25;
    assert.equal(await unknown.SudoSaveService.save(info(), "local", "/etc/file"), false);
    assert.equal(unknown.removed.length, 0); assert.match(unknown.errors[0], /\/tmp\/sshtools2-save.ABC123\/original/);
    const unsafe = sudoFixture();
    assert.equal(await unsafe.SudoSaveService.save(info(), "local", "/etc/../file"), false);
    assert.equal(unsafe.commands.length, 0);
    const restoreFailed = sudoFixture({ failWrite: true, failRestore: true });
    assert.equal(await restoreFailed.SudoSaveService.save(info(), "local", "/etc/file"), false);
    assert.equal(restoreFailed.removed.length, 0); assert.match(restoreFailed.errors[0], /原文件备份保留/);
    const backupUnknown = sudoFixture({ hangBackup: true }); backupUnknown.SudoSaveService.timeout = 25;
    assert.equal(await backupUnknown.SudoSaveService.save(info(), "local", "/etc/file"), false);
    assert.equal(backupUnknown.removed.length, 0); assert.equal(backupUnknown.writes, 0);
    assert.match(backupUnknown.errors[0], /临时目录保留/);
});

test("saved passwords are read directly from SecretStorage even with key fields in the target configuration", async () => {
    const { SSHCredentialService } = require("../src/services/ssh-credential-service.js");
    const { CredentialService } = require("../src/services/credential-service.js");
    const previous = CredentialService.context, reads = [];
    CredentialService.init({ secrets: { get: async key => {
        reads.push(key);
        return key === "sshtools:ssh:target:password" ? "saved-target-password" : undefined;
    } } });
    try {
        const target = info("target"); target.ssh.privateKey = "key-field-test";
        const fixture = sudoFixture({ password: true, credentialService: SSHCredentialService });
        assert.equal(await fixture.SudoSaveService.save(target, "local", "/etc/one"), true);
        assert.equal(await fixture.SudoSaveService.save(target, "local", "/etc/two"), true);
        assert.equal(fixture.dialogs, 0);
        assert.deepEqual(reads, ["sshtools:ssh:target:password", "sshtools:ssh:target:password"]);
        assert.ok(fixture.inputs.includes("saved-target-password\n"));
        assert.ok(fixture.commands.every(command => !command.includes("saved-target-password")));
    } finally { CredentialService.init(previous); }
});

test("confirmed saves release progress and queues with transient status even when cleanup stalls", { timeout: 1000 }, async () => {
    const stalled = sudoFixture({ hangCleanup: true }); stalled.SudoSaveService.cleanupTimeout = 30;
    assert.equal(await stalled.SudoSaveService.save(info(), "local", "/etc/file"), true);
    assert.equal(stalled.removed.length, 0);
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(stalled.debug.length, 1); assert.equal(stalled.errors.length, 0);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-progress-")), local = path.join(root, "file");
    try {
        await fs.writeFile(local, "first");
        const records = { [local]: { ssh: info(), remote: "/file", hash: "old" } };
        const fixture = remoteSaveFixture(records, async () => { throw Object.assign(new Error("Permission denied"), { remoteWriteDenied: true }); }, true, true, { holdNotification: true });
        assert.equal(await fixture.RemoteFileService.save("ssh", local), true);
        assert.equal(fixture.activeProgress, 0); assert.equal(fixture.messages.length, 1);
        await fs.writeFile(local, "second");
        assert.equal(await fixture.RemoteFileService.save("ssh", local), true);
        assert.equal(fixture.activeProgress, 0); assert.equal(fixture.messages.length, 2);
        assert.equal(fixture.RemoteFileService.saveQueues.size, 0);
        assert.equal(records[local].hash, await fixture.RemoteFileService.hash(local));
    } finally { await fs.remove(root); }
});

test("synchronous sudo channel and SFTP failures settle without leaving timeout timers", async () => {
    const fixture = sudoFixture();
    await assert.rejects(fixture.SudoSaveService.exec({ exec() { throw new Error("Not connected"); } }, "test"), /Not connected/);
    await assert.rejects(fixture.SudoSaveService.call({ lstat() { throw new Error("Not connected"); } }, "lstat", "/file"), /Not connected/);
});

test("sudo executor sends secrets only through stdin and reads real SSH channel exit status", async () => {
    const { Server, Client } = require("ssh2");
    const { privateKey } = require("crypto").generateKeyPairSync("rsa", {
        modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" },
        publicKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    const requests = [];
    const server = new Server({ hostKeys: [privateKey] }, connection => {
        connection.on("error", () => {});
        connection.on("authentication", context => context.accept());
        connection.on("ready", () => connection.on("session", accept => {
            accept().on("exec", (acceptExec, rejectExec, request) => {
                const channel = acceptExec(); let input = "";
                channel.on("data", data => { input += data.toString("utf8"); });
                channel.on("end", () => {
                    requests.push({ command: request.command, input });
                    if (request.command === "success") {
                        const output = Buffer.from("测试输出");
                        channel.write(output.subarray(0, 1)); channel.write(output.subarray(1));
                        channel.exit(0);
                    } else { channel.stderr.write("Permission denied"); channel.exit(3); }
                    channel.end();
                });
            });
        }));
    });
    const client = new Client();
    try {
        await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
        await new Promise((resolve, reject) => {
            client.once("ready", resolve); client.once("error", reject);
            client.connect({ host: "127.0.0.1", port: server.address().port, username: "test-only", hostVerifier: () => true });
        });
        const fixture = sudoFixture();
        const success = await fixture.SudoSaveService.exec(client, "success", "test-only-password");
        assert.equal(success.code, 0); assert.equal(success.stdout, "测试输出");
        const failure = await fixture.SudoSaveService.exec(client, "denied");
        assert.equal(failure.code, 3); assert.equal(failure.stderr, "Permission denied");
        assert.deepEqual(requests, [{ command: "success", input: "test-only-password\n" }, { command: "denied", input: "" }]);
    } finally {
        client.end(); client.destroy();
        await new Promise(resolve => server.close(resolve));
    }
});
test("downloads complete atomically and errors preserve the previous local file", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-test-")); const local = path.join(root, "target");
    try {
        await fs.writeFile(local, "previous");
        const fail = transferFixture({ createReadStream() { const stream = new PassThrough(); setImmediate(() => stream.destroy(new Error("download failed"))); return stream; } });
        assert.equal(await fail.TransferService.run("ssh", info(), local, "/remote", false, "test"), false);
        assert.equal(await fs.readFile(local, "utf8"), "previous"); assert.deepEqual(await fs.readdir(root), ["target"]);
        const success = transferFixture({ createReadStream() { const stream = new PassThrough(); setImmediate(() => stream.end("complete")); return stream; } });
        assert.equal(await success.TransferService.run("ssh", info(), local, "/remote", false, "test", 8), true);
        assert.equal(await fs.readFile(local, "utf8"), "complete"); assert.equal(success.disposed, 1);
    } finally { await fs.remove(root); }
});
test("cancelled and stalled transfers settle and destroy streams", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-test-"));
    try {
        let stream; const fixture = transferFixture({ createReadStream() { stream = new PassThrough(); return stream; } });
        const task = fixture.TransferService.run("ssh", info(), path.join(root, "cancelled"), "/remote", false, "test");
        while (!stream) await tick(); fixture.cancel(); assert.equal(await task, false); assert.equal(stream.destroyed, true);
        const stalled = transferFixture({ createReadStream() { return new PassThrough(); } }); stalled.TransferService.idleTimeout = 20;
        assert.equal(await stalled.TransferService.run("ssh", info(), path.join(root, "stalled"), "/remote", false, "test"), false);
        assert.deepEqual(await fs.readdir(root), []);
    } finally { await fs.remove(root); }
});
test("failed uploads settle and cancellation before start creates no remote stream", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-test-")); const local = path.join(root, "source");
    try {
        await fs.writeFile(local, "data"); let opened = 0;
        const fixture = transferFixture({ createWriteStream() { opened++; const stream = new PassThrough(); setImmediate(() => stream.destroy(new Error("upload failed"))); return stream; } });
        assert.equal(await fixture.TransferService.run("ssh", info(), local, "/remote", true, "test"), false);
        const cancelled = transferFixture({ createWriteStream() { opened++; return new PassThrough(); } }); cancelled.token.isCancellationRequested = true;
        assert.equal(await cancelled.TransferService.run("ssh", info(), local, "/remote", true, "test"), false); assert.equal(opened, 1);
    } finally { await fs.remove(root); }
});

test("background status updates use latest records and do not resurrect deleted children", async () => {
    const probe = deferred(), processes = deferred();
    const sshs = { ssh: info() }, forwards = { f: { id: "f", name: "old", status: false } }, remotes = { r: { id: "r", name: "old", status: false } };
    const model = items => ({ getAll: () => items, get: id => ({ ssh: items[id] }), post(item) { assert.ok(items[item.id]); items[item.id] = item; } });
    const { API } = load("src/api/core-api.js", {
        vscode: {}, "../utils/settings.js": { Settings: { PingHostTime: 3 } }, "../storage/storage.js": { Storage: { get_forwards_server: () => ({ f: { pid: 1 } }), get_rdesktops_server: () => ({ r: { pid: 2 } }) } },
        "../models/ssh-model.js": { SSHVO: model(sshs) }, "../models/ftp-model.js": { FTPVO: { getAll: () => ({}) } },
        "../models/forward-model.js": { ForwardVO: model(forwards) }, "../models/remote-model.js": { RemoteVO: model(remotes) },
        "../utils/get-processes.js": { default: () => processes.promise },
        "../shared/constants.js": { SSHType }, "../storage/base-dt.js": { BaseDT: { flush: async () => {} } },
        "../utils/util.js": {}, "../ui/file-icons.js": {}, "../ui/folder-icons.js": {}, "../ui/localize.js": {},
        "../services/service-manager.js": {}, "../ui/global-status.js": {}, "../models/quick-pick-item.js": {},
        "./ssh-api.js": {}, "./ftp-api.js": {}, "./group-api.js": {}, "./config-api.js": {},
    });
    API.probeTcp = () => probe.promise;
    const task = API.auto_varify_icmp(); assert.equal(API.auto_varify_icmp(), task);
    sshs.ssh = { ...sshs.ssh, group: "vps" }; probe.resolve(false); await tick();
    forwards.f = { ...forwards.f, name: "latest" }; delete remotes.r;
    processes.resolve([{ pid: 1 }]); await task;
    assert.equal(sshs.ssh.group, "vps"); assert.equal(forwards.f.name, "latest"); assert.equal(forwards.f.status, true); assert.equal(remotes.r, undefined);
    let running = 0, maximum = 0;
    for (let i = 0; i < 12; i++) sshs["pool" + i] = info("pool" + i);
    API.probeTcp = async () => { running++; maximum = Math.max(maximum, running); await tick(); running--; return true; };
    await API.auto_varify_icmp(); assert.equal(maximum, 4);
    const delayed = deferred(); API.probeTcp = () => delayed.promise;
    const pending = API.auto_varify_icmp(); const stopped = API.stopVerification();
    delayed.resolve(false); await stopped; await pending;
    assert.equal(sshs.pool0.status, 0, "a cancelled probe must not write a late result");
});

test("cancelling a queued FTP transfer settles without interrupting another task", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-test-"));
    const queue = new AsyncQueue(), gate = deferred(); let downloads = 0, closed = 0, cancel;
    const occupied = queue.run(() => gate.promise); await tick();
    const { TransferService } = load("src/services/transfer-service.js", {
        vscode: { ProgressLocation: { Notification: 1 }, window: { withProgress: (options, callback) => callback({ report() {} },
            { onCancellationRequested(fn) { cancel = fn; return { dispose() {} }; } }) } },
        "../connections/ssh-connection.js": { SSHConn: {} },
        "../connections/ftp-connection.js": { FTPConn: {
            get: async () => ({ client: { run: action => queue.run(() => action({ trackProgress() {}, async downloadTo() { downloads++; } })) } }),
            closeFTP() { closed++; }, clearListCache() {},
        } },
    });
    try {
        const task = TransferService.run("ftp", info("ftp", "ftp"), path.join(root, "file"), "/remote", false, "test");
        await tick(); cancel();
        assert.equal(await task, false); assert.equal(downloads, 0); assert.equal(closed, 0);
        gate.resolve(); await occupied; await tick(); assert.equal(downloads, 0);
    } finally { gate.resolve(); await fs.remove(root); }
});

test("active transfer progress resets its idle timeout", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sshtools-test-"));
    const fixture = transferFixture({ createReadStream() {
        const stream = new PassThrough(); let remaining = 6;
        const timer = setInterval(() => { stream.write("x"); if (!--remaining) { clearInterval(timer); stream.end(); } }, 10);
        stream.on("close", () => clearInterval(timer)); return stream;
    } });
    fixture.TransferService.idleTimeout = 40;
    try { assert.equal(await fixture.TransferService.run("ssh", info(), path.join(root, "file"), "/remote", false, "test", 6), true); }
    finally { await fs.remove(root); }
});

test("runtime cleanup closes live resources before dropping references", async () => {
    const events = []; const fwds = { f: {} }, remotes = { r: {} };
    const SSHConn = { closeAll: () => events.push("ssh") }, FTPConn = { closeAll: () => events.push("ftp") };
    const { RuntimeService } = load("src/services/runtime-service.js", {
        "../utils/runtime-resource.js": { stopResource: async resource => events.push(resource === fwds.f ? "forward" : "remote") },
        "../api/core-api.js": { API: { stopRefresh() {}, stopVerification: async () => events.push("stop probes") } },
        "../storage/storage.js": { Storage: { get_forwards_server: () => fwds, get_rdesktops_server: () => remotes } },
        "../connections/ssh-connection.js": { SSHConn }, "../connections/ftp-connection.js": { FTPConn },
        "./transfer-service.js": { TransferService: { cancelAll: () => events.push("transfers") } },
        "./xterm-terminal.js": { XtermTerminal: { closeAll: () => events.push("terminals") } },
    });
    await RuntimeService.closeAll(); assert.equal(SSHConn.blocked, true); assert.equal(FTPConn.blocked, true);
    assert.deepEqual(Object.keys(fwds), []); assert.deepEqual(Object.keys(remotes), []);
    assert.equal(events[0], "stop probes"); assert.ok(events.includes("forward")); assert.ok(events.includes("remote"));
});
test("server disposal releases its listening port and connected sockets", async () => {
    const net = require("net"); const { stopResource } = require("../src/utils/runtime-resource.js");
    const server = net.createServer(socket => { server.sockets.add(socket); }); server.sockets = new Set();
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const socket = net.createConnection(server.address().port, "127.0.0.1");
    await new Promise(resolve => socket.once("connect", resolve));
    await stopResource(server); assert.equal(server.listening, false); for (const active of server.sockets) assert.equal(active.destroyed, true);
    socket.destroy();
});
test("terminal paths quote shell metacharacters and reject unsafe Windows expansions", () => {
    const { directoryCommand } = require("../src/utils/shell-path.js");
    assert.equal(directoryCommand("/tmp/a; echo x"), "cd -- '/tmp/a; echo x'\n");
    assert.equal(directoryCommand("/tmp/a'b"), "cd -- '/tmp/a'\\''b'\n");
    assert.equal(directoryCommand("/C:/Program Files", true), 'cd /d "C:/Program Files"\r\n');
    assert.throws(() => directoryCommand("C:/%PATH%", true)); assert.throws(() => directoryCommand("/tmp/a\nb"));
});
test("terminal logs are bounded and preserve chunk content without inserted commas", () => {
    const { TerminalLog } = require("../src/utils/terminal-log.js"); const log = new TerminalLog(8);
    log.append("abcd"); log.append("efgh"); assert.equal(log.toString(), "abcdefgh");
    log.append("ijkl"); assert.equal(log.toString(), "efghijkl"); assert.equal(log.bytes, 8);
});
test("terminal sessions have independent IDs and dispose connecting clients", async () => {
    const clients = [];
    class Client extends EventEmitter {
        constructor() { super(); clients.push(this); this.destroyed = false; }
        connect() { setImmediate(() => { if (!this.destroyed) this.emit("ready"); }); }
        shell(options, callback) { const stream = new PassThrough(); stream.setWindow = () => {}; callback(null, stream); }
        end() {}
        destroy() { this.destroyed = true; }
    }
    const { XtermTerminal } = load("src/services/xterm-terminal.js", {
        ssh2: { Client }, vscode: { Uri: { file: x => x } },
        "../ui/view-option.js": {}, "../utils/file-manager.js": {}, "../utils/util.js": { Util: { getExtPath: () => "icon" } },
        "../ui/localize.js": { default: () => "message" }, "../storage/storage.js": { Storage: { get_status_keys: () => ({}) } },
        "../models/ssh-model.js": { SSHVO: { title: () => "same-host" } },
        "../connections/ssh-connection.js": { SSHConn: { openJumpStream: async () => ({ option: {} }) } },
        "./ssh-credential-service.js": { SSHCredentialService: { hydrate: async x => x } },
        "./ssh-hostkey-service.js": { SSHHostKeyService: { createVerifier: () => ({}) } },
    });
    const handler = () => {
        const events = new Map(); const object = { on(name, fn) { events.set(name, fn); return object; }, emit() {}, panel: { dispose() { events.get("dispose")(); } } };
        object.events = events; return object;
    };
    const first = handler(), second = handler(); const terminal = new XtermTerminal();
    terminal.handlerEvent(first, info()); terminal.handlerEvent(second, info());
    first.events.get("initTerminal")({ cols: 80, rows: 24 }); second.events.get("initTerminal")({ cols: 80, rows: 24 });
    first.events.get("initTerminal")({ cols: 80, rows: 24 });
    await tick(); await tick(); assert.equal(clients.length, 2); assert.equal(XtermTerminal.handlerMap.size, 2);
    first.panel.dispose(); assert.equal(XtermTerminal.handlerMap.size, 1); assert.equal(clients[1].destroyed, false);
    XtermTerminal.closeAll(); assert.equal(XtermTerminal.handlerMap.size, 0); assert.equal(clients[1].destroyed, true);
    const connecting = handler(); terminal.handlerEvent(connecting, info()); connecting.events.get("initTerminal")({}); connecting.panel.dispose();
    await tick(); assert.equal(clients[2].destroyed, true); assert.equal(XtermTerminal.handlerMap.size, 0);
});
test("SOCKS stop calls the process shutdown handler", async () => {
    let stopped = 0;
    const { ForwardApi } = load("src/api/forward-api.js", {
        "../connections/forward-command.js": { ForwardCommand: class { async shutdown() { stopped++; } } },
        "../connections/forward-connection.js": { ForwardConnection: class {} },
    });
    await new ForwardApi({ forward: { forward: { type: ForwardType.Socks5Proxy, mode: ForwardMode.Local_SSH_EXEC } } }).stop();
    assert.equal(stopped, 1);
});
