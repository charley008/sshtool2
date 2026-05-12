"use strict";

const FTP_CREDENTIAL_FIELDS = ["password"];

function clonePlain(value) {
    if (!value || typeof value !== "object") {
        return value;
    }
    return JSON.parse(JSON.stringify(value));
}

function getFtpConfig(ftpInfo) {
    return ftpInfo && ftpInfo.ftp && typeof ftpInfo.ftp === "object" ? ftpInfo.ftp : null;
}

function pickFtpCredentials(ftpInfo) {
    const ftp = getFtpConfig(ftpInfo);
    const credentials = {};
    if (!ftp) {
        return credentials;
    }
    for (const field of FTP_CREDENTIAL_FIELDS) {
        const value = ftp[field];
        if (value !== undefined && value !== null && value !== "") {
            credentials[field] = value;
        }
    }
    return credentials;
}

function stripFtpCredentials(ftpInfo) {
    const result = clonePlain(ftpInfo);
    const ftp = getFtpConfig(result);
    if (!ftp) {
        return result;
    }
    for (const field of FTP_CREDENTIAL_FIELDS) {
        ftp[field] = "";
    }
    return result;
}

function mergeFtpCredentials(ftpInfo, credentials) {
    const result = clonePlain(ftpInfo);
    if (!result.ftp || typeof result.ftp !== "object") {
        result.ftp = {};
    }
    const ftp = result.ftp;
    for (const field of FTP_CREDENTIAL_FIELDS) {
        if (ftp[field] !== undefined && ftp[field] !== null && ftp[field] !== "") {
            continue;
        }
        if (credentials && credentials[field] !== undefined && credentials[field] !== null && credentials[field] !== "") {
            ftp[field] = credentials[field];
        }
    }
    return result;
}

module.exports = {
    FTP_CREDENTIAL_FIELDS,
    mergeFtpCredentials,
    pickFtpCredentials,
    stripFtpCredentials,
};
