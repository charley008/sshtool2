// Alias for forward-api
// Recovered module id: 144
"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const constant_1 = require("../shared/constants.js");
const { ForwardConnection } = require("../connections/forward-connection.js");
const { ForwardCommand } = require("../connections/forward-command.js");
class ForwardApi {
    constructor(vo) {
        this.vo = vo;
    }
    stop_ssh2() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            if (forward.forward.type == constant_1.ForwardType.LocalForwarding) {
                yield new ForwardConnection(this.vo).shutdown();
            }
            else if (forward.forward.type == constant_1.ForwardType.RemoteForwarding) {
                yield new ForwardConnection(this.vo).remoteforwarding();
                throw "内部策略的远程转发 还未实现";
            }
        });
    }
    stop_local_ssh_exec() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            if (forward.forward.type == constant_1.ForwardType.LocalForwarding) {
                yield new ForwardCommand(this.vo).shutdown();
            }
            else if (forward.forward.type == constant_1.ForwardType.RemoteForwarding) {
                yield new ForwardCommand(this.vo).shutdown();
            }
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            switch (forward.forward.mode) {
                case constant_1.ForwardMode.SSH2_Forward:
                    yield this.stop_ssh2();
                    break;
                case constant_1.ForwardMode.Local_SSH_EXEC:
                    yield this.stop_local_ssh_exec();
                    break;
                default:
                    throw new Error(`运行方式 ${forward.forward.mode} 不存在`);
            }
        });
    }
    start_ssh2() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            if (forward.forward.type == constant_1.ForwardType.LocalForwarding) {
                yield new ForwardConnection(this.vo).local_forwarding();
            }
            else if (forward.forward.type == constant_1.ForwardType.RemoteForwarding) {
                yield new ForwardConnection(this.vo).remoteforwarding();
                throw "内部策略的远程转发 还未实现";
            }
        });
    }
    start_local_ssh_exec() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            if (forward.forward.type == constant_1.ForwardType.LocalForwarding) {
                yield new ForwardCommand(this.vo).local_forwarding();
            }
            else if (forward.forward.type == constant_1.ForwardType.RemoteForwarding) {
                yield new ForwardCommand(this.vo).remoteforwarding();
            }
            else if (forward.forward.type == constant_1.ForwardType.Socks5Proxy) {
                yield new ForwardCommand(this.vo).socks5Proxy();
            }
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const forward = this.vo.forward;
            switch (forward.forward.mode) {
                case constant_1.ForwardMode.SSH2_Forward:
                    yield this.start_ssh2();
                    break;
                case constant_1.ForwardMode.Local_SSH_EXEC:
                    yield this.start_local_ssh_exec();
                    break;
                default:
                    throw `运行方式 ${forward.forward.mode} 不存在`;
            }
        });
    }
}
exports.ForwardApi = ForwardApi;
