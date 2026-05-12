"use strict";

const vscode = require("vscode");
const { Storage } = require("../storage/storage.js");

const HOST_HASH_ALGORITHM = "sha256";

function normalizeHost(sshInfo) {
    const ssh = sshInfo && sshInfo.ssh ? sshInfo.ssh : {};
    const host = String(ssh.host || "").trim().toLowerCase();
    const port = Number(ssh.port || 22);
    return { host, port: Number.isFinite(port) && port > 0 ? port : 22 };
}

function hostKeyId(sshInfo) {
    const { host, port } = normalizeHost(sshInfo);
    return host ? `${host}:${port}` : "";
}

function formatFingerprint(fingerprint) {
    const value = String(fingerprint || "");
    return value.replace(/(.{2})/g, "$1:").replace(/:$/, "");
}

class SSHHostKeyService {
    static createVerifier(sshInfo) {
        const id = hostKeyId(sshInfo);
        if (!id) {
            return {};
        }
        return {
            hostHash: HOST_HASH_ALGORITHM,
            hostVerifier: (fingerprint, callback) => {
                this.verify(id, fingerprint).then(callback).catch(() => callback(false));
            },
        };
    }

    static async verify(id, fingerprint) {
        const value = String(fingerprint || "");
        if (!id || !value) {
            return false;
        }

        const hostKeys = Storage.get_ssh_host_keys();
        const existing = hostKeys[id];
        if (!existing || !existing.fingerprint) {
            hostKeys[id] = { algorithm: HOST_HASH_ALGORITHM, fingerprint: value, updatedAt: new Date().toISOString() };
            Storage.update_ssh_host_keys(hostKeys);
            return true;
        }

        if (existing.fingerprint === value) {
            return true;
        }

        const choice = await vscode.window.showWarningMessage(
            `SSH HostKey 指纹发生变化：${id}\n旧指纹：${formatFingerprint(existing.fingerprint)}\n新指纹：${formatFingerprint(value)}\n如果不是你刚刚重装或更换了服务器，请取消连接。`,
            { modal: true },
            "取消连接",
            "信任并更新"
        );
        if (choice !== "信任并更新") {
            return false;
        }
        hostKeys[id] = { algorithm: HOST_HASH_ALGORITHM, fingerprint: value, updatedAt: new Date().toISOString() };
        Storage.update_ssh_host_keys(hostKeys);
        return true;
    }
}

exports.HOST_HASH_ALGORITHM = HOST_HASH_ALGORITHM;
exports.SSHHostKeyService = SSHHostKeyService;
exports.formatFingerprint = formatFingerprint;
exports.hostKeyId = hostKeyId;
