"use strict";

function isValidMessageType(type) {
    return typeof type === "string" && /^[A-Z0-9_.:-]+$/i.test(type) && type.length <= 80;
}

function normalizeWebviewMessage(message) {
    if (!message || typeof message !== "object") {
        return null;
    }
    if (!isValidMessageType(message.type)) {
        return null;
    }
    return {
        type: message.type,
        content: message.content,
    };
}

function createTypeAllowList(types) {
    return new Set(Array.isArray(types) ? types : []);
}

function isAllowedType(type, allowList) {
    if (!allowList || allowList.size === 0) {
        return true;
    }
    return allowList.has(type);
}

const WEBVIEW_ALLOWED_MESSAGE_TYPES = createTypeAllowList([
    "init",
    "new",
    "load",
    "insert",
    "edit",
    "delete",
    "start",
    "shutdown",
    "data",
    "resize",
    "openLink",
    "openLog",
    "initTerminal",
    "WEBVIEW_ERROR",
    "CONNECT_SSH_INFO_CONNECT",
    "CONNECT_SSH_INFO_SAVE",
    "CONNECT_SSH_INFO_REFRESH",
    "CONNECT_FTP_INFO_CONNECT",
    "CONNECT_FTP_INFO_SAVE",
    "EXPORT_CONFIGS",
    "EXPORT_JSON_CONFIGS",
    "IMPORT_FILE_CONFIGS",
]);

function isAllowedWebviewType(type) {
    if (typeof type !== "string") {
        return false;
    }
    if (/^route-[A-Za-z0-9_-]+$/.test(type)) {
        return true;
    }
    return isAllowedType(type, WEBVIEW_ALLOWED_MESSAGE_TYPES);
}

module.exports = {
    createTypeAllowList,
    isAllowedWebviewType,
    isAllowedType,
    isValidMessageType,
    normalizeWebviewMessage,
    WEBVIEW_ALLOWED_MESSAGE_TYPES,
};
