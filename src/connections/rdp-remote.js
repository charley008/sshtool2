// Alias for rdp
// Recovered module id: 229
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
const child_process_1 = require("child_process");
const os = require("os");
const GetProcesses = require("../utils/get-processes.js").default;
const { Console } = require("../ui/console.js");
const { OSTypes } = require("../shared/constants.js");
class RDP {
    constructor(vo) {
        this.vo = vo;
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            const remote = this.vo.remote;
            const sshInfo = this.vo.ssh;
            const rdps = Storage.get_rdesktops_server();
            const id = remote.id;
            const rdp = rdps[id];
            if (rdp) {
                try {
                    if (os.type() == OSTypes.WINDOWS) {
                        (0, child_process_1.execFile)('taskkill', ['/F', '/PID', String(rdp.pid), '/T']);
                    }
                    else if (os.type() == OSTypes.DARWIN) {
                        throw new Error("MacOS does not support initiating RDP remote");
                    }
                    else {
                        const processes = yield (0, GetProcesses)();
                        const target = processes.find(v =>
                            v.command === 'xfreerdp' &&
                            v.rawCommandLine.includes('/t:' + sshInfo.ssh.host + ':' + remote.rdp.port)
                        );
                        if (target) {
                            (0, child_process_1.execFile)('kill', ['-9', String(target.pid)]);
                        }
                    }
                }
                catch (e) {
                    throw new Error(`Command failed:${e.message}`);
                }
                delete rdps[id];
                Storage.update_rdesktops_server(rdps);
            }
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const remote = this.vo.remote;
            const sshInfo = this.vo.ssh;
            const id = remote.id;
            const rdps = Storage.get_rdesktops_server();
            if (rdps[id]) {
                this.shutdown();
            }
            const w_h = remote.rdp.desktopGeometry.split("x");
            let child_process;
            if (os.type() == OSTypes.WINDOWS) {
                const mstscArgs = ['/v', `${sshInfo.ssh.host}:${remote.rdp.port}`, '/w', w_h[0], '/h', w_h[1]];
                if (remote.rdp.isFullScreen) mstscArgs.unshift('/f');
                child_process = (0, child_process_1.execFile)('mstsc', mstscArgs);
            }
            else {
                if (sshInfo.ssh.password) {
                    const xfreerdpArgs = [
                        '/v:' + sshInfo.ssh.host + ':' + remote.rdp.port,
                        '/u:' + (sshInfo.ssh.username || ''),
                    ];
                    if (remote.rdp.isFullScreen) xfreerdpArgs.push('-f');
                    if (remote.rdp.colorDepth) xfreerdpArgs.push('/bpp:' + remote.rdp.colorDepth);
                    xfreerdpArgs.push(
                        '/w:' + w_h[0], '/h:' + w_h[1],
                        '/t:' + sshInfo.ssh.host + ':' + remote.rdp.port,
                        '+fonts', '+window-drag', '+drives', '+menu-anims', '+aero', '+glyph-cache', '+clipboard',
                        '/network:auto', '/gdi:hw', '/audio-mode:0', '/sound'
                    );
                    xfreerdpArgs.push('/from-stdin');
                    child_process = (0, child_process_1.spawn)('xfreerdp', xfreerdpArgs, { stdio: ['pipe', 'ignore', 'ignore'] });
                    child_process.stdin.end(sshInfo.ssh.password + '\n');
                }
                else {
                    Console.warn("The host password parameter does not exist");
                    return;
                }
            }
            const processes = yield (0, GetProcesses)();
            const p = processes.find(v => v.pid === child_process.pid);
            if (!p)
                throw new Error("Not Fount PID:" + child_process.pid + "," + "Command failed");
            rdps[id] = { pid: child_process.pid };
            Storage.update_rdesktops_server(rdps);
        });
    }
}
exports.RDP = RDP;
