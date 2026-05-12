"use strict";

const { CredentialService } = require("./credential-service.js");
const {
    SSH_CREDENTIAL_FIELDS,
    mergeSshCredentials,
    pickSshCredentials,
    stripSshCredentials,
} = require("../utils/ssh-credential-fields.js");

class SSHCredentialService {
    static async load(id) {
        const credentials = {};
        if (!id || !CredentialService.isReady()) {
            return credentials;
        }
        for (const field of SSH_CREDENTIAL_FIELDS) {
            const value = await CredentialService.get("ssh", id, field);
            if (value !== undefined && value !== null && value !== "") {
                credentials[field] = value;
            }
        }
        return credentials;
    }

    static async hydrate(sshInfo) {
        if (!sshInfo || !sshInfo.id) {
            return sshInfo;
        }
        const ssh = sshInfo.ssh || {};
        if (ssh.password) {
            return mergeSshCredentials(sshInfo, {});
        }
        const credentials = await this.load(sshInfo.id);
        if (ssh.privateKey || ssh.privates) {
            return mergeSshCredentials(sshInfo, { passphrase: credentials.passphrase });
        }
        if (ssh.passphrase) {
            return mergeSshCredentials(sshInfo, {
                privateKey: credentials.privateKey,
                privates: credentials.privates,
            });
        }
        return mergeSshCredentials(sshInfo, credentials);
    }

    static async saveFrom(sshInfo) {
        if (!sshInfo || !sshInfo.id || !CredentialService.isReady()) {
            return false;
        }
        const credentials = pickSshCredentials(sshInfo);
        const hasPassword = !!credentials.password;
        const hasKey = !!(credentials.privateKey || credentials.privates);
        const hasPassphrase = !!credentials.passphrase;

        if (!hasPassword && !hasKey && !hasPassphrase) {
            return true;
        }

        if (hasPassword) {
            await CredentialService.store("ssh", sshInfo.id, "password", credentials.password);
            await CredentialService.delete("ssh", sshInfo.id, "privates");
            await CredentialService.delete("ssh", sshInfo.id, "privateKey");
            await CredentialService.delete("ssh", sshInfo.id, "passphrase");
            return true;
        }

        await CredentialService.delete("ssh", sshInfo.id, "password");
        if (credentials.privates) {
            await CredentialService.store("ssh", sshInfo.id, "privates", credentials.privates);
        }
        if (credentials.privateKey) {
            await CredentialService.store("ssh", sshInfo.id, "privateKey", credentials.privateKey);
        }
        if (hasPassphrase) {
            await CredentialService.store("ssh", sshInfo.id, "passphrase", credentials.passphrase);
        } else if (hasKey) {
            await CredentialService.delete("ssh", sshInfo.id, "passphrase");
        }
        return true;
    }

    static sanitize(sshInfo) {
        return stripSshCredentials(sshInfo);
    }

    static async delete(id) {
        if (!id || !CredentialService.isReady()) {
            return false;
        }
        return CredentialService.deleteFields("ssh", id, SSH_CREDENTIAL_FIELDS);
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

exports.SSHCredentialService = SSHCredentialService;
