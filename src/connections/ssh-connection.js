// Alias for ssh
// Recovered module id: 29
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

const { Client } = require("./ssh2-runtime.js");
const { Console } = require("../ui/console.js");
const { SSHVO } = require("../models/ssh-model.js");
const { SSHCredentialService } = require("../services/ssh-credential-service.js");
const { SSHHostKeyService } = require("../services/ssh-hostkey-service.js");

function normalizeJump(sshInfo) {
    const jump = sshInfo && sshInfo.ssh ? sshInfo.ssh.jump : null;
    return Object.assign({ enabled: false, sshId: "" }, jump || {});
}

function cloneConnectOptions(sshInfo, option) {
    const ssh = Object.assign({}, sshInfo.ssh || {});
    delete ssh.jump;
    return Object.assign(ssh, option, SSHHostKeyService.createVerifier(sshInfo));
}

class SSH {
}
exports.SSH = SSH;
class SSHConn {
    static openJumpStream(sshInfo, option) {
        const jump = normalizeJump(sshInfo);
        if (!jump.enabled) {
            return Promise.resolve({ option, jumpKey: null });
        }
        if (!jump.sshId || jump.sshId === sshInfo.id) {
            return Promise.reject(new Error("Invalid jump host selection."));
        }
        const jumpVO = SSHVO.get(jump.sshId);
        const jumpInfo = jumpVO && jumpVO.ssh;
        if (!jumpInfo) {
            return Promise.reject(new Error("Jump host was not found."));
        }
        const nestedJump = normalizeJump(jumpInfo);
        if (nestedJump.enabled) {
            return Promise.reject(new Error("Nested jump hosts are not supported."));
        }
        return SSHCredentialService.hydrate(jumpInfo).then((hydratedJumpInfo) => this.get(hydratedJumpInfo, false)).then(({ client }) => {
            return new Promise((resolve, reject) => {
                client.forwardOut("127.0.0.1", 0, sshInfo.ssh.host, Number(sshInfo.ssh.port || 22), (err, stream) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ option: Object.assign({}, option, { sock: stream }), jumpKey: jump.sshId });
                });
            });
        });
    }
    static get(sshInfo, withSftp = true, forwardOption = null) {
        let key = sshInfo.id;
        let option = {
            readyTimeout: 1000 * 5,
            keepaliveInterval: 1000 * 5,
            keepaliveCountMax: 3,
        };
        if (forwardOption) {
            key = forwardOption.fid;
            option = Object.assign({ readyTimeout: 1000 * 60, keepaliveInterval: 1000 * 12, keepaliveCountMax: 5 }, forwardOption);
        }
        if (this.activeConn[key]) {
            if (sshInfo.status == 0) {
                return Promise.resolve(this.activeConn[key]);
            }
            this.closeSSH(sshInfo, forwardOption);
        }
        // config.ssh = API.config_filter(config.ssh);  
        const client = new Client();
        return new Promise((resolve, reject) => {
            let settled = false;
            const finishResolve = (value) => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve(value);
            };
            const finishReject = (err) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (forwardOption) {
                    this.closeSSH(sshInfo, forwardOption);
                }
                else {
                    this.closeSSH(sshInfo);
                }
                reject(err);
            };
            client.on('ready', () => {
                if (withSftp) {
                    client.sftp((err, sftp) => {
                        if (err) {
                            finishReject(err);
                            return;
                        }
                        this.activeConn[key] = { client, sftp };
                        finishResolve(this.activeConn[key]);
                    });
                }
                else if (forwardOption) {
                    this.activeConn[key] = { client, sftp: null };
                    finishResolve(this.activeConn[key]);
                }
                else {
                    finishResolve({ client, sftp: null });
                }
            }).on('error', (err) => {
                // Console.err({message:`${SSHVO.title(sshInfo)},${err.message}`});
                finishReject(err);
                // resolve(null)
            }).on('end', () => {
                if (this.activeConn[key]) {
                    this.activeConn[key].client.destroy();
                    delete this.activeConn[key];
                }
            });
            SSHCredentialService.hydrate(sshInfo).then((hydratedSshInfo) => {
                const connectOptions = forwardOption ? Promise.resolve({ option, jumpKey: null }) : this.openJumpStream(hydratedSshInfo, option);
                return connectOptions.then(({ option: effectiveOption }) => {
                    client.connect(cloneConnectOptions(hydratedSshInfo, effectiveOption));
                });
            }).catch(finishReject);
        });
    }
    static verifySSH(sshInfo, forwardOption = null) {
        let key = sshInfo.id;
        if (forwardOption) {
            key = forwardOption.fid;
        }
        if (this.activeConn[key]) {
            return Promise.resolve(this.activeConn[key]);
        }
        return Promise.resolve({ client: null, sftp: null });
    }
    static closeSSH(sshInfo, forwardOption = null) {
        let key = sshInfo.id;
        if (forwardOption) {
            key = forwardOption.fid;
        }
        if (this.activeConn[key]) {
            this.activeConn[key].client.end();
            if (this.activeConn[key]) {
                this.activeConn[key].client.destroy();
                delete this.activeConn[key];
            }
        }
        return Promise.resolve({ client: null, sftp: null });
    }
    static list(sshInfo, rforder) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(null);
                mark = null;
                Console.info(`Timeout ${SSHVO.title(sshInfo)}`);
                this.closeSSH(sshInfo);
            }, 8000);
            const { client, sftp } = yield this.get(sshInfo);
            sftp.readdir(rforder, (err, list) => {
                if (mark) {
                    clearTimeout(mark);
                    if (err) {
                        resolve(null);
                        return;
                    }
                    resolve(list);
                }
            });
        }));
    }
    static rename(sshInfo, oldname, newname) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${SSHVO.title(sshInfo)}`);
                this.closeSSH(sshInfo);
            }, 8000);
            const { client, sftp } = yield this.get(sshInfo);
            sftp.rename(oldname, newname, err => {
                if (mark) {
                    clearTimeout(mark);
                    if (err) {
                        resolve(false);
                        return;
                    }
                    resolve(true);
                }
            });
        }));
    }
    static put(sshInfo, lfile, rfile) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${SSHVO.title(sshInfo)}`);
                this.closeSSH(sshInfo);
            }, 8000);
            const { client, sftp } = yield this.get(sshInfo);
            sftp.fastPut(lfile, rfile, err => {
                if (mark) {
                    clearTimeout(mark);
                    if (err) {
                        resolve(false);
                        return;
                    }
                    resolve(true);
                }
            });
        }));
    }
    static rmdir(sshInfo, rforder) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${SSHVO.title(sshInfo)}`);
                this.closeSSH(sshInfo);
            }, 8000);
            const { client, sftp } = yield this.get(sshInfo);
            sftp.rmdir(rforder, err => {
                if (mark) {
                    clearTimeout(mark);
                    if (err) {
                        resolve(false);
                        return;
                    }
                    resolve(true);
                }
            });
        }));
    }
    static mkdir(sshInfo, rforder) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${SSHVO.title(sshInfo)}`);
                this.closeSSH(sshInfo);
            }, 8000);
            const { client, sftp } = yield this.get(sshInfo);
            sftp.mkdir(rforder, err => {
                if (mark) {
                    clearTimeout(mark);
                    if (err) {
                        resolve(false);
                        return;
                    }
                    resolve(true);
                }
            });
        }));
    }
    static delete(sshInfo, rfile) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${SSHVO.title(sshInfo)}`);
                this.closeSSH(sshInfo);
            }, 8000);
            const { client, sftp } = yield this.get(sshInfo);
            sftp.unlink(rfile, err => {
                if (mark) {
                    clearTimeout(mark);
                    if (err) {
                        resolve(false);
                        return;
                    }
                    resolve(true);
                }
            });
        }));
    }
}
exports.SSHConn = SSHConn;
SSHConn.activeConn = {};
