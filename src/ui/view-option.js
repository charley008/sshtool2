"use strict";

const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const { EventEmitter } = require("events");
const { Console } = require("./console.js");
const { isAllowedWebviewType, normalizeWebviewMessage } = require("../utils/message-guard.js");

class ViewOption {
    constructor() {
        this.splitView = false;
    }
}

class Hanlder {
    constructor(panel, eventEmitter) {
        this.panel = panel;
        this.eventEmitter = eventEmitter;
    }

    on(event, callback) {
        this.eventEmitter.on(event, callback);
        return this;
    }

    emit(event, content) {
        if (!this.panel) {
            return;
        }
        this.panel.webview.postMessage({ type: event, content });
    }
}

const Handler = Hanlder;

class ViewManager {
    static initExtesnsionPath(extensionPath) {
        this.initExtensionPath(extensionPath);
    }

    static initExtensionPath(extensionPath) {
        this.webviewPath = path.join(extensionPath, "out", "webview");
    }

    static createWebviewPanel(viewOption) {
        return new Promise((resolve, reject) => {
            if (typeof viewOption.singlePage === "undefined") {
                viewOption.singlePage = false;
            }
            if (typeof viewOption.killHidden === "undefined") {
                viewOption.killHidden = true;
            }

            if (!viewOption.singlePage && viewOption.title.includes("@")) {
                const suffix = Math.random().toString(36).slice(2, 5);
                viewOption.title = `${viewOption.title}[${suffix}]`;
            }

            const currentStatus = this.viewStatu[viewOption.title];
            if (viewOption.singlePage && currentStatus) {
                if (currentStatus.creating) {
                    currentStatus.pendingViewOption = viewOption;
                    return currentStatus.readyResolvers.push(resolve);
                }

                if (viewOption.killHidden && currentStatus.instance && currentStatus.instance.visible === false) {
                    currentStatus.instance.dispose();
                } else {
                    if (viewOption.initListener) {
                        viewOption.initListener(currentStatus.instance);
                    }
                    if (viewOption.receiveListener) {
                        currentStatus.receiveListener = viewOption.receiveListener;
                    }
                    currentStatus.eventEmitter.removeAllListeners();
                    if (viewOption.eventHandler) {
                        viewOption.eventHandler(new Hanlder(currentStatus.instance, currentStatus.eventEmitter));
                    }
                    currentStatus.eventEmitter.emit("init");
                    return resolve(currentStatus.instance);
                }
            }

            const newStatus = {
                creating: true,
                instance: null,
                eventEmitter: new EventEmitter(),
                initListener: viewOption.initListener,
                receiveListener: viewOption.receiveListener,
                pendingViewOption: null,
                readyResolvers: [resolve],
            };
            this.viewStatu[viewOption.title] = newStatus;

            const targetPath = path.join(this.webviewPath, `${viewOption.path}.html`);
            fs.readFile(targetPath, "utf8", (err, data) => {
                if (err) {
                    Console.log(err);
                    delete this.viewStatu[viewOption.title];
                    reject(err);
                    return;
                }

                const webviewPanel = vscode.window.createWebviewPanel(
                    viewOption.title,
                    viewOption.title,
                    {
                        viewColumn: viewOption.splitView ? vscode.ViewColumn.Two : vscode.ViewColumn.One,
                        preserveFocus: true,
                    },
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true,
                    }
                );

                if (viewOption.iconPath) {
                    webviewPanel.iconPath = vscode.Uri.file(viewOption.iconPath);
                }

                newStatus.instance = webviewPanel;
                const contextPath = path.dirname(targetPath);
                webviewPanel.webview.html = this.buildPath(data, webviewPanel.webview, contextPath);

                webviewPanel.onDidDispose(() => {
                    const status = this.viewStatu[viewOption.title];
                    if (status) {
                        status.eventEmitter.emit("dispose");
                        delete this.viewStatu[viewOption.title];
                    }
                });

                if (viewOption.eventHandler) {
                    viewOption.eventHandler(new Hanlder(webviewPanel, newStatus.eventEmitter));
                }

                webviewPanel.webview.onDidReceiveMessage((rawMessage) => {
                    const message = normalizeWebviewMessage(rawMessage);
                    if (!message) {
                        Console.log("[WEBVIEW_ERROR] Ignored malformed webview message");
                        return;
                    }
                    if (!isAllowedWebviewType(message.type)) {
                        Console.log(`[WEBVIEW_ERROR] Ignored disallowed webview message: ${message.type}`);
                        return;
                    }
                    if (message && message.type === "WEBVIEW_ERROR") {
                        const detail = message.content && message.content.detail ? message.content.detail : "Unknown webview error";
                        Console.log(`[WEBVIEW_ERROR] ${detail}`);
                    }
                    newStatus.eventEmitter.emit(message.type, message.content);
                    if (message.type === "init") {
                        newStatus.creating = false;
                        if (newStatus.initListener) {
                            newStatus.initListener(webviewPanel);
                        }
                        if (newStatus.pendingViewOption) {
                            const pendingViewOption = newStatus.pendingViewOption;
                            newStatus.pendingViewOption = null;
                            if (pendingViewOption.receiveListener) {
                                newStatus.receiveListener = pendingViewOption.receiveListener;
                            }
                            newStatus.eventEmitter.removeAllListeners();
                            if (pendingViewOption.eventHandler) {
                                pendingViewOption.eventHandler(new Hanlder(webviewPanel, newStatus.eventEmitter));
                            }
                            newStatus.eventEmitter.emit("init");
                        }
                        while (newStatus.readyResolvers.length > 0) {
                            const readyResolve = newStatus.readyResolvers.shift();
                            readyResolve(webviewPanel);
                        }
                    } else if (newStatus.receiveListener) {
                        newStatus.receiveListener(webviewPanel, message);
                    }
                });
            });
        });
    }

    static buildPath(data, webview, contextPath) {
        const baseUri = webview.asWebviewUri(vscode.Uri.file(contextPath)).toString();
        const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const csp = [
            "default-src 'none'",
            `img-src ${webview.cspSource} data:`,
            `script-src 'nonce-${nonce}' 'unsafe-eval'`,
            "style-src 'unsafe-inline'",
            `font-src ${webview.cspSource} data:`,
            `connect-src ${webview.cspSource}`,
        ].join("; ");
        return data
            .replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`)
            .replace(/<script\b(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`)
            .replace(/((src|href)=("|'))(.+?\.(css|js))\b/gi, `$1${baseUri}/$4`);
    }
}

ViewManager.viewStatu = {};

exports.ViewOption = ViewOption;
exports.Handler = Handler;
exports.Hanlder = Hanlder;
exports.ViewManager = ViewManager;
