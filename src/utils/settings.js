// Alias for settings
// Recovered module id: 51
"use strict";

const vscode = require("vscode");
class Settings {
    static reload() {
        const config = vscode.workspace.getConfiguration('XPLOTTools');
        Settings.PingHostTime = config.get('default.PingHostTime');
        Settings.RefreshNodeTime = config.get('default.RefreshNodeTime');
        Settings.OpenFileMaxSize = config.get('default.OpenFileMaxSize');
        Settings.ProhibitFileExt = config.get('default.ProhibitFileExt');
        Settings.ShowHiddenFilesAndFolders = config.get('default.ShowHiddenFilesAndFolders');
        Settings.SaveLocalFileTempCacheInformation = config.get('default.SaveLocalFileTempCacheInformation');
    }
}
exports.Settings = Settings;
Settings.reload();
