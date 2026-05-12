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

module.exports = {
    createTypeAllowList,
    isAllowedType,
    isValidMessageType,
    normalizeWebviewMessage,
};
