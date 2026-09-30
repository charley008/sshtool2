"use strict";

const localize = require("../ui/localize.js").default;

function formatRemoteOperationError(protocol, method, paths, error) {
    const raw = error && error.message ? error.message : String(error || "Unknown error");
    const code = error && error.code !== undefined ? ` [code=${error.code}]` : "";
    const target = paths.filter(value => typeof value === "string").join(" -> ");
    let message = localize("sshtool.msg.operation.failed", `${protocol} ${method}`, target || "-", raw + code);
    if (error && error.remotePath) message += "\n" + localize("sshtool.msg.operation.entry.failed", error.remotePath, error.remoteMethod || method);
    if (method === "removeDirectory") message += "\n" + localize("sshtool.msg.operation.partial.delete");
    if (method === "rmdir" || method === "removeEmptyDir") {
        message += "\n" + localize("sshtool.msg.operation.empty.directory");
    }
    if (/^(failure|unknown error)$/i.test(raw.trim())) message += "\n" + localize("sshtool.msg.operation.no.details");
    return message;
}

exports.formatRemoteOperationError = formatRemoteOperationError;
