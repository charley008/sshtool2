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
const { ViewManager } = require("../ui/view-option.js");

function createExportTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}.${String(now.getMinutes()).padStart(2,'0')}.${String(now.getSeconds()).padStart(2,'0')}`;
}

class ConfigService {
    async promptExportPassword() {
        const password = await vscode.window.showInputBox({
            prompt: "请输入导出密码；导入到另一台电脑时需要同一个密码",
            password: true,
            ignoreFocusOut: true,
            validateInput: value => value && value.length >= 6 ? null : "导出密码至少 6 位",
        });
        if (password === undefined) {
            return undefined;
        }
        const confirm = await vscode.window.showInputBox({
            prompt: "请再次输入导出密码",
            password: true,
            ignoreFocusOut: true,
        });
        if (confirm === undefined) {
            return undefined;
        }
        if (password !== confirm) {
            vscode.window.showWarningMessage("两次输入的导出密码不一致");
            return undefined;
        }
        return password;
    }

    async promptImportPassword() {
        return vscode.window.showInputBox({
            prompt: "该配置文件包含加密敏感信息，请输入导出密码",
            password: true,
            ignoreFocusOut: true,
        });
    }

    async importConfigFile(filePath, password) {
        if (!password) {
            throw new Error("Import password is required");
        }
        return _cfg.ConfigAPI.import(filePath, { password });
    }

    async importConfigValue(value) {
        const data = JSON.stringify(value || {});
        try {
            return _cfg.ConfigAPI.parse_import_data(data, "json");
        } catch (error) {
            if (!error || error.message !== "Export password is required") {
                throw error;
            }
            const password = await this.promptImportPassword();
            if (password === undefined) {
                throw new Error("Import cancelled");
            }
            return _cfg.ConfigAPI.parse_import_data(data, "json", { password });
        }
    }

    createConfigView() {
        ViewManager.createWebviewPanel({
            iconPath: _utl.Util.getExtPath("resources", "images", "icons", "config.svg"),
            path: "app",
            title: Localize("sshtool.config.title"),
            splitView: false,
            singlePage: true,
            killHidden: true,
            eventHandler: (handler) => {
                const titles = {
                    import_title: Localize("sshtool.view.config.import.title"),
                    export_title: Localize("sshtool.view.config.expor.title"),
                    local_title: Localize("sshtool.view.config.local.title"),
                    file_title: Localize("sshtool.view.config.file.title"),
                    target_title: Localize("sshtool.view.config.target.title"),
                    openfile_title: Localize("sshtool.view.config.openfile.title"),
                    placeholder_title: Localize("sshtool.view.config.placeholder.title"),
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
                        if (!content.password) {
                            handler.emit("CONNECTION_ERROR", { titles, msg: "Export password is required" });
                            return;
                        }
                        const ts = createExportTimestamp();
                        vscode.window
                            .showSaveDialog({
                                defaultUri: vscode.Uri.file(`sshtools_${ts}.db`),
                                filters: { 'SSH Tools Config': ['db'] },
                                saveLabel: Localize("sshtool.msg.export.select.folder"),
                            })
                            .then(async (uri) => {
                                if (uri) {
                                    const filePath = await _cfg.ConfigAPI.export_to_file(uri.fsPath, {
                                        mode: false,
                                        ids: content.configvos_key,
                                        includeSensitive: true,
                                        password: content.password,
                                    });
                                    vscode.window.showInformationMessage(Localize("sshtool.msg.export.ok") + ' ' + filePath);
                                }
                            });
                    })
                    .on("EXPORT_JSON_CONFIGS", (content) => {
                        if (!content.password) {
                            handler.emit("CONNECTION_ERROR", { titles, msg: "Export password is required" });
                            return;
                        }
                        const ts = createExportTimestamp();
                        vscode.window
                            .showSaveDialog({
                                defaultUri: vscode.Uri.file(`sshtools_${ts}.json`),
                                filters: { 'JSON Files': ['json'] },
                            })
                            .then(async (uri) => {
                                if (uri) {
                                    const filePath = await _cfg.ConfigAPI.export_to_file(uri.fsPath, {
                                        mode: false,
                                        ids: content.configvos_key,
                                        includeSensitive: true,
                                        password: content.password,
                                        plainJson: true,
                                    });
                                    vscode.window.showInformationMessage(Localize("sshtool.msg.export.ok") + ' ' + filePath);
                                }
                            });
                    })
                    .on("IMPORT_FILE_CONFIGS", (content) => {
                        if (!content.password) {
                            handler.emit("CONNECTION_ERROR", { titles, msg: "Import password is required" });
                            return;
                        }
                        vscode.window
                            .showOpenDialog({
                                canSelectFiles: true,
                                canSelectMany: false,
                                canSelectFolders: false,
                                filters: { "SSH Tools Config": ["db", "json"] },
                                openLabel: Localize("sshtool.msg.import.select.file"),
                            })
                            .then(async (uri) => {
                                if (uri && uri[0]) {
                                    try {
                                        const configvos = await this.importConfigFile(uri[0].fsPath || uri[0].path, content.password);
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
                    });
            },
        });
    }
}

exports.ConfigService = ConfigService;
