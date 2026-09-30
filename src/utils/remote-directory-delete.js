"use strict";

const path = require("path").posix;

function deletionPath(value) {
    const input = String(value || "").replace(/\\/g, "/");
    const normalized = path.normalize(input);
    if (!input.trim() || /[\x00-\x1f]/.test(input) || input.split("/").includes("..") ||
        normalized === "." || normalized === "/" || /^\/?[a-z]:\/?$/i.test(normalized)) {
        throw new Error("Refusing to recursively delete an unsafe path or filesystem root.");
    }
    return normalized.replace(/\/$/, "");
}

async function removeRemoteDirectory(adapter, remotePath, timeout = 10000) {
    const root = deletionPath(remotePath);
    async function request(method, target) {
        let timer;
        try {
            return await Promise.race([
                Promise.resolve().then(() => adapter[method](target)),
                new Promise((_, reject) => { timer = setTimeout(() => {
                    adapter.close();
                    reject(Object.assign(new Error("Remote deletion request timed out."), { code: "ETIMEDOUT" }));
                }, timeout); }),
            ]);
        } catch (error) {
            const failure = new Error(error && error.message ? error.message : String(error));
            failure.code = error && error.code;
            failure.remotePath = target;
            failure.remoteMethod = method;
            throw failure;
        } finally { clearTimeout(timer); }
    }
    async function visit(target, depth) {
        if (depth > 128) throw Object.assign(new Error("Remote directory nesting exceeds the safety limit."), { remotePath: target });
        // Inspect each entry without following symlinks, including the selected root.
        const kind = await request("kind", target);
        if (kind !== "directory") {
            if (kind !== "file" && kind !== "link") throw Object.assign(new Error("Unsupported remote entry type."), { remotePath: target });
            await request("unlink", target);
            return;
        }
        const entries = await request("list", target);
        for (const name of entries) {
            if (name === "." || name === "..") continue;
            if (typeof name !== "string" || !name || /[\/\\\x00-\x1f]/.test(name)) {
                throw Object.assign(new Error("Unsafe name in remote directory listing."), { remotePath: target });
            }
            await visit(path.join(target, name), depth + 1);
        }
        await request("rmdir", target);
    }
    await visit(root, 0);
    return true;
}

exports.deletionPath = deletionPath;
exports.removeRemoteDirectory = removeRemoteDirectory;
