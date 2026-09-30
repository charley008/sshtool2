// BaseDT - base class for all Data Transfer Objects
"use strict";

class BaseDT {
    static init(context) {
        this.context = context;
        this.storagePath = context.globalStorageUri ? context.globalStorageUri.fsPath : context.extensionPath;
    }
    static write(context, key, value) {
        const snapshot = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
        let task;
        try { task = Promise.resolve(context.globalState.update(key, snapshot)); }
        catch (error) { task = Promise.reject(error); }
        BaseDT.pending.add(task);
        task.catch(error => BaseDT.errors.push(error)).finally(() => BaseDT.pending.delete(task));
        return task;
    }
    static async flush() {
        while (BaseDT.pending.size) {
            await Promise.allSettled(Array.from(BaseDT.pending));
        }
        const errors = BaseDT.errors.splice(0);
        if (errors.length) throw errors[0];
    }
}
BaseDT.pending = new Set();
BaseDT.errors = [];
exports.BaseDT = BaseDT;

