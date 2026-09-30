"use strict";

const vscode = require("vscode");
const fs = require("fs-extra");
const path = require("path");
const { randomUUID } = require("crypto");
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");
const { SSHConn } = require("../connections/ssh-connection.js");
const { FTPConn } = require("../connections/ftp-connection.js");
const { Console } = require("../ui/console.js");

class TransferService {
    static wait(promise, signal, started = () => false) {
        return new Promise((resolve, reject) => {
            const abort = () => { if (!started()) reject(signal.reason); };
            signal.addEventListener("abort", abort, { once: true });
            promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
            if (signal.aborted) abort();
        });
    }
    static async run(kind, info, local, remote, upload, title, size = 0) {
        try {
            return await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title, cancellable: true }, async (progress, token) => {
                const controller = new AbortController();
                this.controllers.add(controller);
                const cancel = () => controller.abort(new Error("Transfer cancelled."));
                const subscription = token.onCancellationRequested(cancel);
                if (token.isCancellationRequested) cancel();
                const partial = upload ? null : local + ".part-" + randomUUID();
                let timer;
                let before = 0;
                const report = bytes => {
                    clearTimeout(timer);
                    timer = setTimeout(() => controller.abort(new Error("Transfer timed out.")), this.idleTimeout);
                    const percent = size ? Math.min(100, bytes / size * 100) : 0;
                    progress.report({ increment: Math.max(0, percent - before), message: `${bytes} bytes` });
                    before = percent;
                };
                try {
                    controller.signal.throwIfAborted();
                    if (!upload) await fs.ensureDir(path.dirname(local));
                    if (kind === "ssh") {
                        const { sftp } = await this.wait(SSHConn.get(info), controller.signal);
                        controller.signal.throwIfAborted();
                        report(0);
                        let transferred = 0;
                        const meter = new Transform({ transform(chunk, encoding, callback) {
                            transferred += chunk.length;
                            report(transferred);
                            callback(null, chunk);
                        } });
                        await pipeline(upload ? fs.createReadStream(local) : sftp.createReadStream(remote), meter,
                            upload ? sftp.createWriteStream(remote) : fs.createWriteStream(partial), { signal: controller.signal });
                    } else {
                        const { client } = await this.wait(FTPConn.get(info), controller.signal);
                        let started = false;
                        const task = client.run(async raw => {
                            controller.signal.throwIfAborted();
                            started = true;
                            const abort = () => FTPConn.closeFTP(info);
                            controller.signal.addEventListener("abort", abort, { once: true });
                            raw.trackProgress(data => report(data.bytes));
                            report(0);
                            try {
                                if (upload) await raw.uploadFrom(local, remote);
                                else await raw.downloadTo(partial, remote);
                                controller.signal.throwIfAborted();
                            } finally {
                                raw.trackProgress();
                                controller.signal.removeEventListener("abort", abort);
                            }
                        });
                        await this.wait(task, controller.signal, () => started);
                    }
                    controller.signal.throwIfAborted();
                    if (partial) await fs.move(partial, local, { overwrite: true });
                    (kind === "ssh" ? SSHConn : FTPConn).clearListCache(info);
                    return true;
                } finally {
                    clearTimeout(timer);
                    subscription.dispose();
                    this.controllers.delete(controller);
                    if (partial) await fs.remove(partial);
                }
            });
        } catch (error) {
            Console.err(error);
            return false;
        }
    }
    static cancelAll() {
        for (const controller of this.controllers) controller.abort(new Error("Transfer cancelled."));
    }
}
TransferService.idleTimeout = 120000;
TransferService.controllers = new Set();
exports.TransferService = TransferService;
