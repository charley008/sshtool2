// Alias for forward-command
// Recovered module id: 171
"use strict";

const { Storage } = require("../storage/storage.js");
const { execFile } = require("child_process");
const os = require("os");
const GetProcesses = require("../utils/get-processes.js").default;
const Localize = require("../ui/localize.js").default;
const { OSTypes } = require("../shared/constants.js");
const { ForwardVO } = require("../models/forward-model.js");

function assertPort(port, label) {
    const value = Number(port);
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
        throw new Error(`${label} must be an integer between 1 and 65535.`);
    }
    return String(value);
}

function assertSafeHost(host, label) {
    const value = String(host || "").trim();
    if (!value || !/^[a-zA-Z0-9_.:-]+$/.test(value)) {
        throw new Error(`${label} contains unsupported characters.`);
    }
    return value;
}

function assertSafeUser(username) {
    const value = String(username || "").trim();
    if (!value || !/^[a-zA-Z0-9_.@+-]+$/.test(value)) {
        throw new Error("SSH username contains unsupported characters.");
    }
    return value;
}

function buildSshArgs(ssh, forward, binding) {
    return [
        "-qTnN",
        binding.flag,
        binding.value,
        "-p",
        assertPort(ssh.ssh.port, "SSH port"),
        `${assertSafeUser(ssh.ssh.username)}@${assertSafeHost(ssh.ssh.host, "SSH host")}`,
    ];
}

function runSshTunnel(title, ssh, forward, binding) {
    const args = buildSshArgs(ssh, forward, binding);
    if (os.type() === OSTypes.WINDOWS) {
        return execFile("cmd.exe", ["/K", "start", `${title} ${ForwardVO.title(forward)}`, "ssh", ...args]);
    }

    if (ssh.ssh.password) {
        return execFile("sshpass", ["-e", "ssh", ...args], {
            env: Object.assign({}, process.env, { SSHPASS: ssh.ssh.password }),
        });
    }

    return execFile("ssh", args);
}

class ForwardCommand {
    constructor(vo) {
        this.vo = vo;
    }
    async shutdown() {
        const forward = this.vo.forward;
        const fwds = Storage.get_forwards_server();
        const fwd = fwds[forward.id];
        if (fwd) {
            if (os.type() == OSTypes.WINDOWS) {
                execFile("taskkill", ["/F", "/PID", String(fwd.pid), "/T"]);
            }
            else {
                execFile("kill", ["-9", String(fwd.pid)]);
            }
            delete fwds[forward.id];
            Storage.update_forwards_server(fwds);
        }
    }
    async start(binding, titleKey) {
        const forward = this.vo.forward;
        const ssh = this.vo.ssh;
        const fwds = Storage.get_forwards_server();
        if (fwds[forward.id]) {
            await this.shutdown();
        }
        const title = (0, Localize)(titleKey);
        const childProcess = runSshTunnel(title, ssh, forward, binding);
        const processes = await (0, GetProcesses)();
        const p = processes.find(v => v.pid === childProcess.pid);
        if (!p) {
            throw new Error("Forward process was not created.");
        }
        fwds[forward.id] = childProcess;
        Storage.update_forwards_server(fwds);
    }
    local_forwarding() {
        const forward = this.vo.forward.forward;
        return this.start({
            flag: "-L",
            value: `${assertSafeHost(forward.localHost, "Local host")}:${assertPort(forward.localPort, "Local port")}:${assertSafeHost(forward.remoteHost, "Target host")}:${assertPort(forward.remotePort, "Target port")}`,
        }, "xplot.view.forward.type.local.port.forward.title");
    }
    remoteforwarding() {
        const forward = this.vo.forward.forward;
        return this.start({
            flag: "-R",
            value: `${assertSafeHost(forward.remoteHost, "Remote host")}:${assertPort(forward.remotePort, "Remote port")}:${assertSafeHost(forward.localHost, "Local host")}:${assertPort(forward.localPort, "Local port")}`,
        }, "xplot.view.forward.type.remote.port.forward.title");
    }
    socks5Proxy() {
        const forward = this.vo.forward.forward;
        return this.start({
            flag: "-D",
            value: `${assertSafeHost(forward.localHost, "Local host")}:${assertPort(forward.localPort, "Local port")}`,
        }, "xplot.view.forward.type.socks5proxy.title");
    }
}
exports.ForwardCommand = ForwardCommand;
