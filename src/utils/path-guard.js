"use strict";

const path = require("path");

const INVALID_NAME_CHARS = /[\\/:*?"<>|\x00-\x1f]/;

function normalizeSeparators(value) {
    return String(value || "").replace(/\\/g, "/");
}

function validateRemoteName(name) {
    const value = String(name || "").trim();
    if (!value) {
        return { ok: false, message: "名称不能为空" };
    }
    if (value === "." || value === ".." || value.includes("/")) {
        return { ok: false, message: "名称不能包含路径分隔符或相对路径" };
    }
    if (INVALID_NAME_CHARS.test(value)) {
        return { ok: false, message: "名称包含非法字符" };
    }
    return { ok: true, value };
}

function isUnsafeRemotePath(remotePath) {
    const value = normalizeSeparators(remotePath).trim();
    if (!value) {
        return true;
    }
    return value.split("/").some((part) => part === "..");
}

function joinRemotePath(parentPath, name) {
    const base = normalizeSeparators(parentPath).replace(/\/+$/, "");
    return base ? `${base}/${name}` : `/${name}`;
}

function validateRemoteOperationPath(remotePath) {
    if (isUnsafeRemotePath(remotePath)) {
        return { ok: false, message: "远程路径不安全" };
    }
    return { ok: true, value: normalizeSeparators(remotePath) };
}

function isPathInside(parentPath, childPath) {
    const parent = path.resolve(parentPath);
    const child = path.resolve(childPath);
    const relative = path.relative(parent, child);
    return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function validateLocalSavePath(localPath, allowedRoot = null) {
    if (!localPath || !String(localPath).trim()) {
        return { ok: false, message: "本地路径不能为空" };
    }
    const resolved = path.resolve(localPath);
    if (allowedRoot && !isPathInside(allowedRoot, resolved)) {
        return { ok: false, message: "本地保存路径不在选择目录内" };
    }
    return { ok: true, value: resolved };
}

module.exports = {
    isUnsafeRemotePath,
    joinRemotePath,
    validateLocalSavePath,
    validateRemoteName,
    validateRemoteOperationPath,
};
