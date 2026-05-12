"use strict";

const assert = require("assert");
const {
    FTP_CREDENTIAL_FIELDS,
    mergeFtpCredentials,
    stripFtpCredentials,
} = require("../src/utils/ftp-credential-fields.js");
const { CredentialService } = require("../src/services/credential-service.js");
const { FTPCredentialService } = require("../src/services/ftp-credential-service.js");

function sampleFtpInfo() {
    return {
        id: "ftp-1",
        name: "demo",
        ftp: {
            host: "example.com",
            port: 21,
            user: "root",
            password: "secret",
            secure: false,
        },
    };
}

{
    const sanitized = stripFtpCredentials(sampleFtpInfo());
    assert.strictEqual(sanitized.ftp.password, "");
    assert.strictEqual(sanitized.ftp.host, "example.com");
    assert.strictEqual(sanitized.ftp.user, "root");
}

{
    const source = stripFtpCredentials(sampleFtpInfo());
    const merged = mergeFtpCredentials(source, { password: "stored" });
    assert.strictEqual(merged.ftp.password, "stored");
}

{
    const source = sampleFtpInfo();
    source.ftp.password = "typed";
    const merged = mergeFtpCredentials(source, { password: "stored" });
    assert.strictEqual(merged.ftp.password, "typed");
    assert.deepStrictEqual(FTP_CREDENTIAL_FIELDS, ["password"]);
}

console.log("ftp credential helper tests passed");

(async () => {
    const values = new Map();
    CredentialService.init({
        secrets: {
            get: async (key) => values.get(key),
            store: async (key, value) => values.set(key, value),
            delete: async (key) => values.delete(key),
        },
    });

    await FTPCredentialService.saveFrom(sampleFtpInfo());
    assert.strictEqual(values.get("sshtools:ftp:ftp-1:password"), "secret");

    const hydrated = await FTPCredentialService.hydrate(stripFtpCredentials(sampleFtpInfo()));
    assert.strictEqual(hydrated.ftp.password, "secret");

    await FTPCredentialService.deleteMany(["ftp-1"]);
    assert.strictEqual(values.has("sshtools:ftp:ftp-1:password"), false);

    console.log("ftp credential service tests passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
