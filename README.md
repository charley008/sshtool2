# SSH Tools 2.0 — VSCode SSH/FTP/远程管理插件

基于 [XPLOT SSH Tools 1.0.81](https://marketplace.visualstudio.com/items?itemName=XPLOT.sshtools) 的现代化重写版本。

原版由 **XPLOT** 开发，自 2022 年 10 月后停止更新（Vue 2 + Element UI）。本版本使用 **Vue 3 + Element Plus** 完全重写前端，同时修复了大量已知问题。

> **声明：** 本项目由 AI 辅助生成，前端重写和 Bug 修复均通过 AI 工具完成。后端 extension.js 基于原版编译产物进行修改。

## 功能特性

### SSH 连接管理
- 添加、编辑、删除 SSH 连接
- 支持密码和私钥两种认证方式
- 连接测试 — 验证连接信息是否正确

### FTP 连接管理
- 支持 FTP/SFTP 连接
- 支持明文和密钥认证

### 文件管理
- 远程文件浏览（SFTP）
- 上传、下载文件
- 新建文件/文件夹、重命名、删除
- 复制文件名、路径、SCP 命令

### 端口转发
- 本地端口转发、远程端口转发、Socks5 代理
- SSH2 Forward 和 Local SSH Exec 两种模式

### 远程桌面
- RDP（Windows 远程桌面）
- VNC（需安装 RealVNC）

### 工作区
- 将远程目录添加到 VSCode 工作区
- 在线/离线视图

### 终端
- 内置 xterm.js 终端
- 自定义字体、颜色、光标样式
- 多终端窗口支持

### 配置管理
- 导出为 .db 数据库文件
- 导出为 .json 文件（方便跨机器迁移）
- 从 .db 文件导入
- 粘贴 JSON 导入
- 全选/批量导出

## 与原版 1.0.81 的区别

| 对比项 | 原版 1.0.81 | 新版 2.0.0 |
|--------|------------|------------|
| 前端框架 | Vue 2 + Element UI | Vue 3 + Element Plus |
| 最后更新 | 2022-10-17 | 2026-05 |
| 主题适配 | 手动覆盖 Element UI 样式 | Element Plus CSS 变量自动适配 |
| 连接测试 | 无 | 只测试不保存不关闭 |
| 配置导出 | 仅 .db 格式 | .db + .json 双格式 |
| 状态反馈 | 无提示 | 成功/失败消息提示 |

## 安装

### 从 VSIX 安装

1. 下载 `sshtools-2.0.0.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P`
3. 输入 `Extensions: Install from VSIX...`
4. 选择下载的 .vsix 文件

### 从源码构建

**环境要求：**
- Node.js >= 16
- npm >= 8

```bash
# 克隆仓库
git clone https://github.com/charley008/sshtools2.git
cd sshtools2

# 安装依赖
npm install

# 构建
npm run build

# 打包为 VSIX
npm run package
```

构建完成后会在项目根目录生成 `sshtools-2.0.0.vsix` 文件。

**可用命令：**
| 命令 | 说明 |
|------|------|
| `npm run build` | 编译 webview 前端代码 |
| `npm run dev` | 开发模式编译（不压缩） |
| `npm run package` | 完整构建 + 打包 .vsix |

## 连接 Windows 主机

连接 Windows 主机时需要安装 OpenSSH for Windows：

1. [下载 OpenSSH](https://github.com/PowerShell/Win32-OpenSSH/releases)
2. [安装文档](https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse)
3. 默认端口：22

## 远程桌面

- **RDP**：Windows 自带，无需额外安装
- **VNC**：需要在客户端和服务端安装 [RealVNC](https://www.realvnc.com/)
- 默认端口：3389

## 重置配置

如果配置文件异常导致插件无法正常使用，点击「清空配置」可重置所有配置信息。

## License

MIT
