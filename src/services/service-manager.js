// Alias for service-manager
// Recovered module id: 16
"use strict";

const vscode = require("vscode");
const { ViewManager } = require("../ui/view-option.js");
const OnlineProvider = require("../providers/online-provider.js").default;
const OfflineProvider = require("../providers/offline-provider.js").default;
const { FileManager } = require("../utils/file-manager.js");
const ManagerProvider = require("../providers/manager-provider.js").default;
const { API } = require("../api/core-api.js");
const OnlineWorkspaceProvider = require("../providers/online-workspace-provider.js").default;
const OfflineWorkspaceProvider = require("../providers/offline-workspace-provider.js").default;
const { Storage } = require("../storage/storage.js");
const { BaseDT } = require("../storage/base-dt.js");
const { SSHDT } = require("../storage/ssh.js");
const { FTPDT } = require("../storage/ftp.js");
const { ForwardDT } = require("../storage/forward.js");
const { RemoteDT } = require("../storage/remote.js");
const { WorkspaceDT } = require("../storage/workspace.js");
const { Settings } = require("../utils/settings.js");
class ServiceManager {
    constructor(context) {
        this.context = context;
        this.isInit = false;
        this._disposables = [];
        ServiceManager.context = context;
        ViewManager.initExtesnsionPath(context.extensionPath);
        FileManager.init(context);
        Storage.init(context);
        BaseDT.init(context);
        SSHDT.init(context);
        FTPDT.init(context);
        ForwardDT.init(context);
        RemoteDT.init(context);
        WorkspaceDT.init(context);
        // Verify inits
        if (!Storage.context) console.error('[SSH Tools] Storage.context not set after init!');
        if (!BaseDT.context) console.error('[SSH Tools] BaseDT.context not set after init!');
        if (!SSHDT.context) console.error('[SSH Tools] SSHDT.context not set after init!');
        this._disposables.push(vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('XPLOTTools')) {
                Settings.reload();
            }
        }));
        try { API.auto(); }
        catch(e) { console.error('[SSH Tools] API.auto() failed:', e.message || e); }
    }
    init() {
        if (this.isInit)
            return [];
        const res = [];
        this.onlineProvider = new OnlineProvider();
        const treeview_online = vscode.window.createTreeView("xplot.online", {
            treeDataProvider: this.onlineProvider
        });
        this.offlineProvider = new OfflineProvider();
        const treeview_offline = vscode.window.createTreeView("xplot.offline", {
            treeDataProvider: this.offlineProvider
        });
        this.managerProvider = new ManagerProvider();
        const treeview_manager = vscode.window.createTreeView("xplot.manager", {
            treeDataProvider: this.managerProvider
        });
        res.push(treeview_online);
        res.push(treeview_offline);
        res.push(treeview_manager);
        this.onlineWorkspaceProvider = new OnlineWorkspaceProvider();
        const treeview_workspace_online = vscode.window.createTreeView("xplot.workspace.online", {
            treeDataProvider: this.onlineWorkspaceProvider
        });
        this.offlineWorkspaceProvider = new OfflineWorkspaceProvider();
        const treeview_workspace_offline = vscode.window.createTreeView("xplot.workspace.offline", {
            treeDataProvider: this.offlineWorkspaceProvider
        });
        res.push(treeview_workspace_online);
        res.push(treeview_workspace_offline);
        this.isInit = true;
        return res;
    }
    cleanup() {
        if (ServiceManager._intervals) {
            ServiceManager._intervals.forEach(id => clearInterval(id));
            ServiceManager._intervals = [];
        }
        if (this._disposables) {
            this._disposables.forEach(disposable => {
                try { disposable.dispose(); } catch (e) {}
            });
            this._disposables = [];
        }
    }
}
ServiceManager._intervals = [];
exports.default = ServiceManager;
