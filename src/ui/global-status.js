// Alias for global
// Recovered module id: 95
"use strict";

const vscode_1 = require("vscode");
const Localize = require("./localize.js").default;
const { GroupVO } = require("../models/group-model.js");
const constant_1 = require("../shared/constants.js");
const { Storage } = require("../storage/storage.js");
class Global {
    static updateStatusBarItems(key, gname) {
        const bars = Storage.get_status_bars();
        let desc = '';
        let title = '';
        let tc = '';
        if (key == constant_1.StatusBar.GROUPS_LIST) {
            bars[key] = gname;
            if (gname != constant_1.StatusBar.ALL) {
                const gvo = GroupVO.get(gname);
                desc = `(${gvo.onlineSize})`;
                title = gname;
            }
            else {
                title = constant_1.StatusBar.ALL;
                bars[key] = title;
            }
            tc = `${(0, Localize)("sshtool.view.show.group.list.title", `${title} ${desc}`)}`;
        }
        Storage.update_status_bars(bars);
        if (Global.StatusBarItem) {
            Global.StatusBarItem.text = `$(list-selection) ${tc}`;
            Global.StatusBarItem.tooltip = `${tc}`;
        }
        else {
            Global.StatusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left);
            Global.StatusBarItem.command = constant_1.Command.GROUPS_LIST;
            Global.StatusBarItem.text = `$(list-selection) ${tc}`;
            Global.StatusBarItem.tooltip = `${tc}`;
            Global.StatusBarItem.show();
        }
    }
}
exports.Global = Global;
