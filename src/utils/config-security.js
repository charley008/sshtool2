"use strict";

const crypto = require("crypto");

const SECURE_EXPORT_FORMAT = "sshtools.secure-config";
const SECURE_EXPORT_VERSION = 1;
const KDF_ITERATIONS = 210000;

function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(String(password), salt, KDF_ITERATIONS, 32, "sha256");
}

function createEncryptedExport(configvos, password) {
    if (!password) {
        throw new Error("Export password is required");
    }

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = deriveKey(password, salt);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const payload = Buffer.from(JSON.stringify(configvos || {}, null, 0), "utf8");
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        format: SECURE_EXPORT_FORMAT,
        version: SECURE_EXPORT_VERSION,
        createdAt: new Date().toISOString(),
        algorithm: "aes-256-gcm",
        kdf: "pbkdf2-sha256",
        iterations: KDF_ITERATIONS,
        salt: salt.toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        data: encrypted.toString("base64"),
    };
}

function isEncryptedExport(value) {
    return !!value && typeof value === "object" && value.format === SECURE_EXPORT_FORMAT;
}

function decryptExport(value, password) {
    if (!isEncryptedExport(value)) {
        return value;
    }
    if (!password) {
        throw new Error("Export password is required");
    }
    if (value.version !== SECURE_EXPORT_VERSION) {
        throw new Error(`Unsupported secure export version: ${value.version}`);
    }

    const salt = Buffer.from(value.salt || "", "base64");
    const iv = Buffer.from(value.iv || "", "base64");
    const tag = Buffer.from(value.tag || "", "base64");
    const encrypted = Buffer.from(value.data || "", "base64");
    const key = deriveKey(password, salt);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted);
}

module.exports = {
    SECURE_EXPORT_FORMAT,
    createEncryptedExport,
    decryptExport,
    isEncryptedExport,
};
