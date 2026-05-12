"use strict";

const { CredentialService } = require("./credential-service.js");
const {
    FTP_CREDENTIAL_FIELDS,
    mergeFtpCredentials,
    pickFtpCredentials,
    stripFtpCredentials,
} = require("../utils/ftp-credential-fields.js");

class FTPCredentialService {
    static async load(id) {
        const credentials = {};
        if (!id || !CredentialService.isReady()) {
            return credentials;
        }
        for (const field of FTP_CREDENTIAL_FIELDS) {
            const value = await CredentialService.get("ftp", id, field);
            if (value !== undefined && value !== null && value !== "") {
                credentials[field] = value;
            }
        }
        return credentials;
    }

    static async hydrate(ftpInfo) {
        if (!ftpInfo || !ftpInfo.id) {
            return ftpInfo;
        }
        const ftp = ftpInfo.ftp || {};
        if (ftp.password) {
            return mergeFtpCredentials(ftpInfo, {});
        }
        return mergeFtpCredentials(ftpInfo, await this.load(ftpInfo.id));
    }

    static async saveFrom(ftpInfo) {
        if (!ftpInfo || !ftpInfo.id || !CredentialService.isReady()) {
            return false;
        }
        const credentials = pickFtpCredentials(ftpInfo);
        if (!credentials.password) {
            return true;
        }
        await CredentialService.store("ftp", ftpInfo.id, "password", credentials.password);
        return true;
    }

    static sanitize(ftpInfo) {
        return stripFtpCredentials(ftpInfo);
    }

    static async delete(id) {
        if (!id || !CredentialService.isReady()) {
            return false;
        }
        return CredentialService.deleteFields("ftp", id, FTP_CREDENTIAL_FIELDS);
    }

    static async deleteMany(ids) {
        if (!Array.isArray(ids)) {
            return false;
        }
        for (const id of ids) {
            await this.delete(id);
        }
        return true;
    }
}

exports.FTPCredentialService = FTPCredentialService;
