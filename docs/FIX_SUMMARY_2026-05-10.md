# xplot.sshtools-2.0.0 修复总结

> 日期：2026-05-10  
> 依据：`CLAUDE_OPTIMIZATION_STEPS.md` + Codex 审计结果  
> 共修复 **13 项问题**，涉及 **16 个文件**

---

## 一、稳定性修复（阶段 3）

### 1. showInputBox 按 Esc 返回 undefined → `.trim()` 崩溃

**涉及文件**：`src/api/ssh-api.js`, `src/api/ftp-api.js`, `src/nodes/group-node.js`, `src/providers/workspace-provider.js`, `src/services/workspace-service.js`

8 处 `input.trim()` 前加 `if (input === undefined) return;`。

### 2. 7 个 setInterval 未保存，deactivate 不清理

**涉及文件**：`src/api/core-api.js`, `src/services/service-manager.js`

- `ServiceManager` 加 `_intervals` 数组和 `cleanup()` 方法
- `API.auto()` 中 7 个 `setInterval` ID 全部 push 到 `ServiceManager._intervals`
- `deactivate` 中原本调 `serviceManager.cleanup()` 但方法不存在，现已补上

### 3. SSH/FTP `end` 回调访问已删除的 activeConn 崩溃

**涉及文件**：`src/connections/ssh-connection.js`, `src/connections/ftp-connection.js`

`end` 回调中加 `if (this.activeConn[key])` 判空检查。

### 4. `xplot.terminal.hear` 命令声明但未注册

**涉及文件**：`src/entry.js`

在 `cmdList` 中注册 `xplot.terminal.hear`，行为与 `xplot.connection.terminal` 一致。

---

## 二、安全修复（阶段 6）

### 5. exec/execSync 命令注入 + 密码暴露

**涉及文件**：`src/connections/forward-command.js`, `src/connections/rdp-remote.js`, `src/connections/vnc-remote.js`

| 修改 | 说明 |
|---|---|
| `taskkill` / `kill` | 改用 `execFile` 数组参数 |
| Linux 复杂 shell 管道 (`ps\|grep\|awk\|xargs`) | 改用 `getProcesses()` 查找进程 + `execFile('kill')` |
| `mstsc` / `xfreerdp` / `vncviewer` | 改用 `execFile` 数组参数 |
| `cmd /K start` + `sshpass` | 暂无法安全替换，标注了 TODO 风险 |
| `console.log(cmd)` | 删除，不再打印含密码的命令行 |

---

## 三、代码质量

### 6. 清理 ~20 条调试 console.log

**涉及文件**：`src/services/ssh-service.js`, `src/storage/storage.js`, `src/api/ftp-api.js`, `src/services/config-service.js`

删除了 `[TEST]`/`[SAVE]` 调试日志、`console.log(cmd)` 密码泄露、配置数据 dump。保留了 `entry.js` 生命周期日志和 `evilscan-options.js` CLI 版本信息。

### 7. Storage.update_ssh_list() 空操作

**涉及文件**：`src/storage/storage.js`

取消注释 `this.context.globalState.update(CacheKey.SSH_LIST, ssh_list)`。

### 8. FTPDT.insert_ftp 不生成 ID

**涉及文件**：`src/storage/ftp.js`

对齐 `SSHDT.insert_ssh` 逻辑，自动生成 UUID 和默认名称。

### 9. throw new Error(e) 丢失原始堆栈

**涉及文件**：`src/api/config-api.js`, `src/services/forward-service.js`, `src/services/remote-service.js`

8 处 `throw new Error(e)` 改为 `throw e`，保留原始堆栈信息。

### 10. package.nls.json 拼写错误

**涉及文件**：`package.nls.json`

`Stoped` → `Stopped`。

---

## 四、运行时错误

### 11. 终端关闭后设置已释放 webview 的 iconPath 崩溃

**涉及文件**：`src/services/xterm-terminal.js`

`sshlog` 函数中 `handler.panel.iconPath` 赋值用 try-catch 包裹，面板已释放时静默忽略。

### 12. SSH 登录失败导致 unhandledRejection 红色对话框

**涉及文件**：`src/entry.js`

`activate` 中注册 `process.on('unhandledRejection')` 处理器，SSH 常见错误（`Login incorrect`, `ECONNREFUSED`, `ETIMEDOUT` 等）降级为 `console.warn`，不再弹出"出现未知错误"对话框。`deactivate` 时移除监听器。

---

## 五、配置管理 UX

### 13. 导出 DB/JSON 修复

**涉及文件**：`src/services/config-service.js`, `src/webview/main.js`

| 问题 | 修复 |
|---|---|
| DB 导出对话框跳到远程文件缓存目录 | 加 `defaultUri: vscode.Uri.file(os.homedir())` |
| DB 导出后面板直接关闭 | 去掉 `handler.panel.dispose()`，改为 `showInformationMessage` 提示路径 |
| JSON 导出提前显示"成功" | 去掉提前的 `ElMessage.success`，改为保存后提示 |
| webview 中 `a.click()` 无法触发系统保存对话框 | JSON 导出改为走 extension host 的 `showSaveDialog` |
| Vue Proxy 对象无法通过 `postMessage` 传递（DataCloneError） | `toRaw()` + `JSON.parse(JSON.stringify())` 剥离 Proxy |

---

## 六、未完成项（后续独立任务）

| 任务 | 说明 |
|---|---|
| SSH 转发启动命令 | `forward-command.js` 中 Windows `cmd /K start` 和 Linux `sshpass` 仍用 `exec`，已标注 TODO |
| xfreerdp 密码传递 | `rdp-remote.js` 中密码通过命令行参数传递，进程列表可见，已标注 TODO |
| 硬编码 AES 密钥 | `src/utils/util.js` 中 key/IV 硬编码 |
| Settings 热更新 | `src/utils/settings.js` 在模块加载时只读一次，改了不生效 |
| 端口转发/远程桌面状态持久化 | `tempForwards` 等只存内存，重启丢失 |
| SecretStorage 凭据迁移 | 密码/私钥从 globalState 迁到 VS Code SecretStorage |
