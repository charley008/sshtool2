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
    class Client extends EventEmitter {
        constructor() { super(); clients.push(this); this.destroyed = false; this.sftpCalls = 0; }
        connect() { setImmediate(() => { if (!this.destroyed) this.emit("ready"); }); }
        sftp(callback) { this.sftpCalls++; setImmediate(() => callback(null, {})); }
        end() { this.emit("end"); }
        destroy() { this.destroyed = true; }
    }
    const credentials = { sanitize: x => structuredClone(x), hydrate: async x => x };
    const { SSHConn } = load("src/connections/ssh-connection.js", {
        ssh2: { Client }, "../services/ssh-credential-service.js": { SSHCredentialService: credentials },
        "../services/ssh-hostkey-service.js": { SSHHostKeyService: { createVerifier: () => ({}) } },
        "../models/ssh-model.js": { SSHVO: { get: () => ({ ssh: null }) } },
    });
    return { SSHConn, clients, credentials };
}
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

function transferFixture(sftp) {
    const listeners = new Set(); let disposed = 0;
    const token = { isCancellationRequested: false, onCancellationRequested(fn) { listeners.add(fn); return { dispose() { listeners.delete(fn); disposed++; } }; } };
    const { TransferService } = load("src/services/transfer-service.js", {
        vscode: { ProgressLocation: { Notification: 1 }, window: { withProgress: (options, callback) => callback({ report() {} }, token) } },
        "../connections/ssh-connection.js": { SSHConn: { get: async () => ({ sftp }), clearListCache() {} } },
        "../connections/ftp-connection.js": { FTPConn: {} },
    });
    return { TransferService, token, cancel() { for (const fn of listeners) fn(); }, get disposed() { return disposed; } };
}
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
