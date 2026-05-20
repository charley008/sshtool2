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

    add('sshtools2.reload', () => API && API.reload());
    add('sshtools2.add', () => API && API.open_add());
    add(Command.ADD_SSH, (node) => serviceManager.managerProvider && serviceManager.managerProvider.save_ssh());
    add(Command.ADD_FTP, (node) => serviceManager.managerProvider && serviceManager.managerProvider.save_ftp());
    add('sshtools2.clearall', () => serviceManager.managerProvider && serviceManager.managerProvider.clearall());
    add('sshtools2.edit', (node) => serviceManager.managerProvider && serviceManager.managerProvider.edit(node));
    add('sshtools2.connection.rdesktop', (node) => node && node.openRDesktop());
    add('sshtools2.connection.terminal', (node) => node && node.openTerminal());
    add('sshtools2.terminal.hear', (node) => node && node.openTerminal());
    add('sshtools2.connection.delete', (node) => serviceManager.managerProvider && serviceManager.managerProvider.delete(node));
    add('sshtools2.connection.unlink', (node) => serviceManager.managerProvider && serviceManager.managerProvider.unlink(node));
    add('sshtools2.folder.new', (node) => node && node.newFolder());
    add('sshtools2.copy.name', (node) => node && node.copyName());
    add('sshtools2.copy.path', (node) => node && node.copyPath());
    add('sshtools2.copy.scp.path', (node) => node && node.copySCPPath());
    add('sshtools2.file.new', (node) => node && node.newFile());
    add('sshtools2.host.copy', (node) => node && node.copySSHCommand());
    add('sshtools2.forward.port', (node) => node && node.fowardPort());
    add('sshtools2.workspace.management', (node) => node && node.workspaceManagement());
    add('sshtools2.remote.management', (node) => node && node.remoteManagement());
    add('sshtools2.file.upload', (node) => node && node.upload());
    add('sshtools2.folder.open', (node) => node && node.openInTeriminal());
    add('sshtools2.socks.port', (node) => node && node.startSocksProxy());
    add('sshtools2.file.delete', (node) => node && node.delete());
    add('sshtools2.rename', (node) => node && node.rename());
    add('sshtools2.file.open', (node) => node && node.open());
    add('sshtools2.file.download', (node) => node && node.download());
    add('sshtools2.workspace.add', (node) => serviceManager.onlineWorkspaceProvider && serviceManager.onlineWorkspaceProvider.workspace_add(node));
    add('sshtools2.workspace.del', (node) => serviceManager.onlineWorkspaceProvider && serviceManager.onlineWorkspaceProvider.workspace_del(node));
    add('sshtools2.workspace.modify', (node) => serviceManager.onlineWorkspaceProvider && serviceManager.onlineWorkspaceProvider.workspace_modify(node));
    add('sshtools2.config', () => ConfigAPI && ConfigAPI.manager());
    add(Command.REFRESH, () => API && API.refresh());
    add(Command.ONLINE_REFRESH, () => serviceManager.onlineProvider && serviceManager.onlineProvider.refresh());
    add(Command.OFFLINE_REFRESH, () => serviceManager.offlineProvider && serviceManager.offlineProvider.refresh());
    add(Command.MANAGER_REFRESH, () => serviceManager.managerProvider && serviceManager.managerProvider.refresh());
    add(Command.WORKSPACE_ONLINE_REFRESH, () => serviceManager.onlineWorkspaceProvider && serviceManager.onlineWorkspaceProvider.refresh());
    add(Command.WORKSPACE_OFFLINE_REFRESH, () => serviceManager.offlineWorkspaceProvider && serviceManager.offlineWorkspaceProvider.refresh());
    add(Command.AUTOICMP, () => API && API.auto_verify());
    add('sshtools2.group.list', () => GroupAPI && GroupAPI.show_groups_list());
    add(Command.GROUPS_LIST, () => GroupAPI && GroupAPI.show_groups_list());
    add('sshtools2.group.rename', (node) => node && node.groupRename(node));
    add('sshtools2.group.in', (node) => node && node.groupIn(node));
    add('sshtools2.group.out', () => GroupAPI && GroupAPI.to_groups_list_by_name(StatusBar.ALL));
    add('sshtools2.console.switch.on', () => API && API.console_output_switch(ConsoleOututSwitch.KEY));
    add('sshtools2.console.switch.off', () => API && API.console_output_switch(ConsoleOututSwitch.KEY));
    add('sshtools2.debug.on', () => API && API.console_output_switch(DebugSwitch.KEY));
    add('sshtools2.debug.off', () => API && API.console_output_switch(DebugSwitch.KEY));

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
