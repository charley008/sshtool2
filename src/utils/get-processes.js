// Alias for get-processes-unix-get-processes-windows-get-processes
// Recovered module id: 55
"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const { getProcessesUnix } = require("./get-processes-unix.js");
exports.getProcessesUnix = getProcessesUnix;
const { getProcessesWindows } = require("./get-processes-windows.js");
exports.getProcessesWindows = getProcessesWindows;
const IS_WINDOWS = process.platform === 'win32';
function getProcesses() {
    return __awaiter(this, void 0, void 0, function* () {
        if (IS_WINDOWS) {
            return getProcessesWindows();
        }
        return getProcessesUnix();
    });
}
exports.getProcesses = getProcesses;
exports.default = getProcesses;
//# sourceMappingURL=index.js.map
