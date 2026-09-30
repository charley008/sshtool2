"use strict";

const vscode = require("vscode");
const { StringDecoder } = require("string_decoder");
const { SSHConn } = require("../connections/ssh-connection.js");
const { SSHCredentialService } = require("./ssh-credential-service.js");
const { Console } = require("../ui/console.js");
const Localize = require("../ui/localize.js").default;

function quote(value) { return "'" + value.replace(/'/g, "'\\''") + "'"; }

class SudoSaveService {
    static async isLinux(info, connection = null) {
        const configured = String(info && info.ssh && info.ssh.ostype || "").toLowerCase();
        if (configured && !["linux", "ubuntu", "debian"].includes(configured)) return false;
        try {
            const { client } = connection || await SSHConn.get(info, false);
            const result = await this.exec(client, "uname -s", undefined, 10000);
            return result.code === 0 && result.stdout.trim() === "Linux";
        } catch { return false; }
    }

    static call(sftp, method, ...args) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Object.assign(new Error("SFTP operation timed out."), { remoteCompletionUnknown: true })), this.timeout);
            try {
                sftp[method](...args, (error, result) => {
                    clearTimeout(timer);
                    if (error) reject(error); else resolve(result);
                });
            } catch (error) { clearTimeout(timer); reject(error); }
        });
    }

    static exec(client, command, input, timeoutMs = this.timeout) {
        return new Promise((resolve, reject) => {
            let channel, settled = false, stdout = "", stderr = "";
            const outDecoder = new StringDecoder("utf8"), errDecoder = new StringDecoder("utf8");
            const finish = (error, result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (error) reject(error); else resolve(result);
            };
            const timer = setTimeout(() => {
                finish(Object.assign(new Error("Sudo save command timed out; remote completion is unknown."), { remoteCompletionUnknown: true }));
                if (channel) channel.destroy();
            }, timeoutMs);
            try { client.exec(command, (error, stream) => {
                if (settled) { if (stream) stream.destroy(); return; }
                if (error) { finish(error); return; }
                channel = stream;
                stream.on("data", data => { stdout = (stdout + outDecoder.write(data)).slice(-8192); });
                stream.stderr.on("data", data => { stderr = (stderr + errDecoder.write(data)).slice(-8192); });
                stream.on("error", error => finish(Object.assign(error, { remoteCompletionUnknown: true })));
                stream.on("close", code => finish(null, { code, stdout: stdout + outDecoder.end(), stderr: stderr + errDecoder.end() }));
                // No password appears in a command, log or stored connection. EOF
                // also prevents sudo from waiting indefinitely after a bad password.
                try { stream.end(input === undefined ? undefined : input + "\n"); }
                catch (error) { finish(Object.assign(error, { remoteCompletionUnknown: true })); stream.destroy(); }
            }); } catch (error) { finish(error); }
        });
    }

    static async cleanup(client, directory) {
        if (!/^\/tmp\/sshtools2-save\.[A-Za-z0-9]+$/.test(directory)) throw new Error("Invalid sudo save temporary directory.");
        // These exact files live in the user's private directory. Unprivileged
        // cleanup uses a separate channel and cannot keep a completed save open.
        const command = `rm -f -- ${quote(directory + "/content")} ${quote(directory + "/original")} && rmdir -- ${quote(directory)}`;
        const result = await this.exec(client, command, undefined, this.cleanupTimeout);
        if (result.code !== 0) throw new Error(result.stderr || "Temporary file cleanup failed.");
    }

    static async save(info, local, remote) {
        let password, directory, sftp, client, backupReady = false, keepBackup = false;
        const redact = value => password ? String(value).split(password).join("[redacted]") : String(value);
        try {
            if (typeof remote !== "string" || !remote.startsWith("/") || /[\x00-\x1f\x7f]/.test(remote) ||
                remote.split("/").includes("..")) throw new Error(Localize("sshtool.msg.sudo.save.path"));
            const connection = await SSHConn.get(info);
            if (!await this.isLinux(info, connection)) throw new Error(Localize("sshtool.msg.sudo.save.linux"));
            sftp = connection.sftp;
            client = connection.client;
            // Resolve symlinks once so both backup and write address the same file.
            const target = await this.call(sftp, "realpath", remote);
            if (typeof target !== "string" || !target.startsWith("/") || /[\x00-\x1f\x7f]/.test(target)) {
                throw new Error(Localize("sshtool.msg.sudo.save.path"));
            }
            const attrs = await this.call(sftp, "lstat", target);
            if (!attrs.isFile()) throw new Error(Localize("sshtool.msg.sudo.save.path"));
            const temp = await this.exec(client, "umask 077; mktemp -d /tmp/sshtools2-save.XXXXXXXXXX");
            if (temp.code !== 0 || !/^\/tmp\/sshtools2-save\.[A-Za-z0-9]+$/.test(temp.stdout.trim())) {
                throw new Error(Localize("sshtool.msg.sudo.save.temp"));
            }
            directory = temp.stdout.trim();
            const payload = directory + "/content", backup = directory + "/original";
            await this.call(sftp, "fastPut", local, payload, { mode: 0o600 });
            const sudo = async command => {
                // -k ignores cached sudo credentials and does not create a new
                // timestamp for this command. Each save needs its own authorization.
                const flags = password === undefined ? "-k -n" : "-k -S -p ''";
                const result = await this.exec(client, `LC_ALL=C sudo ${flags} ${command}`, password);
                if (result.code !== 0) {
                    const error = new Error(redact(result.stderr || result.stdout || `sudo exited with code ${result.code}`));
                    error.completed = typeof result.code === "number";
                    error.remoteCompletionUnknown = !error.completed;
                    throw error;
                }
            };
            const backupCommand = `cp -p -- ${quote(target)} ${quote(backup)}`;
            try { await sudo(backupCommand); }
            catch (error) {
                if (!/password.*required|a password is required|no tty present|terminal is required/i.test(error.message)) throw error;
                // Reuse only this target connection's login password. Private keys
                // and their passphrases authenticate SSH, not sudo.
                const configuredPassword = await SSHCredentialService.getLoginPassword(info);
                let backedUp = false;
                let passwordPrompt = Localize("sshtool.msg.sudo.save.password.missing", remote);
                if (typeof configuredPassword === "string" && configuredPassword && !/[\r\n\x00]/.test(configuredPassword)) {
                    password = configuredPassword;
                    try { await sudo(backupCommand); backedUp = true; }
                    catch (credentialError) {
                        if (!credentialError.completed || !/sorry, try again|incorrect password|authentication failure|no password was provided/i.test(credentialError.message)) throw credentialError;
                        passwordPrompt = Localize("sshtool.msg.sudo.save.password.rejected", remote);
                    }
                }
                if (!backedUp) {
                    password = await vscode.window.showInputBox({
                        password: true, ignoreFocusOut: true,
                        title: Localize("sshtool.msg.sudo.save.button"),
                        prompt: passwordPrompt,
                        validateInput: value => value && !/[\r\n\x00]/.test(value) ? null : Localize("sshtool.msg.sudo.save.password.required"),
                    });
                    if (password === undefined) return false;
                    if (!password || /[\r\n\x00]/.test(password)) throw new Error(Localize("sshtool.msg.sudo.save.password.required"));
                    await sudo(backupCommand);
                }
            }
            backupReady = true;
            keepBackup = true;
            // No -p/-f/--remove-destination: update the existing file without
            // copying the temporary file's ownership or deleting the target.
            try {
                await sudo(`cp -- ${quote(payload)} ${quote(target)}`);
                await sudo(`cmp -- ${quote(payload)} ${quote(target)}`);
                const after = await this.call(sftp, "lstat", target);
                if ((after.mode & 0o7777) !== (attrs.mode & 0o7777)) {
                    await sudo(`chmod ${(attrs.mode & 0o7777).toString(8)} -- ${quote(target)}`);
                }
                keepBackup = false;
            } catch (error) {
                // Restore only when a remote command has definitely finished;
                // a lost channel/timeout may still have an active remote writer.
                if (error.completed) {
                    let restored = false;
                    try {
                        await sudo(`cp -p -- ${quote(backup)} ${quote(target)}`);
                        await sudo(`cmp -- ${quote(backup)} ${quote(target)}`);
                        keepBackup = false;
                        restored = true;
                    } catch { /* Retain the backup when recovery cannot be verified. */ }
                    if (restored) throw new Error(Localize("sshtool.msg.sudo.save.restored", redact(error.message)));
                }
                throw error;
            }
            SSHConn.clearListCache(info);
            return true;
        } catch (error) {
            if (directory && error.remoteCompletionUnknown) keepBackup = true;
            const recovery = keepBackup ? "\n" + (backupReady
                ? Localize("sshtool.msg.sudo.save.backup", directory + "/original")
                : Localize("sshtool.msg.sudo.save.retained", directory)) : "";
            Console.err(new Error(Localize("sshtool.msg.sudo.save.failed", redact(error.message)) + recovery));
            return false;
        } finally {
            password = undefined;
            if (directory && !keepBackup) {
                // No password is retained by this background operation. A cleanup
                // failure leaves only private recovery files, not a stuck save.
                this.cleanup(client, directory).catch(error => Console.debug(`Sudo save cleanup: ${directory}: ${error.message}`));
            }
        }
    }
}
SudoSaveService.timeout = 120000;
SudoSaveService.cleanupTimeout = 5000;
exports.SudoSaveService = SudoSaveService;
