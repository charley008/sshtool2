// Alias for config-service
// Recovered module id: 208
"use strict";

const vscode = require("vscode");
const os = require("os");
// Lazy module refs to avoid circular dependency
const _core = require("../api/core-api.js");
const _cfg = require("../api/config-api.js");
const _utl = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const { Console } = require("../ui/console.js");
const { ConfigVO } = require("../models/config-model.js");
const { ViewManager } = require("../ui/view-option.js");

class ConfigService {
    createConfigView() {
        ViewManager.createWebviewPanel({
            iconPath: _utl.Util.getExtPath("resources", "images", "icons", "config.svg"),
            path: "app",
            title: Localize("xplot.config.title"),
            splitView: false,
            singlePage: true,
            killHidden: true,
            eventHandler: (handler) => {
                const titles = {
                    import_title: Localize("xplot.view.config.import.title"),
                    export_title: Localize("xplot.view.config.expor.title"),
                    local_title: Localize("xplot.view.config.local.title"),
                    file_title: Localize("xplot.view.config.file.title"),
                    target_title: Localize("xplot.view.config.target.title"),
                    openfile_title: Localize("xplot.view.config.openfile.title"),
                    placeholder_title: Localize("xplot.view.config.placeholder.title"),
                };

                handler
                    .on("init", () => {
                        handler.emit("route", "config");
                    })
                    .on("route-config", () => {
                        try {
                            const configvos = require("../models/config-model.js").ConfigVO.getAll();
                            handler.emit("EXPORT", { configvos, titles });
                        } catch(e) {
                            console.error('[SSH Tools] require("../models/config-model.js").ConfigVO.getAll() error:', e);
                            handler.emit("EXPORT", { configvos: {}, titles });
                        }
                    })
                    .on("EXPORT_CONFIGS", (content) => {
                        vscode.window
                            .showOpenDialog({
                                canSelectFiles: false,
                                canSelectMany: false,
                                canSelectFolders: true,
                                defaultUri: vscode.Uri.file(os.homedir()),
                                openLabel: Localize("xplot.msg.export.select.folder"),
                            })
                            .then((uri) => {
                                if (uri && uri[0]) {
                                    _cfg.ConfigAPI.export(uri[0].fsPath || uri[0].path, {
                                        mode: false,
                                        ids: content.configvos_key,
                                    });
                                    vscode.window.showInformationMessage(Localize("xplot.msg.export.ok") + ' ' + uri[0].fsPath);
                                }
                            });
                    })
                    .on("EXPORT_JSON_CONFIGS", (content) => {
                        const now = new Date();
                        const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}.${String(now.getMinutes()).padStart(2,'0')}.${String(now.getSeconds()).padStart(2,'0')}`;
                        vscode.window
                            .showSaveDialog({
                                defaultUri: vscode.Uri.file(`sshtools_${ts}.json`),
                                filters: { 'JSON Files': ['json'] },
                            })
                            .then((uri) => {
                                if (uri) {
                                    const fs = require("fs");
                                    fs.writeFileSync(uri.fsPath, JSON.stringify(content.configvos, null, 2), 'utf-8');
                                    vscode.window.showInformationMessage(Localize("xplot.msg.export.ok") + ' ' + uri.fsPath);
                                }
                            });
                    })
                    .on("IMPORT_FILE_CONFIGS", () => {
                        vscode.window
                            .showOpenDialog({
                                canSelectFiles: true,
                                canSelectMany: false,
                                canSelectFolders: false,
                                filters: { Database: ["db"] },
                                openLabel: Localize("xplot.msg.import.select.file"),
                            })
                            .then((uri) => {
                                if (uri && uri[0]) {
                                    try {
                                        const configvos = _cfg.ConfigAPI.import(uri[0].fsPath || uri[0].path);
                                        _cfg.ConfigAPI.import_configvos(configvos);
                                        _core.API.refresh();
                                        const count = Object.keys(configvos || {}).length;
                                        handler.emit("IMPORT", { configvos, titles });
                                    } catch (error) {
                                        handler.emit("CONNECTION_ERROR", {
                                            titles,
                                            msg: `Import failed: ${error.message}`,
                                        });
                                    }
                                }
                            });
                    })
                    .on("IMPORT_CONFIGS_TO_SAVE", (content) => {
                        try {
                            const configvos = content.configvos;
                            _cfg.ConfigAPI.import_configvos(configvos);
                            _core.API.refresh();
                            handler.emit("IMPORT", { configvos, titles });
                        } catch (error) {
                            handler.emit("CONNECTION_ERROR", {
                                titles,
                                msg: `Save import failed: ${error.message}`,
                            });
                        }
                    });
            },
        });
    }
}

exports.ConfigService = ConfigService;
