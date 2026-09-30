"use strict";

class AsyncQueue {
    constructor() { this.tail = Promise.resolve(); this.closed = false; this.size = 0; }
    run(action) {
        this.size++;
        const task = this.tail.then(() => {
            if (this.closed) throw new Error("Connection closed.");
            return action();
        });
        this.tail = task.catch(() => {});
        return task.finally(() => { this.size--; });
    }
    close() { this.closed = true; }
}
exports.AsyncQueue = AsyncQueue;
