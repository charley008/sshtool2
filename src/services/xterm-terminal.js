// Alias for xterm-terminal
// Recovered module id: 226
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

const { Client } = require("../connections/ssh2-runtime.js");
const vscode = require("vscode");
const { ViewManager } = require("../ui/view-option.js");
const fileManager_1 = require("../utils/file-manager.js");
const { Util } = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const constant_1 = require("../shared/constants.js");
const { Console } = require("../ui/console.js");
const { Storage } = require("../storage/storage.js");
const { SSHVO } = require("../models/ssh-model.js");
const { SSHConn } = require("../connections/ssh-connection.js");
const { SSHCredentialService } = require("./ssh-credential-service.js");
const { SSHHostKeyService } = require("./ssh-hostkey-service.js");

function cloneTerminalConnectOptions(sshinfo, option) {
    const ssh = Object.assign({}, sshinfo.ssh || {});
    delete ssh.jump;
    return Object.assign(ssh, option || {}, SSHHostKeyService.createVerifier(sshinfo));
}

class XtermTerminal {
    // private getSshUrl(sshinfo: SSHInfo): string {
    //     return 'ssh://' + sshinfo.id;
    // }
    getTitle(sshinfo) {
        return 'ssh://' + SSHVO.title(sshinfo);
    }
    openPath(sshinfo, fullPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const handler = XtermTerminal.handlerMap.get(this.getTitle(sshinfo));
            if (handler) {
                if (sshinfo.ssh.ostype == constant_1.OSTypes.WINDOWS) {
                    fullPath = fullPath.substr(1) + "/";
                    handler.emit('winpath', fullPath);
                }
                else {
                    handler.emit('path', fullPath);
                }
            }
            else {
                this.openMethod(sshinfo, () => { this.openPath(sshinfo, fullPath); });
            }
        });
    }
    openMethod(sshinfo, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            ViewManager.createWebviewPanel({
                splitView: false, path: "app", iconPath: Util.getExtPath("resources", "images", "terminal-load.svg"),
                title: this.getTitle(sshinfo),
                eventHandler: (handler) => {
                    this.handlerEvent(handler, sshinfo, callback);
                }
            });
        });
    }
    handlerEvent(handler, sshinfo, callback) {
        // const sshUrl = this.getSshUrl(sshinfo);
        const title = this.getTitle(sshinfo);
        let dataBuffer = [];
        handler.on("init", (content) => {
            handler.emit("route", 'sshXterm');
        }).on("route-sshXterm", (content) => {
            handler.emit("terminal", {});
        }).on("initTerminal", (content) => {
            handler.emit('connecting', `Connecting ${title}...\r\n`);
            let termCols, termRows;
            if (content) {
                termCols = content.cols;
                termRows = content.rows;
            }
            const client = new Client();
            const end = () => {
                client.end();
                XtermTerminal.handlerMap.delete(title);
            };
            const sshlog = (state, message, err = null) => {
                // handler.emit('ssherror', (err) ? `${message}: ${err.message}` : message);
                const msg = (err) ? `${message}: ${err.message}` : message;
                if (!state) {
                    end();
                }
                try {
                    if (handler.panel) {
                        handler.panel.iconPath = vscode.Uri.file(Util.getExtPath("resources", "images",
                            state ? "terminal-online.svg" : "terminal-offline.svg"));
                    }
                } catch (e) {
                    // panel already disposed, ignore
                }
                Console.info(`${title},${msg}`);
            };
            const keys = Storage.get_status_keys();
            const options = keys[constant_1.TempKeys.TEMP_KEYS_TerminalOptions];
            handler.emit('options', { options: options });
            client.on('ready', () => {
                XtermTerminal.handlerMap.set(title, handler);
                client.shell({ term: 'xterm-color', cols: termCols, rows: termRows }, (err, stream) => {
                    if (err) {
                        sshlog(false, 'EXEC ERROR' + err, null);
                        return;
                    }
                    // handler.emit('header', '')
                    sshlog(true, (0, Localize)("sshtool.msg.conn.terminal.ok"));
                    handler.on('data', (data) => {
                        stream.write(data);
                    }).on('resize', (data) => {
                        const keys = Storage.get_status_keys();
                        const tmpTerminalOptions = keys[constant_1.TempKeys.TEMP_KEYS_TerminalOptions];
                        const currTerminalOptions = data.terminalOptions;
                        const tmpTimeStamp = tmpTerminalOptions.timestamp ? tmpTerminalOptions.timestamp : 0;
                        const currTimeStamp = currTerminalOptions.timestamp ? currTerminalOptions.timestamp : 0;
                        // Console.info(tmpTimeStamp < data.terminalOptions.timestamp)
                        if (tmpTimeStamp < currTimeStamp || (tmpTimeStamp == currTimeStamp && tmpTimeStamp == 0)) {
                            keys[constant_1.TempKeys.TEMP_KEYS_TerminalOptions] = data.terminalOptions;
                            Storage.update_status_keys(keys);
                        }
                        if (tmpTimeStamp > currTimeStamp) {
                            handler.emit('options', { options: tmpTerminalOptions });
                        }
                        stream.setWindow(data.rows, data.cols, data.height, data.width);
                    }).on('openLink', uri => {
                        vscode.env.openExternal(vscode.Uri.parse(uri));
                    }).on('dispose', () => {
                        end();
                    });
                    stream.on('data', (data) => {
                        handler.emit('data', data.toString('utf-8'));
                        dataBuffer = dataBuffer.concat(data);
                    });
                    stream.on('close', (code, signal) => {
                        end();
                    });
                    if (callback && (typeof callback) == "function")
                        callback();
                });
            });
            client.on('banner', (data) => handler.emit('data', data.replace(/\r?\n/g, '\r\n')));
            client.on('end', (err) => { sshlog(false, 'CONN END BY HOST', err); handler.panel?.dispose(); });
            client.on('close', (err) => { sshlog(false, (0, Localize)("sshtool.msg.conn.terminal.close"), err); handler.panel?.dispose(); });
            client.on('error', (err) => { sshlog(false, 'CONN ERROR', err); });
            client.on('keyboard-interactive', () => {
                end();
            });
            SSHCredentialService.hydrate(sshinfo).then((hydratedSshInfo) => {
                return SSHConn.openJumpStream(hydratedSshInfo, {}).then(({ option }) => {
                    client.connect(cloneTerminalConnectOptions(hydratedSshInfo, option));
                });
            }).catch((err) => {
                sshlog(false, 'CONN ERROR', err);
            });
        }).on('openLog', () => __awaiter(this, void 0, void 0, function* () {
            const keyDir = `${sshinfo.ssh.username}@${sshinfo.ssh.host}#${sshinfo.ssh.port}`;
            yield fileManager_1.FileManager.record(`logs/${keyDir}`, dataBuffer.toString().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''), fileManager_1.FileModel.WRITE);
            fileManager_1.FileManager.show(`logs/${keyDir}`).then((textEditor) => {
                const lineCount = textEditor.document.lineCount;
                const range = textEditor.document.lineAt(lineCount - 1).range;
                textEditor.selection = new vscode.Selection(range.end, range.end);
                textEditor.revealRange(range);
            });
        }));
    }
}
exports.XtermTerminal = XtermTerminal;
XtermTerminal.handlerMap = new Map();
