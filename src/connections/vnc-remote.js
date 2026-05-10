// Alias for vnc
// Recovered module id: 230
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
const { OSTypes } = require("../shared/constants.js");
class VNC {
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
                    else {
                        const processes = yield (0, GetProcesses)();
                        const target = processes.find(v =>
                            v.command === 'vncviewer' &&
                            v.rawCommandLine.includes('vncviewer ' + sshInfo.ssh.host + ':' + remote.rdp.port)
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
            if (os.type() == OSTypes.DARWIN) {
                throw new Error("MacOS does not support initiating VNC remote");
            }
            const vncArgs = [sshInfo.ssh.host + ':' + remote.rdp.port];
            if (remote.rdp.isFullScreen) {
                vncArgs.push('FullScreen=1');
            } else {
                vncArgs.push('FullScreen=0', 'Scaling=' + remote.rdp.desktopGeometry);
            }
            const child_process = (0, child_process_1.execFile)('vncviewer', vncArgs);
            const processes = yield (0, GetProcesses)();
            const p = processes.find(v => v.pid === child_process.pid);
            if (!p)
                throw new Error("Not Fount PID:" + child_process.pid + "," + "Command failed");
            rdps[id] = { pid: child_process.pid };
            Storage.update_rdesktops_server(rdps);
        });
    }
}
exports.VNC = VNC;
