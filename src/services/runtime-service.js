"use strict";

const { stopResource } = require("../utils/runtime-resource.js");

class RuntimeService {
    static async closeConnection(kind, id, vo) {
        const { Storage } = require("../storage/storage.js");
        if (kind === "ftp") {
            await require("../connections/ftp-connection.js").FTPConn.closeFTP({ id });
            return;
        }
        const { SSHConn } = require("../connections/ssh-connection.js");
        await SSHConn.closeSSH({ id });
        require("./xterm-terminal.js").XtermTerminal.closeForConnection(id);
        for (const [items, live, forward] of [[vo.forwards, Storage.get_forwards_server(), true], [vo.remotes, Storage.get_rdesktops_server(), false]]) {
            for (const item of Object.values(items)) {
                if (forward) await SSHConn.closeSSH({ id }, { fid: item.id });
                await stopResource(live[item.id]);
                delete live[item.id];
            }
        }
    }
    static async closeAll() {
        const { API } = require("../api/core-api.js");
        const { Storage } = require("../storage/storage.js");
        const { SSHConn } = require("../connections/ssh-connection.js");
        const { FTPConn } = require("../connections/ftp-connection.js");
        SSHConn.blocked = FTPConn.blocked = true;
        API.stopRefresh();
        const stopped = API.stopVerification();
        require("./transfer-service.js").TransferService.cancelAll();
        require("./xterm-terminal.js").XtermTerminal.closeAll();
        SSHConn.closeAll();
        FTPConn.closeAll();
        const results = await Promise.allSettled([Storage.get_forwards_server(), Storage.get_rdesktops_server()].flatMap(map =>
            Object.entries(map).map(async ([id, resource]) => {
                await stopResource(resource);
                if (map[id] === resource) delete map[id];
            })));
        await stopped;
        const failure = results.find(result => result.status === "rejected");
        if (failure) throw failure.reason;
    }
    static resume() {
        require("../connections/ssh-connection.js").SSHConn.blocked = false;
        require("../connections/ftp-connection.js").FTPConn.blocked = false;
        require("../api/core-api.js").API.auto_verify();
        require("../api/core-api.js").API.startRefresh();
    }
}
exports.RuntimeService = RuntimeService;
