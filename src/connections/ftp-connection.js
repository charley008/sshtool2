// Alias for ftp
// Recovered module id: 37
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

const { Console } = require("../ui/console.js");
const { FTPVO } = require("../models/ftp-model.js");
const Client = require("./ftp-client-runtime.js");
class FTP {
}
exports.FTP = FTP;
class FTPConn {
    static get(ftpInfo) {
        let key = ftpInfo.id;
        let option = {
            connTimeout: 8 * 1000,
            pasvTimeout: 10 * 1000
        };
        if (this.activeFTPConn[key]) {
            // if(ftpInfo.status == 0){
            return Promise.resolve(this.activeFTPConn[key]);
            // }
        }
        // config.ftp = API.config_filter(config.ftp);  
        const client = new Client();
        return new Promise((resolve, reject) => {
            client.on('ready', () => {
                this.activeFTPConn[key] = { client };
                resolve(this.activeFTPConn[key]);
            }).on('error', (err) => {
                // Console.err({message:`${FTPVO.title(ftpInfo)},${err.message}`});
                this.closeFTP(ftpInfo);
                reject(err);
                // resolve(null)
            }).on('end', () => {
                if (this.activeFTPConn[key]) {
                    this.activeFTPConn[key].client.destroy();
                    delete this.activeFTPConn[key];
                }
            }).connect(Object.assign(Object.assign({}, ftpInfo.ftp), option));
        });
    }
    static verifyFTP(ftpInfo) {
        let key = ftpInfo.id;
        if (this.activeFTPConn[key]) {
            return Promise.resolve(this.activeFTPConn[key]);
        }
        return Promise.resolve({ client: null });
    }
    static closeFTP(ftpInfo) {
        let key = ftpInfo.id;
        if (this.activeFTPConn[key]) {
            this.activeFTPConn[key].client.end();
            if (this.activeFTPConn[key]) {
                this.activeFTPConn[key].client.destroy();
                delete this.activeFTPConn[key];
            }
        }
        return Promise.resolve({ client: null });
    }
    static put(ftpInfo, lfile, rfile) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${FTPVO.title(ftpInfo)}`);
                this.closeFTP(ftpInfo);
            }, 8000);
            const { client } = yield this.get(ftpInfo);
            client.put(lfile, rfile, err => {
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
    static rename(ftpInfo, oldname, newname) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${FTPVO.title(ftpInfo)}`);
                this.closeFTP(ftpInfo);
            }, 8000);
            const { client } = yield this.get(ftpInfo);
            client.rename(oldname, newname, err => {
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
    static list(ftpInfo, rforder) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(null);
                mark = null;
                Console.info(`Timeout ${FTPVO.title(ftpInfo)}`);
                this.closeFTP(ftpInfo);
            }, 8000);
            const { client } = yield this.get(ftpInfo);
            client.list(rforder, (err, list) => {
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
    static rmdir(ftpInfo, rforder) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${FTPVO.title(ftpInfo)}`);
                this.closeFTP(ftpInfo);
            }, 8000);
            const { client } = yield this.get(ftpInfo);
            client.rmdir(rforder, (err) => {
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
    static mkdir(ftpInfo, rforder) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${FTPVO.title(ftpInfo)}`);
                this.closeFTP(ftpInfo);
            }, 8000);
            const { client } = yield this.get(ftpInfo);
            client.mkdir(rforder, (err) => {
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
    static delete(ftpInfo, rfile) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let mark = setTimeout(() => {
                resolve(false);
                mark = null;
                Console.info(`Timeout ${FTPVO.title(ftpInfo)}`);
                this.closeFTP(ftpInfo);
            }, 8000);
            const { client } = yield this.get(ftpInfo);
            client.delete(rfile, (err) => {
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
exports.FTPConn = FTPConn;
FTPConn.activeFTPConn = {};
