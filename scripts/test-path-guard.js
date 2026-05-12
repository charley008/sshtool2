"use strict";

const assert = require("assert");
const {
    joinRemotePath,
    validateLocalSavePath,
    validateRemoteName,
    validateRemoteOperationPath,
} = require("../src/utils/path-guard.js");

assert.strictEqual(validateRemoteName("中文 文件.txt").ok, true);
assert.strictEqual(validateRemoteName("name with spaces").ok, true);
assert.strictEqual(validateRemoteName("").ok, false);
assert.strictEqual(validateRemoteName("   ").ok, false);
assert.strictEqual(validateRemoteName("../test").ok, false);
assert.strictEqual(validateRemoteName("a/b").ok, false);
assert.strictEqual(validateRemoteOperationPath("/home/root/中文 文件.txt").ok, true);
assert.strictEqual(validateRemoteOperationPath("/home/root/../test").ok, false);
assert.strictEqual(joinRemotePath("/home/root", "中文 文件.txt"), "/home/root/中文 文件.txt");

const local = validateLocalSavePath("C:/temp/a b.txt", "C:/temp");
assert.strictEqual(local.ok, true);
assert.strictEqual(validateLocalSavePath("C:/other/a.txt", "C:/temp").ok, false);

console.log("path guard tests passed");
