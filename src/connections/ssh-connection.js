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
class SSH {
}
exports.SSH = SSH;
class SSHConn {
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
        }
        // config.ssh = API.config_filter(config.ssh);  
        const client = new Client();
        return new Promise((resolve, reject) => {
            client.on('ready', () => {
                if (withSftp) {
                    client.sftp((err, sftp) => {
                        if (err) {
                            this.closeSSH(sshInfo, forwardOption);
                            reject(err);
                            return;
                        }
                        this.activeConn[key] = { client, sftp };
                        resolve(this.activeConn[key]);
                    });
                }
                else if (forwardOption) {
                    this.activeConn[key] = { client, sftp: null };
                    resolve(this.activeConn[key]);
                }
                else {
                    resolve({ client, sftp: null });
                }
            }).on('error', (err) => {
                // Console.err({message:`${SSHVO.title(sshInfo)},${err.message}`});
                if (forwardOption) {
                    this.closeSSH(sshInfo, forwardOption);
                }
                else {
                    this.closeSSH(sshInfo);
                }
                reject(err);
                // resolve(null)
            }).on('end', () => {
                if (this.activeConn[key]) {
                    this.activeConn[key].client.destroy();
                    delete this.activeConn[key];
                }
            }).connect(Object.assign(Object.assign({}, sshInfo.ssh), option));
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
        ;
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
