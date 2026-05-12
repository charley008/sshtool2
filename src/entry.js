// SSH Tools extension entry point
"use strict";

const vscode = require('vscode');

// ---- 模块加载（逐个try-catch定位问题） ----
let ServiceManager, API, GroupAPI, ConfigAPI, Console, Constants;
let Command = {}, ConsoleOututSwitch = {}, DebugSwitch = {}, StatusBar = {};
let loadErrors = [];

try { ServiceManager = require('./services/service-manager').default; }
catch (e) { loadErrors.push('ServiceManager: ' + e.message); }

try { API = require('./api/core-api').API; }
catch (e) { loadErrors.push('API: ' + e.message); }

try { GroupAPI = require('./api/group-api').GroupAPI; }
catch (e) { loadErrors.push('GroupAPI: ' + e.message); }

try { ConfigAPI = require('./api/config-api').ConfigAPI; }
catch (e) { loadErrors.push('ConfigAPI: ' + e.message); }

try { Console = require('./ui/console').Console; }
catch (e) { loadErrors.push('Console: ' + e.message); }

try { Constants = require('./shared/constants'); }
catch (e) { loadErrors.push('Constants: ' + e.message); }

if (Constants) {
    Command = Constants.Command || {};
    ConsoleOututSwitch = Constants.ConsoleOututSwitch || {};
    DebugSwitch = Constants.DebugSwitch || {};
    StatusBar = Constants.StatusBar || {};
}

if (loadErrors.length > 0) {
    loadErrors.forEach(e => console.error('[SSH Tools] Load error:', e));
    vscode.window.showErrorMessage('[SSH Tools] Failed to load: ' + loadErrors.join('; '));
}

let serviceManager;

function activate(context) {
    console.log('[SSH Tools] Activating...');

    if (loadErrors.length > 0) {
        vscode.window.showErrorMessage('[SSH Tools] Cannot activate: ' + loadErrors.length + ' module(s) failed to load');
        return;
    }

    try {
        serviceManager = new ServiceManager(context);
        console.log('[SSH Tools] ServiceManager created');
    } catch (e) {
        vscode.window.showErrorMessage('ServiceManager error: ' + e.message);
        console.error('[SSH Tools] ServiceManager:', e);
        return;
    }

    let disposables = [];
    try {
        const initResult = serviceManager.init();
        if (initResult) disposables.push(...initResult);
        console.log('[SSH Tools] init OK. Providers:', {
            onlineProvider: !!serviceManager.onlineProvider,
            offlineProvider: !!serviceManager.offlineProvider,
            managerProvider: !!serviceManager.managerProvider,
            onlineWorkspaceProvider: !!serviceManager.onlineWorkspaceProvider,
            offlineWorkspaceProvider: !!serviceManager.offlineWorkspaceProvider,
        });
    } catch (e) {
        vscode.window.showErrorMessage('ServiceManager.init error: ' + e.message);
        console.error('[SSH Tools] init:', e);
    }

    const cmdList = [];
    const add = (id, fn) => { if (id && fn) cmdList.push([id, fn]); };
    if (!Command) Command = {};
    if (!ConsoleOututSwitch) ConsoleOututSwitch = {};
    if (!DebugSwitch) DebugSwitch = {};
    if (!StatusBar) StatusBar = {};

    add('xplot.reload', () => API && API.reload());
    add('xplot.add', () => API && API.open_add());
    add(Command.ADD_SSH, (node) => serviceManager.managerProvider && serviceManager.managerProvider.save_ssh());
    add(Command.ADD_FTP, (node) => serviceManager.managerProvider && serviceManager.managerProvider.save_ftp());
    add('xplot.clearall', () => serviceManager.managerProvider && serviceManager.managerProvider.clearall());
    add('xplot.edit', (node) => serviceManager.managerProvider && serviceManager.managerProvider.edit(node));
    add('xplot.connection.rdesktop', (node) => node && node.openRDesktop());
    add('xplot.connection.terminal', (node) => node && node.openTerminal());
    add('xplot.terminal.hear', (node) => node && node.openTerminal());
    add('xplot.connection.delete', (node) => serviceManager.managerProvider && serviceManager.managerProvider.delete(node));
    add('xplot.connection.unlink', (node) => serviceManager.managerProvider && serviceManager.managerProvider.unlink(node));
    add('xplot.folder.new', (node) => node && node.newFolder());
    add('xplot.copy.name', (node) => node && node.copyName());
    add('xplot.copy.path', (node) => node && node.copyPath());
    add('xplot.copy.scp.path', (node) => node && node.copySCPPath());
    add('xplot.file.new', (node) => node && node.newFile());
    add('xplot.host.copy', (node) => node && node.copySSHCommand());
    add('xplot.forward.port', (node) => node && node.fowardPort());
    add('xplot.workspace.management', (node) => node && node.workspaceManagement());
    add('xplot.remote.management', (node) => node && node.remoteManagement());
    add('xplot.file.upload', (node) => node && node.upload());
    add('xplot.folder.open', (node) => node && node.openInTeriminal());
    add('xplot.socks.port', (node) => node && node.startSocksProxy());
    add('xplot.file.delete', (node) => node && node.delete());
    add('xplot.rename', (node) => node && node.rename());
    add('xplot.file.open', (node) => node && node.open());
    add('xplot.file.download', (node) => node && node.download());
    add('xplot.workspace.add', (node) => serviceManager.onlineWorkspaceProvider && serviceManager.onlineWorkspaceProvider.workspace_add(node));
    add('xplot.workspace.del', (node) => serviceManager.onlineWorkspaceProvider && serviceManager.onlineWorkspaceProvider.workspace_del(node));
    add('xplot.workspace.modify', (node) => serviceManager.onlineWorkspaceProvider && serviceManager.onlineWorkspaceProvider.workspace_modify(node));
    add('xplot.config', () => ConfigAPI && ConfigAPI.manager());
    add(Command.REFRESH, () => API && API.refresh());
    add(Command.ONLINE_REFRESH, () => serviceManager.onlineProvider && serviceManager.onlineProvider.refresh());
    add(Command.OFFLINE_REFRESH, () => serviceManager.offlineProvider && serviceManager.offlineProvider.refresh());
    add(Command.MANAGER_REFRESH, () => serviceManager.managerProvider && serviceManager.managerProvider.refresh());
    add(Command.WORKSPACE_ONLINE_REFRESH, () => serviceManager.onlineWorkspaceProvider && serviceManager.onlineWorkspaceProvider.refresh());
    add(Command.WORKSPACE_OFFLINE_REFRESH, () => serviceManager.offlineWorkspaceProvider && serviceManager.offlineWorkspaceProvider.refresh());
    add(Command.AUTOICMP, () => API && API.auto_verify());
    add('xplot.group.list', () => GroupAPI && GroupAPI.show_groups_list());
    add(Command.GROUPS_LIST, () => GroupAPI && GroupAPI.show_groups_list());
    add('xplot.group.rename', (node) => node && node.groupRename(node));
    add('xplot.group.in', (node) => node && node.groupIn(node));
    add('xplot.group.out', () => GroupAPI && GroupAPI.to_groups_list_by_name(StatusBar.ALL));
    add('xplot.console.switch.on', () => API && API.console_output_switch(ConsoleOututSwitch.KEY));
    add('xplot.console.switch.off', () => API && API.console_output_switch(ConsoleOututSwitch.KEY));
    add('xplot.debug.on', () => API && API.console_output_switch(DebugSwitch.KEY));
    add('xplot.debug.off', () => API && API.console_output_switch(DebugSwitch.KEY));

    let ok = 0, fail = 0;
    const failedIds = [];
    cmdList.forEach(([id, fn]) => {
        try {
            disposables.push(vscode.commands.registerCommand(id, fn));
            ok++;
        } catch (e) {
            fail++;
            failedIds.push(id + ': ' + e.message);
        }
    });
    if (failedIds.length > 0) {
        console.error('[SSH Tools] Failed commands:', failedIds.join(', '));
    }
    context.subscriptions.push(...disposables);

    console.log('[SSH Tools] Registered ' + ok + ' commands (' + fail + ' failed). Activated.');
}

function deactivate() {
    console.log('[SSH Tools] Deactivating');
    if (serviceManager) {
        try { serviceManager.cleanup(); } catch (e) { console.error('[SSH Tools] Cleanup failed:', e); }
    }
}

exports.activate = activate;
exports.deactivate = deactivate;
