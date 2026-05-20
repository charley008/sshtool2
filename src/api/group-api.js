// Alias for group-api
// Recovered module id: 36
"use strict";

const vscode = require("vscode");
const { Util } = require("../utils/util.js");
const Localize = require("../ui/localize.js").default;
const { Global } = require("../ui/global-status.js");
const { QuickPickItemVo } = require("../models/quick-pick-item.js");
const { GroupVO } = require("../models/group-model.js");
const _core = require("./core-api.js");
const { StatusBar } = require("../shared/constants.js");
class GroupAPI {
    //获取所有分组
    static groups_list() {
        const groupvos = GroupVO.getAll();
        let groups = Object.keys(groupvos).map((key) => {
            return groupvos[key].name;
        });
        groups = Util.uniq(groups);
        return groups;
    }
    static groupvo_list() {
        const groupvos = GroupVO.getAll();
        let groups = Object.keys(groupvos).map((key) => {
            return groupvos[key];
        });
        return groups;
    }
    // 显示分组选择器
    static show_groups_list() {
        let groupvos = GroupAPI.groupvo_list();
        let typeArr = [];
        let qvoall = new QuickPickItemVo();
        qvoall.label = `${StatusBar.ALL}`;
        let qvoall_groupSize = 0;
        let qvoall_onlineSize = 0;
        let qvoall_offlineSize = 0;
        let qvoall_workspace = 0;
        let qvoall_currGNsize = 0;
        for (let i in groupvos) {
            const group = groupvos[i];
            let qvo = new QuickPickItemVo();
            qvo.label = `${group.name}`;
            qvo.detail = `${(0, Localize)("sshtool.group.msg.list1.title", group.currGNSize == 0 ? '0' : group.currGNSize, group.onlineSize == 0 ? '0' : group.onlineSize, group.offlineSize == 0 ? '0' : group.offlineSize, group.workSpaceSize == 0 ? '0' : group.workSpaceSize)}`;
            qvoall_groupSize += 1;
            qvoall_onlineSize += group.onlineSize;
            qvoall_offlineSize += group.offlineSize;
            qvoall_workspace += group.workSpaceSize;
            qvoall_currGNsize += group.currGNSize;
            typeArr.push(qvo);
        }
        qvoall.detail = `${(0, Localize)("sshtool.group.msg.list2.title", qvoall_groupSize == 0 ? '0' : qvoall_groupSize, qvoall_currGNsize == 0 ? '0' : qvoall_currGNsize, qvoall_onlineSize == 0 ? '0' : qvoall_onlineSize, qvoall_offlineSize == 0 ? '0' : qvoall_offlineSize, qvoall_workspace == 0 ? '0' : qvoall_workspace)}`;
        typeArr.push(qvoall);
        vscode.window.showQuickPick(typeArr, { placeHolder: (0, Localize)("sshtool.msg.show.group.list.title") }).then(group => {
            if (group) {
                GroupAPI.to_groups_list_by_name(group.label);
            }
        });
    }
    // 更新statusbar
    static to_groups_list_by_name(gname) {
        Global.updateStatusBarItems(StatusBar.GROUPS_LIST, gname);
        _core.API.refresh();
    }
    // 重命名分组名称
    static group_rename(old_name, new_name) {
        GroupVO.modifyByGName(old_name, new_name);
        _core.API.refresh();
    }
    static group_delete(gname) {
        GroupVO.del(gname);
        _core.API.refresh();
    }
}
exports.GroupAPI = GroupAPI;
