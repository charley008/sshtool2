// Alias for console
// Recovered module id: 8
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const fileManager_1 = require("../utils/file-manager.js");
const dayjs = require("../utils/dayjs-runtime.js");
const fs = require("../utils/fs-extra-runtime.js");
const path = require("path");
const vscode = require("vscode");
const Localize = require("./localize.js").default;
const constant_1 = require("../shared/constants.js");
const { Storage } = require("../storage/storage.js");
class Console {
    static log(value) {
        if (this.outputChannel == null) {
            this.outputChannel = vscode.window.createOutputChannel((0, Localize)("sshtool.title"));
        }
        const date = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
        const keys = Storage.get_status_keys();
        if (keys[constant_1.ConsoleOutputSwitch.KEY] == constant_1.ConsoleOutputSwitch.ON) {
            this.outputChannel.show(true);
        }
        else {
            this.outputChannel.hide();
        }
        const logStr = `[${date}] ${value}`;
        this.outputChannel.appendLine(logStr);
        this.toLogFile(logStr);
    }
    static info(msg) {
        this.log(`[INFO] ${msg}`);
        // vscode.window.showInformationMessage(msg);
    }
    static warn(msg) {
        this.log(`[WARN] ${msg}`);
        vscode.window.showWarningMessage(msg);
    }
    static err(err) {
        this.log(`[ERROR] ${err.message}`);
        vscode.window.showErrorMessage(err.message);
    }
    static debug(msg) {
        if (this.outputChannel == null) {
            this.outputChannel = vscode.window.createOutputChannel((0, Localize)("sshtool.title"));
        }
        const keys = Storage.get_status_keys();
        const str = `[DEBUG] ${msg}`;
        const date = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
        const logStr = `[${date}] ${str}`;
        if (keys[constant_1.DebugSwitch.KEY] == constant_1.DebugSwitch.ON) {
            this.outputChannel.appendLine(logStr);
        }
        this.toLogFile(logStr);
    }
    static toLogFile(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = Storage.get_status_keys();
            if (keys[constant_1.DebugSwitch.KEY] == constant_1.DebugSwitch.ON) {
                const logFile = `${dayjs().format('YYYY-MM-DD')}.log`;
                const logFilePath = yield fileManager_1.FileManager.record(`logs/${logFile}`, `${msg}\n`, fileManager_1.FileModel.APPEND);
                const logDir = path.resolve(logFilePath, '..');
                const files = fs.readdirSync(logDir);
                const timestamp = new Date().getTime();
                const oneDayLong = 24 * 3600 * 1000; //定义1天毫秒
                for (let name of files) {
                    const filePath = `${logDir}/${name}`;
                    const file = fs.statSync(filePath);
                    if (timestamp - file.birthtimeMs > oneDayLong) {
                        fs.removeSync(filePath);
                    }
                }
            }
        });
    }
}
exports.Console = Console;
