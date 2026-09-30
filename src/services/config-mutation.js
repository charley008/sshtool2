"use strict";

const { AsyncQueue } = require("../utils/async-queue.js");

class ConfigMutation {
    static run(action) {
        if (this.clearing) return Promise.reject(new Error("Configuration is being cleared."));
        return this.queue.run(action);
    }
    static clear(action) {
        if (this.clearPromise) return this.clearPromise;
        this.clearing = true;
        this.epoch++;
        this.clearPromise = this.queue.run(action).finally(() => {
            this.clearing = false;
            this.clearPromise = null;
        });
        return this.clearPromise;
    }
}
ConfigMutation.queue = new AsyncQueue();
ConfigMutation.clearing = false;
ConfigMutation.clearPromise = null;
ConfigMutation.epoch = 0;
exports.ConfigMutation = ConfigMutation;
