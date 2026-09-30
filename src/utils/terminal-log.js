"use strict";

class TerminalLog {
    constructor(limit = 1048576) { this.limit = limit; this.chunks = []; this.bytes = 0; }
    append(data) {
        const chunk = Buffer.from(data);
        this.chunks.push(chunk);
        this.bytes += chunk.length;
        while (this.bytes > this.limit && this.chunks.length) {
            const excess = this.bytes - this.limit;
            const first = this.chunks[0];
            if (first.length <= excess) { this.chunks.shift(); this.bytes -= first.length; }
            else { this.chunks[0] = first.subarray(excess); this.bytes -= excess; }
        }
    }
    toString() { return Buffer.concat(this.chunks, this.bytes).toString("utf8"); }
}
exports.TerminalLog = TerminalLog;
