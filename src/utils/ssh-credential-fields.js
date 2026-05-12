"use strict";

const SSH_CREDENTIAL_FIELDS = ["password", "privates", "privateKey", "passphrase"];

function clonePlain(value) {
    if (!value || typeof value !== "object") {
        return value;
    }
    return JSON.parse(JSON.stringify(value));
}

function getSshConfig(sshInfo) {
    return sshInfo && sshInfo.ssh && typeof sshInfo.ssh === "object" ? sshInfo.ssh : null;
}

function hasSshCredentialInput(sshInfo) {
    const ssh = getSshConfig(sshInfo);
    if (!ssh) {
        return false;
    }
    return SSH_CREDENTIAL_FIELDS.some((field) => ssh[field] !== undefined && ssh[field] !== null && ssh[field] !== "");
}

function pickSshCredentials(sshInfo) {
    const ssh = getSshConfig(sshInfo);
    const credentials = {};
    if (!ssh) {
        return credentials;
    }
    for (const field of SSH_CREDENTIAL_FIELDS) {
        const value = ssh[field];
        if (value !== undefined && value !== null && value !== "") {
            credentials[field] = value;
        }
    }
    return credentials;
}

function stripSshCredentials(sshInfo) {
    const result = clonePlain(sshInfo);
    const ssh = getSshConfig(result);
    if (!ssh) {
        return result;
    }
    for (const field of SSH_CREDENTIAL_FIELDS) {
        ssh[field] = "";
    }
    return result;
}

function mergeSshCredentials(sshInfo, credentials) {
    const result = clonePlain(sshInfo);
    if (!result.ssh || typeof result.ssh !== "object") {
        result.ssh = {};
    }
    const ssh = result.ssh;
    for (const field of SSH_CREDENTIAL_FIELDS) {
        if (ssh[field] !== undefined && ssh[field] !== null && ssh[field] !== "") {
            continue;
        }
        if (credentials && credentials[field] !== undefined && credentials[field] !== null && credentials[field] !== "") {
            ssh[field] = credentials[field];
        }
    }
    return result;
}

module.exports = {
    SSH_CREDENTIAL_FIELDS,
    hasSshCredentialInput,
    mergeSshCredentials,
    pickSshCredentials,
    stripSshCredentials,
};
