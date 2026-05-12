"use strict";

const SENSITIVE_FIELD_NAMES = new Set([
    "password",
    "privateKey",
    "privates",
    "passphrase",
]);

const MASK_VALUE = "******";

function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}

function cloneWithSensitiveHandling(value, mode, seen = new WeakMap()) {
    if (Array.isArray(value)) {
        return value.map(item => cloneWithSensitiveHandling(item, mode, seen));
    }
    if (!isPlainObject(value)) {
        return value;
    }
    if (seen.has(value)) {
        return seen.get(value);
    }

    const result = {};
    seen.set(value, result);

    for (const key of Object.keys(value)) {
        if (SENSITIVE_FIELD_NAMES.has(key)) {
            if (mode === "omit") {
                continue;
            }
            result[key] = value[key] ? MASK_VALUE : value[key];
            continue;
        }
        result[key] = cloneWithSensitiveHandling(value[key], mode, seen);
    }

    return result;
}

function maskSensitive(value) {
    return cloneWithSensitiveHandling(value, "mask");
}

function omitSensitive(value) {
    return cloneWithSensitiveHandling(value, "omit");
}

function hasSensitiveValue(value, seen = new WeakSet()) {
    if (Array.isArray(value)) {
        return value.some(item => hasSensitiveValue(item, seen));
    }
    if (!isPlainObject(value)) {
        return false;
    }
    if (seen.has(value)) {
        return false;
    }
    seen.add(value);

    for (const key of Object.keys(value)) {
        if (SENSITIVE_FIELD_NAMES.has(key) && value[key]) {
            return true;
        }
        if (hasSensitiveValue(value[key], seen)) {
            return true;
        }
    }

    return false;
}

module.exports = {
    MASK_VALUE,
    SENSITIVE_FIELD_NAMES,
    hasSensitiveValue,
    maskSensitive,
    omitSensitive,
};
