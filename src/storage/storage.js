// Alias for storage
// Recovered module id: 9
"use strict";

const path = require("path");
const { Settings } = require("../utils/settings.js");
const { CacheKey } = require("../shared/constants.js");
class Storage {
    static init(context) {
        this.context = context;
        this.storagePath = this.context.globalStorageUri.fsPath;
    }
    static get_ssh_list() {
        return this.context.globalState.get(CacheKey.SSH_LIST) || {};
    }
    static update_ssh_list(ssh_list) {
        this.context.globalState.update(CacheKey.SSH_LIST, ssh_list);
    }
    static get_conections_config() {
        return this.context.globalState.get(CacheKey.CONECTIONS_CONFIG) || {};
    }
    static delete_configs() {
        this.context.globalState.update(CacheKey.CONECTIONS_CONFIG, {});
    }
    static get_temp_file_remotes() {
        const tempFileRemotes = Settings.SaveLocalFileTempCacheInformation
            ? this.context.globalState.get(CacheKey.TEMP_FILE_REMOTES) || {}
            : this.tempFileRemotes;
        return this.normalize_temp_file_remotes(tempFileRemotes);
    }
    static update_temp_file_remotes(temp_file_remotes) {
        const normalized = this.normalize_temp_file_remotes(temp_file_remotes);
        if (Settings.SaveLocalFileTempCacheInformation) {
            this.context.globalState.update(CacheKey.TEMP_FILE_REMOTES, normalized);
        }
        else {
            this.tempFileRemotes = normalized;
        }
    }
    static normalize_temp_file_path(filePath) {
        if (!filePath) {
            return "";
        }
        const normalizedPath = path.normalize(path.resolve(filePath));
        return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
    }
    static normalize_temp_file_remotes(temp_file_remotes) {
        const normalized = {};
        for (const key of Object.keys(temp_file_remotes || {})) {
            const normalizedKey = this.normalize_temp_file_path(key);
            if (!normalizedKey) {
                continue;
            }
            normalized[normalizedKey] = Object.assign({}, temp_file_remotes[key]);
        }
        return normalized;
    }
    static get_temp_file_remote(filePath) {
        return this.get_temp_file_remotes()[this.normalize_temp_file_path(filePath)];
    }
    static set_temp_file_remote(filePath, tempFileRemote) {
        const tempPath = this.normalize_temp_file_path(filePath);
        if (!tempPath) {
            return;
        }
        const tempFileRemotes = this.get_temp_file_remotes();
        tempFileRemotes[tempPath] = Object.assign({}, tempFileRemote, { timeStamp: new Date().getTime() });
        this.update_temp_file_remotes(tempFileRemotes);
    }
    static touch_temp_file_remote(filePath, tempFileRemote = {}) {
        const tempPath = this.normalize_temp_file_path(filePath);
        if (!tempPath) {
            return null;
        }
        const tempFileRemotes = this.get_temp_file_remotes();
        const current = tempFileRemotes[tempPath];
        if (!current) {
            return null;
        }
        tempFileRemotes[tempPath] = Object.assign({}, current, tempFileRemote, { timeStamp: new Date().getTime() });
        this.update_temp_file_remotes(tempFileRemotes);
        return tempFileRemotes[tempPath];
    }
    static delete_temp_file_remote(filePath) {
        const tempPath = this.normalize_temp_file_path(filePath);
        const tempFileRemotes = this.get_temp_file_remotes();
        if (!tempFileRemotes[tempPath]) {
            return;
        }
        delete tempFileRemotes[tempPath];
        this.update_temp_file_remotes(tempFileRemotes);
    }
    static get_forwards_server() {
        // return this.context.globalState.get<{ [key: string]: Server }>(CacheKey.TEMP_SERVER_FORWARDS) || {};  
        return this.tempForwards;
    }
    static update_forwards_server(servers) {
        // this.context.globalState.update(CacheKey.TEMP_SERVER_FORWARDS, servers);  
        this.tempForwards = servers;
    }
    static get_rdesktops_server() {
        return this.tempRDesktops;
    }
    static update_rdesktops_server(servers) {
        this.tempRDesktops = servers;
    }
    static get_history() {
        // return this.context.globalState.get<{ [key: string]: any }>(CacheKey.TEMP_HISTORY) || {};  
        return this.tempHistory;
    }
    static update_history(history) {
        // this.context.globalState.update(CacheKey.TEMP_SERVER_FORWARDS, servers);  
        this.tempHistory = history;
    }
    // private static  tempStatusBar:{ [key: string]: any} = {};
    static get_status_bars() {
        return this.context.globalState.get(CacheKey.TEMP_STATUS_BAR) || {};
        // return this.tempStatusBar;
    }
    static update_status_bars(bars) {
        this.context.globalState.update(CacheKey.TEMP_STATUS_BAR, bars);
        // this.tempStatusBar = bars;
    }
    static get_status_keys() {
        return this.context.globalState.get(CacheKey.TEMP_KEYS) || {};
    }
    static update_status_keys(keys) {
        this.context.globalState.update(CacheKey.TEMP_KEYS, keys);
    }
}
exports.Storage = Storage;
Storage.tempFileRemotes = {};
Storage.tempForwards = {};
Storage.tempRDesktops = {};
Storage.tempHistory = {};
