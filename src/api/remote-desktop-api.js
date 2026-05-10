// Alias for rdesktop-api
// Recovered module id: 228
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

const { RDesktopMode } = require("../shared/constants.js");
const { RDP } = require("../connections/rdp-remote.js");
const { VNC } = require("../connections/vnc-remote.js");
class RDesktopAPI {
    constructor(vo) {
        this.vo = vo;
    }
    start_rdp() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new RDP(this.vo).start();
        });
    }
    stop_rdp() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new RDP(this.vo).shutdown();
        });
    }
    start_vnc() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new VNC(this.vo).start();
        });
    }
    stop_vnc() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new VNC(this.vo).shutdown();
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            const remote = this.vo.remote;
            switch (remote.mode) {
                case RDesktopMode.RDESKTOP:
                    yield this.stop_rdp();
                    break;
                case RDesktopMode.VNC:
                    yield this.stop_vnc();
                    break;
                default:
                    throw new Error(`运行方式 ${remote.mode} 不存在`);
            }
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const remote = this.vo.remote;
            switch (remote.mode) {
                case RDesktopMode.RDESKTOP:
                    yield this.start_rdp();
                    break;
                case RDesktopMode.VNC:
                    yield this.start_vnc();
                    break;
                default:
                    throw new Error(`运行方式 ${remote.mode} 不存在`);
            }
        });
    }
}
exports.RDesktopAPI = RDesktopAPI;
