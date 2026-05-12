"use strict";

const assert = require("assert");
const {
    SSH_CREDENTIAL_FIELDS,
    hasSshCredentialInput,
    mergeSshCredentials,
    stripSshCredentials,
} = require("../src/utils/ssh-credential-fields.js");
const { CredentialService } = require("../src/services/credential-service.js");
const { SSHCredentialService } = require("../src/services/ssh-credential-service.js");

function sampleSshInfo() {
    return {
        id: "ssh-1",
        name: "demo",
        ssh: {
            host: "example.com",
            port: 22,
            username: "root",
            ostype: "linux",
            password: "secret",
            privates: "PRIVATE",
            privateKey: "PRIVATE",
            passphrase: "phrase",
            jump: { enabled: false, sshId: "" },
        },
    };
}

{
    const sanitized = stripSshCredentials(sampleSshInfo());
    assert.strictEqual(sanitized.ssh.password, "");
    assert.strictEqual(sanitized.ssh.privates, "");
    assert.strictEqual(sanitized.ssh.privateKey, "");
    assert.strictEqual(sanitized.ssh.passphrase, "");
    assert.strictEqual(sanitized.ssh.host, "example.com");
    assert.strictEqual(sanitized.ssh.username, "root");
}

{
    const source = stripSshCredentials(sampleSshInfo());
    const merged = mergeSshCredentials(source, {
        password: "stored",
        privateKey: "stored-key",
        passphrase: "stored-passphrase",
    });
    assert.strictEqual(merged.ssh.password, "stored");
    assert.strictEqual(merged.ssh.privateKey, "stored-key");
    assert.strictEqual(merged.ssh.privates, "");
    assert.strictEqual(merged.ssh.passphrase, "stored-passphrase");
}

{
    const source = sampleSshInfo();
    source.ssh.password = "typed";
    const merged = mergeSshCredentials(source, { password: "stored" });
    assert.strictEqual(merged.ssh.password, "typed");
}

{
    assert.strictEqual(hasSshCredentialInput(sampleSshInfo()), true);
    assert.strictEqual(hasSshCredentialInput(stripSshCredentials(sampleSshInfo())), false);
    assert.deepStrictEqual(SSH_CREDENTIAL_FIELDS, ["password", "privates", "privateKey", "passphrase"]);
}

console.log("ssh credential helper tests passed");

(async () => {
    const values = new Map();
    CredentialService.init({
        secrets: {
            get: async (key) => values.get(key),
            store: async (key, value) => values.set(key, value),
            delete: async (key) => values.delete(key),
        },
    });

    await SSHCredentialService.saveFrom(sampleSshInfo());
    assert.strictEqual(values.get("sshtools:ssh:ssh-1:password"), "secret");
    assert.strictEqual(values.has("sshtools:ssh:ssh-1:privateKey"), false);

    const keyInfo = sampleSshInfo();
    keyInfo.ssh.password = "";
    await SSHCredentialService.saveFrom(keyInfo);
    assert.strictEqual(values.has("sshtools:ssh:ssh-1:password"), false);
    assert.strictEqual(values.get("sshtools:ssh:ssh-1:privateKey"), "PRIVATE");
    assert.strictEqual(values.get("sshtools:ssh:ssh-1:passphrase"), "phrase");

    const sanitized = stripSshCredentials(sampleSshInfo());
    const hydrated = await SSHCredentialService.hydrate(sanitized);
    assert.strictEqual(hydrated.ssh.privateKey, "PRIVATE");
    assert.strictEqual(hydrated.ssh.passphrase, "phrase");

    await SSHCredentialService.deleteMany(["ssh-1"]);
    assert.strictEqual(values.has("sshtools:ssh:ssh-1:privateKey"), false);
    assert.strictEqual(values.has("sshtools:ssh:ssh-1:passphrase"), false);

    console.log("ssh credential service tests passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
