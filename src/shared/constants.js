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
    SSH_HOST_KEYS: "ssh.host.keys",
    SSHTOOL_CACHEKEY_DATA_SSH: "sshtools2.cachekey.data.ssh",
    SSHTOOL_CACHEKEY_DATA_WORKSPACE: "sshtools2.cachekey.data.workspace",
    SSHTOOL_CACHEKEY_DATA_FORWARD: "sshtools2.cachekey.data.forward",
    SSHTOOL_CACHEKEY_DATA_REMOTE: "sshtools2.cachekey.data.remote",
    SSHTOOL_CACHEKEY_DATA_FTP: "sshtools2.cachekey.data.ftp",
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
    REFRESH: "sshtools2.refresh",
    ONLINE_REFRESH: "sshtools2.online.refresh",
    OFFLINE_REFRESH: "sshtools2.offline.refresh",
    MANAGER_REFRESH: "sshtools2.manager.refresh",
    WORKSPACE_ONLINE_REFRESH: "sshtools2.workspace.online.refresh",
    WORKSPACE_OFFLINE_REFRESH: "sshtools2.workspace.offline.refresh",
    AUTOICMP: "sshtools2.autoicmp",
    GROUPS_LIST: "sshtools2.groups.list",
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
