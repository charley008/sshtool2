// Alias for ftp
// Recovered module id: 37
"use strict";

const { PassThrough } = require("stream");
const { Client: BasicFTPClient, FileType } = require("basic-ftp");
const { Console } = require("../ui/console.js");
const { FTPVO } = require("../models/ftp-model.js");
const { FTPCredentialService } = require("../services/ftp-credential-service.js");
const { AsyncQueue } = require("../utils/async-queue.js");

class FTP {
}
exports.FTP = FTP;

function normalizeListEntry(entry) {
    let type = "-";
    if (entry.type === FileType.Directory || entry.isDirectory) {
        type = "d";
    } else if (entry.type === FileType.SymbolicLink || entry.isSymbolicLink) {
        type = "l";
    }
    return {
        name: entry.name,
        type,
        size: entry.size || 0,
        date: entry.rawModifiedAt || "",
        modifiedAt: entry.modifiedAt,
        rights: entry.permissions,
        owner: entry.user,
        group: entry.group,
        target: entry.link,
    };
}

class FTPClientAdapter {
    constructor(client) {
        this.client = client;
        this.queue = new AsyncQueue();
    }
    run(action) { return this.queue.run(() => action(this.client)); }

    get(remotePath, callback) {
        const stream = new PassThrough();
        callback(null, stream);
        this.run(client => client.downloadTo(stream, remotePath)).catch((err) => {
            stream.destroy(err);
        });
    }

    put(localPath, remotePath, callback) {
        this.run(client => client.uploadFrom(localPath, remotePath))
            .then(() => callback(null))
            .catch(callback);
    }

    rename(oldPath, newPath, callback) {
        this.run(client => client.rename(oldPath, newPath))
            .then(() => callback(null))
            .catch(callback);
    }

    list(remotePath, callback) {
        this.run(client => client.list(remotePath))
            .then((list) => callback(null, list.map(normalizeListEntry)))
            .catch(callback);
    }

    rmdir(remotePath, callback) {
        this.run(client => client.removeEmptyDir(remotePath))
            .then(() => callback(null))
            .catch(callback);
    }

    mkdir(remotePath, callback) {
        this.run(client => client.send(`MKD ${remotePath}`))
            .then(() => callback(null))
            .catch(callback);
    }

    delete(remotePath, callback) {
        this.run(client => client.remove(remotePath))
            .then(() => callback(null))
            .catch(callback);
    }

    end() {
        this.queue.close();
        this.client.close();
    }

    destroy() {
        this.queue.close();
        this.client.close();
    }

    get closed() {
        return this.client.closed;
    }
}

class FTPConn {
    static cacheKey(ftpInfo, remotePath) {
        return `${ftpInfo.id}:${remotePath || "/"}`;
    }

    static cloneList(list) {
        return Array.isArray(list) ? list.map(item => Object.assign({}, item)) : list;
    }

    static getCachedList(ftpInfo, remotePath) {
        const cache = this.listCache[this.cacheKey(ftpInfo, remotePath)];
        if (!cache || Date.now() - cache.time > this.listCacheTTL) {
            return null;
        }
        return this.cloneList(cache.list);
    }

    static setCachedList(ftpInfo, remotePath, list) {
        this.listCache[this.cacheKey(ftpInfo, remotePath)] = {
            time: Date.now(),
            list: this.cloneList(list),
        };
    }

    static clearListCache(ftpInfo) {
        const prefix = `${ftpInfo.id}:`;
        Object.keys(this.listCache).forEach((key) => {
            if (key.startsWith(prefix)) {
                delete this.listCache[key];
            }
        });
    }

    static accessOptions(ftpInfo) {
        const ftp = ftpInfo.ftp || {};
        return {
            host: ftp.host,
            port: Number(ftp.port || 21),
            user: ftp.user,
            password: ftp.password || "",
            secure: !!ftp.secure,
        };
    }

    static get(ftpInfo, fresh = false) {
        if (this.blocked) return Promise.reject(new Error("Connections are being cleared."));
        const key = fresh ? "test:" + require("crypto").randomUUID() : ftpInfo.id;
        const signature = JSON.stringify(FTPCredentialService.sanitize(ftpInfo).ftp);
        const previous = this.activeFTPConn[key] || this.pending.get(key);
        if (previous && previous.signature !== signature) this.closeFTP({ id: key });
        if (this.activeFTPConn[key] && this.activeFTPConn[key].client.closed) {
            delete this.activeFTPConn[key];
        }
        if (this.activeFTPConn[key]) {
            return Promise.resolve(this.activeFTPConn[key]);
        }
        if (this.pending.has(key)) return this.pending.get(key).promise;

        const client = new BasicFTPClient(10000);
        const record = { client, promise: null, signature };
        record.promise = FTPCredentialService.hydrate(ftpInfo)
            .then((hydratedFtpInfo) => {
                if (this.pending.get(key) !== record) throw new Error("FTP connection cancelled.");
                return client.access(this.accessOptions(hydratedFtpInfo));
            })
            .then(() => {
                if (this.pending.get(key) !== record) { client.close(); throw new Error("FTP connection cancelled."); }
                this.activeFTPConn[key] = { client: new FTPClientAdapter(client), signature, key };
                return this.activeFTPConn[key];
            })
            .catch((err) => {
                client.close();
                throw err;
            }).finally(() => { if (this.pending.get(key) === record) this.pending.delete(key); });
        this.pending.set(key, record);
        return record.promise;
    }

    static verifyFTP(ftpInfo) {
        const key = ftpInfo.id;
        if (this.activeFTPConn[key]) {
            return Promise.resolve(this.activeFTPConn[key]);
        }
        return Promise.resolve({ client: null });
    }

    static closeFTP(ftpInfo) {
        this.clearListCache(ftpInfo);
        const key = ftpInfo.id;
        const pending = this.pending.get(key);
        this.pending.delete(key);
        if (pending) pending.client.close();
        if (this.activeFTPConn[key]) {
            this.activeFTPConn[key].client.end();
            delete this.activeFTPConn[key];
        }
        return Promise.resolve({ client: null });
    }
    static closeAll() {
        for (const id of new Set([...Object.keys(this.activeFTPConn), ...this.pending.keys()])) this.closeFTP({ id });
        this.listCache = {};
    }

    static withTimeout(ftpInfo, action, fallback, describeError = error => error.message || String(error)) {
        return new Promise((resolve) => {
            let done = false;
            const finish = (value) => {
                if (done) {
                    return;
                }
                done = true;
                clearTimeout(timer);
                resolve(value);
            };
            const timer = setTimeout(() => {
                Console.warn(describeError(new Error("FTP operation timed out.")), true);
                this.closeFTP(ftpInfo);
                finish(fallback);
            }, 8000);
            Promise.resolve()
                .then(action)
                .then(finish)
                .catch((err) => {
                    if (done) return;
                    Console.warn(describeError(err), true);
                    finish(fallback);
                });
        });
    }

    static async operation(info, action, fallback, method = "operation", args = []) {
        const describeError = error => require("../utils/remote-operation-error.js").formatRemoteOperationError("FTP", method, args, error);
        try {
            const { client } = await this.get(info);
            return await client.run(raw => this.withTimeout(info, () => action(raw), fallback, describeError));
        } catch (error) { Console.warn(describeError(error), true); return fallback; }
    }
    static async put(info, local, remote) {
        const result = await this.operation(info, async raw => { await raw.uploadFrom(local, remote); return true; }, false, "uploadFrom", [remote]);
        if (result) this.clearListCache(info);
        return result;
    }
    static async mutate(info, method, args) {
        const result = await this.operation(info, async raw => { await raw[method](...args); return true; }, false, method, args);
        if (result) this.clearListCache(info);
        return result;
    }
    static rename(info, from, to) { return this.mutate(info, "rename", [from, to]); }
    static async list(info, remote) {
        const cached = this.getCachedList(info, remote);
        if (cached) return cached;
        const result = await this.operation(info, async raw => (await raw.list(remote)).map(normalizeListEntry), null, "list", [remote]);
        if (result) this.setCachedList(info, remote, result);
        return this.cloneList(result);
    }
    static async rmdir(info, remote) {
        const { deletionPath, removeRemoteDirectory } = require("../utils/remote-directory-delete.js");
        const posix = require("path").posix;
        try {
            deletionPath(remote);
            const { client } = await this.get(info);
            // Hold the FTP queue for the entire tree; never overlap control-channel commands.
            return await client.run(async raw => {
                const root = deletionPath(posix.resolve(await raw.pwd(), remote.replace(/\\/g, "/")));
                return removeRemoteDirectory({
                    kind: async target => {
                        const entries = await raw.list(posix.dirname(target));
                        const entry = entries.find(item => item.name === posix.basename(target));
                        if (!entry) throw Object.assign(new Error("Remote entry not found in parent directory listing."), { code: 550 });
                        if (entry.isSymbolicLink || entry.type === FileType.SymbolicLink) return "link";
                        if (entry.isDirectory || entry.type === FileType.Directory) return "directory";
                        if (entry.isFile || entry.type === FileType.File) return "file";
                        return "unknown";
                    },
                    list: async target => (await raw.list(target)).map(entry => entry.name),
                    unlink: target => raw.remove(target),
                    rmdir: target => raw.removeEmptyDir(target),
                    close: () => this.closeFTP(info),
                }, root, 8000);
            });
        } catch (error) {
            Console.warn(require("../utils/remote-operation-error.js").formatRemoteOperationError("FTP", "removeDirectory", [remote], error), true);
            return false;
        } finally { this.clearListCache(info); }
    }
    static mkdir(info, remote) { return this.mutate(info, "send", ["MKD " + remote]); }
    static delete(info, remote) { return this.mutate(info, "remove", [remote]); }
}
exports.FTPConn = FTPConn;
FTPConn.activeFTPConn = {};
FTPConn.pending = new Map();
FTPConn.listCache = {};
FTPConn.listCacheTTL = 15000;
