// Alias for file-manager
// Recovered module id: 42
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

const fs = require("fs-extra");
const path = require("path");
const vscode = require("vscode");
const { Console } = require("../ui/console.js");
class FileManager {
    static init(context) {
        // this.storagePath = context.globalStoragePath;
        this.storagePath = context.globalStorageUri.fsPath;
    }
    static checkRoot(path) {
        if (!fs.existsSync(path))
            fs.mkdirpSync(path);
    }
    static check(rootPath, endPath) {
        const recordPath = `${rootPath}/${endPath}`;
        const fullPath = path.resolve(recordPath, '..');
        const subPath = fullPath.substr(rootPath.length + 1);
        const dirs = subPath.split(/\/|\\/gi);
        let tmPath = rootPath;
        for (let dir of dirs) {
            tmPath += `/${dir}`;
            try {
                if (fs.existsSync(tmPath)) {
                    fs.ensureDirSync(tmPath);
                }
                else {
                    fs.mkdirpSync(tmPath);
                }
            }
            catch (e) {
                fs.removeSync(tmPath);
                fs.mkdirpSync(tmPath);
            }
        }
    }
    static show(fileName) {
        if (!this.storagePath) {
            vscode.window.showErrorMessage("FileManager is not init!");
        }
        if (!fileName) {
            return;
        }
        const recordPath = `${this.storagePath}/${fileName}`;
        this.checkRoot(this.storagePath);
        this.check(this.storagePath, fileName);
        const openPath = vscode.Uri.file(recordPath);
        return new Promise((resolve) => {
            vscode.workspace.openTextDocument(openPath).then((doc) => __awaiter(this, void 0, void 0, function* () {
                resolve(yield vscode.window.showTextDocument(doc));
            }));
        });
    }
    /**
     *
     * @param return actually file name
     */
    static record(fileName, content, model) {
        if (!this.storagePath) {
            Console.warn("FileManager is not init!");
        }
        if (!fileName) {
            return;
        }
        return new Promise((resolve, reject) => {
            const recordPath = `${this.storagePath}/${fileName}`;
            this.checkRoot(this.storagePath);
            this.check(this.storagePath, fileName);
            if (model == FileModel.WRITE) {
                fs.writeFileSync(recordPath, `${content}`, { encoding: 'utf8' });
            }
            else {
                fs.appendFileSync(recordPath, `${content}`, { encoding: 'utf8' });
            }
            resolve(recordPath);
        });
    }
}
exports.FileManager = FileManager;
var FileModel;
(function (FileModel) {
    FileModel[FileModel["WRITE"] = 0] = "WRITE";
    FileModel[FileModel["APPEND"] = 1] = "APPEND";
})(FileModel = exports.FileModel || (exports.FileModel = {}));
