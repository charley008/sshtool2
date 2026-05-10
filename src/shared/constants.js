// Canonical constants shared by the maintainable source tree.
"use strict";

const NodeType = {
    GROUP: "group",
    HOST: "host",
    FTP: "ftp",
    FTP_FOLDER: "ftpFolder",
    FTP_FILE: "ftpFile",
    FTP_LINK: "ftpLink",
    FTP_CHARACTER: "ftpCharacter",
    FTP_BLOCK: "ftpBlock",
    FTP_PIPE: "ftpPipe",
    FTP_SOCKETS: "ftpSockets",
    FTP_WORKSPACE: "ftpWorkSpace",
    SSH: "ssh",
    SSH_FOLDER: "sshFolder",
    SSH_FILE: "sshFile",
    SSH_LINK: "sshLink",
    SSH_CHARACTER: "sshCharacter",
    SSH_BLOCK: "sshBlock",
    SSH_PIPE: "sshPipe",
    SSH_SOCKETS: "sshSockets",
    SSH_WORKSPACE: "sshWorkSpace",
};

const Type = {
    SSH: "SSH",
    FORWARD: "FORWARD",
    WORKSPACE: "WORKSPACE",
    REMOTE: "REMOTE",
    FTP: "FTP",
};

const CacheKey = {
    SSH_LIST: "ssh.list",
    CONECTIONS_CONFIG: "ssh.connections",
    COLLAPSE_SATE: "ssh.cache.collapseState",
    TEMP_FILE_REMOTES: "ssh.temp.file.remotes",
    TEMP_SERVER_FORWARDS: "ssh.tmp.server.forwards",
    TEMP_HISTORY: "ssh.tmp.history",
    TEMP_STATUS_BAR: "ssh.tmp.statusbar",
    TEMP_KEYS: "ssh.tmp.keys",
    XPLOT_CACHEKEY_DATA_SSH: "xplot.cn.cachekey.data.ssh",
    XPLOT_CACHEKEY_DATA_WORKSPACE: "xplot.cn.cachekey.data.workspace",
    XPLOT_CACHEKEY_DATA_FORWARD: "xplot.cn.cachekey.data.forward",
    XPLOT_CACHEKEY_DATA_REMOTE: "xplot.cn.cachekey.data.remote",
    XPLOT_CACHEKEY_DATA_FTP: "xplot.cn.cachekey.data.ftp",
};

const ViewType = {
    HOST: "1",
    WORKSPACE: "2",
};

const OSTypes = {
    WINDOWS: "Windows_NT",
    LINUX: "linux",
    DARWIN: "Darwin",
};

const Command = {
    REFRESH: "xplot.refresh",
    ONLINE_REFRESH: "xplot.online.refresh",
    OFFLINE_REFRESH: "xplot.offline.refresh",
    MANAGER_REFRESH: "xplot.manager.refresh",
    WORKSPACE_ONLINE_REFRESH: "xplot.workspace.online.refresh",
    WORKSPACE_OFFLINE_REFRESH: "xplot.workspace.offline.refresh",
    AUTOICMP: "xplot.autoicmp",
    GROUPS_LIST: "xplot.groups.list",
    ADD_SSH: "add.ssh",
    ADD_FTP: "add.ftp",
};

const TempKeys = {
    TEMP_KEYS_TerminalOptions: "ssh.terminal.options",
};

const StatusBar = {
    ALL: "所有(ALL)",
    GROUPS_LIST: "ssh.groups.list",
};

const ResultType = {
    DETAIL: "detail",
};

const SSHType = {
    ALL: -1,
    ONLINE: 0,
    OFFLINE: 1,
};

const OSType = {
    LINUX: 0,
    WINDOWS: 1,
    DARWIN: 2,
};

const ForwardType = {
    LocalForwarding: 0,
    RemoteForwarding: 1,
    Socks5Proxy: 2,
};

const ForwardMode = {
    SSH2_Forward: 0,
    Local_SSH_EXEC: 1,
};

const RDesktopMode = {
    RDESKTOP: 0,
    VNC: 1,
};

const ConsoleOututSwitch = {
    KEY: "ConsoleOututSwitch",
    ON: "ON",
    OFF: "OFF",
};

const DebugSwitch = {
    KEY: "DebugSwitch",
    ON: "ON",
    OFF: "OFF",
};

module.exports = {
    CacheKey,
    Command,
    ConsoleOututSwitch,
    DebugSwitch,
    ForwardMode,
    ForwardType,
    NodeType,
    OSType,
    OSTypes,
    RDesktopMode,
    ResultType,
    SSHType,
    StatusBar,
    TempKeys,
    Type,
    ViewType,
};
