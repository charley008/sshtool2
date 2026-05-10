// Alias for forward-command
// Recovered module id: 171
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

const { Storage } = require("../storage/storage.js");
const { exec, execFile } = require("child_process");
const os = require("os");
const GetProcesses = require("../utils/get-processes.js").default;
const Localize = require("../ui/localize.js").default;
const { OSTypes } = require("../shared/constants.js");
const { ForwardVO } = require("../models/forward-model.js");
class ForwardCommand {
    constructor(vo) {
        this.vo = vo;
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            const fwds = Storage.get_forwards_server();
            const fwd = fwds[forward.id];
            if (fwd) {
                if (os.type() == OSTypes.WINDOWS) {
                    execFile('taskkill', ['/F', '/PID', String(fwd.pid), '/T']);
                }
                else {
                    execFile('kill', ['-9', String(fwd.pid)]);
                }
                delete fwds[forward.id];
                Storage.update_forwards_server(fwds);
            }
        });
    }
    // TODO: 安全风险 — SSH 命令通过 exec 字符串拼接启动，host/port/username 未做转义。
    // Windows 需要 `cmd /K start` 的 shell 特性，Linux 的 sshpass 会将密码暴露在进程列表中。
    // 建议：Windows 使用 execFile('cmd', ['/K', 'start', title, 'ssh', ...args])
    //       Linux 改用 SSH key 认证以避免密码暴露，或使用 expect 脚本。
    local_forwarding() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            const ssh = this.vo.ssh;
            const fwds = Storage.get_forwards_server();
            if (fwds[forward.id]) {
                this.shutdown();
            }
            const title = (0, Localize)("xplot.view.forward.type.local.port.forward.title");
            const cmd = `ssh  -qTnN -L ${forward.forward.localHost}:${forward.forward.localPort}:${forward.forward.remoteHost}:${forward.forward.remotePort} -p${ssh.ssh.port} ${ssh.ssh.username}@${ssh.ssh.host}`;
            let child_process;
            if (os.type() == OSTypes.WINDOWS) {
                child_process = (0, exec)(`cmd /K start "${title}：${ForwardVO.title(forward)}" ${cmd}`);
            }
            else {
                child_process = (0, exec)(`sshpass -p ${ssh.ssh.password} ${cmd}`);
            }
            const processes = yield (0, GetProcesses)();
            const p = processes.find(v => v.pid === child_process.pid);
            if (!p)
                throw "进程不存在";
            fwds[forward.id] = child_process;
            Storage.update_forwards_server(fwds);
        });
    }
    remoteforwarding() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            const ssh = this.vo.ssh;
            const fwds = Storage.get_forwards_server();
            if (fwds[forward.id]) {
                this.shutdown();
            }
            const title = (0, Localize)("xplot.view.forward.type.remote.port.forward.title");
            const cmd = `ssh  -qTnN -R ${forward.forward.remoteHost}:${forward.forward.remotePort}:${forward.forward.localHost}:${forward.forward.localPort} -p${ssh.ssh.port} ${ssh.ssh.username}@${ssh.ssh.host}`;
            let child_process;
            if (os.type() == OSTypes.WINDOWS) {
                child_process = (0, exec)(`cmd /K start "${title}：${forward.id}" ${cmd}`);
            }
            else {
                child_process = (0, exec)(`sshpass -p ${ssh.ssh.password} ${cmd}`);
            }
            const processes = yield (0, GetProcesses)();
            const p = processes.find(v => v.pid === child_process.pid);
            if (!p)
                throw "进程不存在";
            fwds[forward.id] = child_process;
            Storage.update_forwards_server(fwds);
        });
    }
    socks5Proxy() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            const ssh = this.vo.ssh;
            const fwds = Storage.get_forwards_server();
            if (fwds[forward.id]) {
                this.shutdown();
            }
            const title = (0, Localize)("xplot.view.forward.type.socks5proxy.title");
            const cmd = `ssh -qTnN -D ${forward.forward.localHost}:${forward.forward.localPort} -p${ssh.ssh.port} ${ssh.ssh.username}@${ssh.ssh.host}`;
            let child_process;
            if (os.type() == OSTypes.WINDOWS) {
                child_process = (0, exec)(`cmd /K start "${title}：${forward.id}" ${cmd}`);
            }
            else {
                child_process = (0, exec)(`sshpass -p ${ssh.ssh.password} ${cmd}`);
            }
            const processes = yield (0, GetProcesses)();
            const p = processes.find(v => v.pid === child_process.pid);
            if (!p)
                throw "进程不存在";
            fwds[forward.id] = child_process;
            Storage.update_forwards_server(fwds);
        });
    }
}
exports.ForwardCommand = ForwardCommand;
