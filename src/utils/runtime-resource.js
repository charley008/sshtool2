"use strict";

const { execFile } = require("child_process");
const { promisify } = require("util");
const execute = promisify(execFile);

async function stopResource(resource) {
    if (!resource) return;
    if (typeof resource.close === "function" && !resource.pid) {
        for (const socket of resource.sockets || []) socket.destroy();
        await new Promise((resolve, reject) => resource.close(error => error && error.code !== "ERR_SERVER_NOT_RUNNING" ? reject(error) : resolve()));
        return;
    }
    if (!resource.pid || (resource.exitCode !== undefined && resource.exitCode !== null)) return;
    try { process.kill(resource.pid, 0); }
    catch (error) { if (error.code === "ESRCH") return; if (error.code !== "EPERM") throw error; }
    if (process.platform === "win32") {
        await execute("taskkill", ["/F", "/PID", String(resource.pid), "/T"], { windowsHide: true, timeout: 5000 });
    } else {
        try { process.kill(resource.pid, "SIGTERM"); }
        catch (error) { if (error.code !== "ESRCH") throw error; }
    }
}
exports.stopResource = stopResource;
