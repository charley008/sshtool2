"use strict";

const { Transform } = require("stream");

function progressStream(options, onprogress) {
    if (typeof options === "function") {
        return progressStream({}, options);
    }

    options = options || {};
    let length = Number(options.length || 0);
    const interval = Number(options.time || 0);
    let transferred = Number(options.transferred || 0);
    let delta = 0;
    let nextUpdate = Date.now() + interval;
    const startTime = Date.now();

    const update = {
        percentage: 0,
        transferred,
        length,
        remaining: length,
        eta: 0,
        runtime: 0,
        delta: 0,
        speed: 0,
    };

    const stream = new Transform({
        objectMode: !!options.objectMode,
        transform(chunk, enc, callback) {
            const size = options.objectMode ? 1 : chunk.length;
            transferred += size;
            delta += size;
            update.transferred = transferred;
            update.remaining = Math.max(length - transferred, 0);

            if (Date.now() >= nextUpdate) {
                emitProgress(false);
            }
            callback(null, chunk);
        },
        flush(callback) {
            emitProgress(true);
            callback();
        },
    });

    function emitProgress(ended) {
        const runtimeMs = Math.max(Date.now() - startTime, 1);
        const speed = transferred > 0 ? transferred / (runtimeMs / 1000) : 0;
        update.delta = delta;
        update.percentage = ended ? 100 : (length ? transferred / length * 100 : 0);
        update.speed = speed;
        update.eta = speed > 0 ? Math.round(update.remaining / speed) : 0;
        update.runtime = Math.floor(runtimeMs / 1000);
        nextUpdate = Date.now() + interval;
        delta = 0;
        stream.emit("progress", update);
    }

    stream.setLength = (newLength) => {
        length = Number(newLength || 0);
        update.length = length;
        update.remaining = Math.max(length - update.transferred, 0);
        stream.emit("length", length);
    };

    stream.progress = () => {
        emitProgress(false);
        return update;
    };

    stream.on("pipe", (source) => {
        if (length) {
            return;
        }
        if (typeof source.length === "number") {
            stream.setLength(source.length);
        }
    });

    if (onprogress) {
        stream.on("progress", onprogress);
    }
    if (options.drain) {
        stream.resume();
    }
    return stream;
}

module.exports = progressStream;
