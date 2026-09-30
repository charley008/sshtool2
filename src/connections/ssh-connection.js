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

const { Client } = require("ssh2");
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
    static cacheKey(sshInfo, remotePath) {
        return `${sshInfo.id}:${remotePath || "/"}`;
    }

    static cloneList(list) {
        return Array.isArray(list) ? list.map(item => Object.assign({}, item)) : list;
    }

    static getCachedList(sshInfo, remotePath) {
        const cache = this.listCache[this.cacheKey(sshInfo, remotePath)];
        if (!cache || Date.now() - cache.time > this.listCacheTTL) {
            return null;
        }
        return this.cloneList(cache.list);
    }

    static setCachedList(sshInfo, remotePath, list) {
        this.listCache[this.cacheKey(sshInfo, remotePath)] = {
            time: Date.now(),
            list: this.cloneList(list),
        };
    }

    static clearListCache(sshInfo) {
        const prefix = `${sshInfo.id}:`;
        Object.keys(this.listCache).forEach((key) => {
            if (key.startsWith(prefix)) {
                delete this.listCache[key];
            }
        });
    }

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
    static ensureSftp(connection) {
        if (connection.sftp) return Promise.resolve(connection);
        if (!connection.sftpPromise) {
            connection.sftpPromise = new Promise((resolve, reject) => {
                connection.client.sftp((error, sftp) => {
                    if (error) return reject(error);
                    connection.sftp = sftp;
                    resolve(connection);
                });
            }).catch(error => { connection.sftpPromise = null; throw error; });
        }
        return connection.sftpPromise;
    }
    static get(sshInfo, withSftp = true, forwardOption = null, fresh = false) {
        if (this.blocked) return Promise.reject(new Error("Connections are being cleared."));
        const key = fresh ? "test:" + require("crypto").randomUUID() : forwardOption ? forwardOption.fid : sshInfo.id;
        const signature = JSON.stringify(SSHCredentialService.sanitize(sshInfo).ssh);
        const previous = this.activeConn[key] || this.pending.get(key);
        if (previous && previous.signature !== signature) this.closeKey(key);
        if (this.activeConn[key]) {
            return withSftp ? this.ensureSftp(this.activeConn[key]) : Promise.resolve(this.activeConn[key]);
        }
        const pending = this.pending.get(key);
        if (pending) return pending.promise.then(conn => withSftp ? this.ensureSftp(conn) : conn);
        const client = new Client();
        const connection = { client, sftp: null, signature };
        const record = { client, signature, promise: null, reject: null };
        const cleanup = () => {
            if (this.activeConn[key] === connection) delete this.activeConn[key];
            if (this.pending.get(key) === record) this.pending.delete(key);
            this.clearListCache(sshInfo);
        };
        record.promise = new Promise((resolve, reject) => {
            record.reject = reject;
            client.once("ready", () => {
                if (this.pending.get(key) !== record) { client.destroy(); return; }
                this.pending.delete(key);
                this.activeConn[key] = connection;
                resolve(connection);
            });
            client.on("error", error => { cleanup(); client.destroy(); reject(error); });
            const ended = () => { cleanup(); reject(new Error("SSH connection closed.")); };
            client.once("end", ended);
            client.once("close", ended);
        });
        this.pending.set(key, record);
        SSHCredentialService.hydrate(sshInfo).then(async hydrated => {
            let option = Object.assign({ readyTimeout: 10000, keepaliveInterval: 5000, keepaliveCountMax: 3 }, forwardOption || {});
            if (!option.sock) option = (await this.openJumpStream(hydrated, option)).option;
            if (this.pending.get(key) !== record) { if (option.sock) option.sock.destroy(); return; }
            client.connect(cloneConnectOptions(hydrated, option));
        }).catch(error => { cleanup(); client.destroy(); record.reject(error); });
        return record.promise.then(conn => withSftp ? this.ensureSftp(conn) : conn);
    }
    static verifySSH(sshInfo, forwardOption = null) {
        return Promise.resolve(this.activeConn[forwardOption ? forwardOption.fid : sshInfo.id] || { client: null, sftp: null });
    }
    static closeKey(key) {
        const pending = this.pending.get(key);
        this.pending.delete(key);
        const active = this.activeConn[key];
        delete this.activeConn[key];
        if (pending) pending.reject(new Error("SSH connection cancelled."));
        const client = active ? active.client : pending && pending.client;
        if (client) { client.end(); client.destroy(); }
    }
    static closeSSH(sshInfo, forwardOption = null) {
        this.clearListCache(sshInfo);
        this.closeKey(forwardOption ? forwardOption.fid : sshInfo.id);
        return Promise.resolve({ client: null, sftp: null });
    }
    static closeAll() {
        for (const key of new Set([...Object.keys(this.activeConn), ...this.pending.keys()])) this.closeKey(key);
        this.listCache = {};
    }
    static async operation(info, method, args, fallback) {
        let timer;
        try {
            return await Promise.race([
                (async () => {
                    const { sftp } = await this.get(info);
                    return await new Promise((resolve, reject) => {
                        sftp[method](...args, (error, result) => error ? reject(error) : resolve(result === undefined ? true : result));
                    });
                })(),
                new Promise((resolve, reject) => { timer = setTimeout(() => {
                    this.closeSSH(info);
                    reject(new Error("SFTP operation timed out."));
                }, 10000); }),
            ]);
        } catch (error) {
            Console.warn(require("../utils/remote-operation-error.js").formatRemoteOperationError("SFTP", method, args, error), true);
            return fallback;
        } finally { clearTimeout(timer); }
    }
    static async list(info, remotePath) {
        const cached = this.getCachedList(info, remotePath);
        if (cached) return cached;
        const list = await this.operation(info, "readdir", [remotePath], null);
        if (list) this.setCachedList(info, remotePath, list);
        return this.cloneList(list);
    }
    static async mutate(info, method, args) {
        const result = await this.operation(info, method, args, false);
        if (result) this.clearListCache(info);
        return result;
    }
    static rename(info, from, to) { return this.mutate(info, "rename", [from, to]); }
    static put(info, local, remote) { return this.mutate(info, "fastPut", [local, remote]); }
    static mkdir(info, remote) { return this.mutate(info, "mkdir", [remote]); }
    static async rmdir(info, remote) {
        const { deletionPath, removeRemoteDirectory } = require("../utils/remote-directory-delete.js");
        try {
            deletionPath(remote);
            const { sftp } = await this.get(info);
            const call = (method, target) => new Promise((resolve, reject) => {
                sftp[method](target, (error, result) => error ? reject(error) : resolve(result));
            });
            return await removeRemoteDirectory({
                kind: async target => {
                    const attrs = await call("lstat", target);
                    return attrs.isSymbolicLink() ? "link" : attrs.isDirectory() ? "directory" : "file";
                },
                list: async target => (await call("readdir", target)).map(entry => entry.filename),
                unlink: target => call("unlink", target),
                rmdir: target => call("rmdir", target),
                close: () => this.closeSSH(info),
            }, remote);
        } catch (error) {
            Console.warn(require("../utils/remote-operation-error.js").formatRemoteOperationError("SFTP", "removeDirectory", [remote], error), true);
            return false;
        } finally { this.clearListCache(info); }
    }
    static delete(info, remote) { return this.mutate(info, "unlink", [remote]); }
}
exports.SSHConn = SSHConn;
SSHConn.activeConn = {};
SSHConn.pending = new Map();
SSHConn.listCache = {};
SSHConn.listCacheTTL = 15000;
