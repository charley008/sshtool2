// BaseDT - base class for all Data Transfer Objects
"use strict";

class BaseDT {
    static init(context) {
        this.context = context;
        this.storagePath = context.globalStorageUri ? context.globalStorageUri.fsPath : context.extensionPath;
    }
}
exports.BaseDT = BaseDT;

