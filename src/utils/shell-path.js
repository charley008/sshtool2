"use strict";

function directoryCommand(value, windows = false) {
    const remote = String(value);
    if (/[\r\n\x00]/.test(remote)) throw new Error("Unsupported terminal path.");
    if (windows) {
        if (/["%!]/.test(remote)) throw new Error("Unsupported Windows terminal path.");
        const path = /^\/[a-z]:/i.test(remote) ? remote.slice(1) : remote;
        return `cd /d "${path}"\r\n`;
    }
    return "cd -- '" + remote.replace(/'/g, "'\\''") + "'\n";
}
exports.directoryCommand = directoryCommand;
