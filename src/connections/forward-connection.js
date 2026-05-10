// Alias for forward-connection
// Recovered module id: 145
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

const net = require("net");
const debug = require("../utils/debug-runtime.js");
const { Storage } = require("../storage/storage.js");
const { ForwardVO } = require("../models/forward-model.js");
const { SSHConn } = require("./ssh-connection.js");
const { SSHVO } = require("../models/ssh-model.js");
class ForwardConnection {
    constructor(vo) {
        this.isWindows = process.platform === 'win32';
        this.debug = debug('ssh');
        this.vo = vo;
        this.forwardOptions = {
            fid: vo.forward.id,
            agentForward: false,
            keepAlive: true,
            agentSocket: '',
        };
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            this.debug("Shutdown connections");
            const client = yield this.establish();
            client.removeAllListeners();
            client.end();
            return new Promise((resolve) => {
                const fwds = Storage.get_forwards_server();
                if (Object.keys(fwds).length > 0) {
                    const fwd = fwds[forward.id];
                    if (fwd) {
                        fwd.close(resolve);
                        delete fwds[forward.id];
                        Storage.update_forwards_server(fwds);
                    }
                }
                return resolve;
            });
        });
    }
    tty() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.establish();
            this.debug("Opening tty");
            yield this.shell(connection);
        });
    }
    executeCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this.establish();
            this.debug('Executing command "%s"', command);
            yield this.shell(connection, command);
        });
    }
    shell(connection, command) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                connection.shell((err, stream) => {
                    if (err) {
                        return reject(err);
                    }
                    stream.on('close', () => __awaiter(this, void 0, void 0, function* () {
                        stream.end();
                        process.stdin.unpipe(stream);
                        process.stdin.destroy();
                        connection.end();
                        yield this.shutdown();
                        return resolve();
                    })).stderr.on('data', (data) => {
                        return reject(data);
                    });
                    stream.pipe(process.stdout);
                    if (command) {
                        stream.end(`${command}\nexit\n`);
                    }
                    else {
                        process.stdin.pipe(stream);
                    }
                });
            });
        });
    }
    establish() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            if (forward.forward.bastionHost) {
                return yield this.connectViaBastion();
            }
            else {
                return yield this.connect();
            }
        });
    }
    connectViaBastion() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            const sshInfo = this.vo.ssh;
            const forwardOptions = this.forwardOptions;
            this.debug('Connecting to bastion host "%s"', forward.forward.bastionHost);
            const connectionToBastion = yield this.connect();
            return new Promise((resolve, reject) => {
                connectionToBastion.forwardOut(forward.forward.bastionHost, forward.forward.bastionPort, forward.forward.remoteHost, forward.forward.remotePort || 22, (err, stream) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return reject(err);
                    }
                    const ssh = yield SSHConn.get(sshInfo, false, forwardOptions);
                    if (ssh == null) {
                        return;
                    }
                    return resolve(ssh.client);
                }));
            });
        });
    }
    connect(stream) {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            const sshInfo = this.vo.ssh;
            const forwardOptions = this.forwardOptions;
            this.debug('Connecting to "%s"', SSHVO.title(sshInfo));
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                if (forwardOptions.agentForward) {
                    forwardOptions.agentForward = true;
                    // see https://github.com/mscdex/ssh2#client for agents on Windows
                    // guaranteed to give the ssh agent sock if the agent is running (posix)
                    let agentDefault = process.env['SSH_AUTH_SOCK'];
                    if (this.isWindows) {
                        // null or undefined
                        if (agentDefault == null) {
                            agentDefault = 'pageant';
                        }
                    }
                    const agentSock = forwardOptions.agentSocket ? forwardOptions.agentSocket : agentDefault;
                    if (agentSock == null) {
                        throw new Error('SSH Agent Socket is not provided, or is not set in the SSH_AUTH_SOCK env variable');
                    }
                    forwardOptions.agent = agentSock;
                }
                if (stream) {
                    forwardOptions.sock = stream;
                }
                try {
                    const ssh = yield SSHConn.get(sshInfo, false, forwardOptions);
                    if (ssh == null) {
                        return;
                    }
                    return resolve(ssh.client);
                }
                catch (error) {
                    reject(error);
                }
            }));
        });
    }
    local_forwarding() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            const sshInfo = this.vo.ssh;
            const fwds = Storage.get_forwards_server();
            if (fwds[forward.id]) {
                this.shutdown();
            }
            const client = yield this.establish();
            return new Promise((resolve, reject) => {
                const server = net.createServer((socket) => {
                    this.debug('Forwarding connection from "localhost:%d" to "%s:%d"', ForwardVO.title(forward));
                    client.forwardOut(forward.forward.localHost, forward.forward.localPort, forward.forward.remoteHost, forward.forward.remotePort, (error, stream) => {
                        if (error) {
                            return reject(error);
                        }
                        socket.pipe(stream);
                        stream.pipe(socket);
                    });
                }).listen(forward.forward.localPort, forward.forward.localHost, () => {
                    const fwds = Storage.get_forwards_server();
                    fwds[forward.id] = server;
                    Storage.update_forwards_server(fwds);
                    return resolve();
                }).on('close', () => {
                }).on('error', (e) => {
                    // if (e) {
                    //   setTimeout(() => {
                    //     server.close();
                    //     server.listen(forward.localPort,forward.localHost);
                    //   }, 5000);
                    // }
                });
            });
        });
    }
    remoteforwarding() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
}
exports.ForwardConnection = ForwardConnection;
