// Alias for ftp
// Recovered module id: 37
"use strict";

const { PassThrough } = require("stream");
const { Client: BasicFTPClient, FileType } = require("basic-ftp");
const { Console } = require("../ui/console.js");
const { FTPVO } = require("../models/ftp-model.js");
const { FTPCredentialService } = require("../services/ftp-credential-service.js");

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
    }

    get(remotePath, callback) {
        const stream = new PassThrough();
        callback(null, stream);
        this.client.downloadTo(stream, remotePath).catch((err) => {
            stream.destroy(err);
        });
    }

    put(localPath, remotePath, callback) {
        this.client.uploadFrom(localPath, remotePath)
            .then(() => callback(null))
            .catch(callback);
    }

    rename(oldPath, newPath, callback) {
        this.client.rename(oldPath, newPath)
            .then(() => callback(null))
            .catch(callback);
    }

    list(remotePath, callback) {
        this.client.list(remotePath)
            .then((list) => callback(null, list.map(normalizeListEntry)))
            .catch(callback);
    }

    rmdir(remotePath, callback) {
        this.client.removeEmptyDir(remotePath)
            .then(() => callback(null))
            .catch(callback);
    }

    mkdir(remotePath, callback) {
        this.client.send(`MKD ${remotePath}`)
            .then(() => callback(null))
            .catch(callback);
    }

    delete(remotePath, callback) {
        this.client.remove(remotePath)
            .then(() => callback(null))
            .catch(callback);
    }

    end() {
        this.client.close();
    }

    destroy() {
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

    static get(ftpInfo) {
        const key = ftpInfo.id;
        if (this.activeFTPConn[key] && this.activeFTPConn[key].client.closed) {
            delete this.activeFTPConn[key];
        }
        if (this.activeFTPConn[key]) {
            if (ftpInfo.status == 0) {
                return Promise.resolve(this.activeFTPConn[key]);
            }
            this.closeFTP(ftpInfo);
        }

        const client = new BasicFTPClient(10000);
        return FTPCredentialService.hydrate(ftpInfo)
            .then((hydratedFtpInfo) => client.access(this.accessOptions(hydratedFtpInfo)))
            .then(() => {
                this.activeFTPConn[key] = { client: new FTPClientAdapter(client) };
                return this.activeFTPConn[key];
            })
            .catch((err) => {
                client.close();
                throw err;
            });
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
        if (this.activeFTPConn[key]) {
            this.activeFTPConn[key].client.end();
            delete this.activeFTPConn[key];
        }
        return Promise.resolve({ client: null });
    }

    static withTimeout(ftpInfo, action, fallback) {
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
                Console.info(`Timeout ${FTPVO.title(ftpInfo)}`);
                this.closeFTP(ftpInfo);
                finish(fallback);
            }, 8000);
            Promise.resolve()
                .then(action)
                .then(finish)
                .catch((err) => {
                    Console.warn(err && err.message ? err.message : String(err));
                    finish(fallback);
                });
        });
    }

    static put(ftpInfo, lfile, rfile) {
        return this.withTimeout(ftpInfo, async () => {
            const { client } = await this.get(ftpInfo);
            await client.client.uploadFrom(lfile, rfile);
            this.clearListCache(ftpInfo);
            return true;
        }, false);
    }

    static rename(ftpInfo, oldname, newname) {
        return this.withTimeout(ftpInfo, async () => {
            const { client } = await this.get(ftpInfo);
            await client.client.rename(oldname, newname);
            this.clearListCache(ftpInfo);
            return true;
        }, false);
    }

    static list(ftpInfo, rforder) {
        return this.withTimeout(ftpInfo, async () => {
            const cachedList = this.getCachedList(ftpInfo, rforder);
            if (cachedList) {
                return cachedList;
            }
            const { client } = await this.get(ftpInfo);
            const list = await client.client.list(rforder);
            const normalized = list.map(normalizeListEntry);
            this.setCachedList(ftpInfo, rforder, normalized);
            return this.cloneList(normalized);
        }, null);
    }

    static rmdir(ftpInfo, rforder) {
        return this.withTimeout(ftpInfo, async () => {
            const { client } = await this.get(ftpInfo);
            await client.client.removeEmptyDir(rforder);
            this.clearListCache(ftpInfo);
            return true;
        }, false);
    }

    static mkdir(ftpInfo, rforder) {
        return this.withTimeout(ftpInfo, async () => {
            const { client } = await this.get(ftpInfo);
            await client.client.send(`MKD ${rforder}`);
            this.clearListCache(ftpInfo);
            return true;
        }, false);
    }

    static delete(ftpInfo, rfile) {
        return this.withTimeout(ftpInfo, async () => {
            const { client } = await this.get(ftpInfo);
            await client.client.remove(rfile);
            this.clearListCache(ftpInfo);
            return true;
        }, false);
    }
}
exports.FTPConn = FTPConn;
FTPConn.activeFTPConn = {};
FTPConn.listCache = {};
FTPConn.listCacheTTL = 15000;
