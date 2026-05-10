# SSH Tools 2.0

SSH Tools 2.0 是一个面向 VS Code 的 SSH / FTP / 远程管理插件，提供 SSH 主机管理、远程终端、SFTP/FTP 文件浏览、端口转发、SOCKS 代理、RDP/VNC 启动、工作区管理和配置导入导出等能力。

本仓库是基于 [XPLOT SSH Tools 1.0.81](https://marketplace.visualstudio.com/items?itemName=XPLOT.sshtools) 整理出的源码维护版本。原插件由 **XPLOT** 开发，较长时间未继续更新；本版本在保留原有使用习惯的基础上，补充了可维护的源码工程结构，并对前端、构建流程和已知问题做了修复。

> 声明：本项目为源码学习、修复和维护版本。部分源码整理、前端重写和 Bug 修复由 AI 工具辅助完成，建议在生产环境使用前自行测试关键功能。

## 功能特性

### SSH 连接管理

- 新增、编辑、删除 SSH 连接。
- 支持密码和私钥认证。
- 支持连接分组、在线/离线视图和手动刷新。
- 支持复制主机信息、连接命令和 SCP 路径。

### 远程终端

- 内置 xterm.js 终端。
- 支持在 VS Code 中打开 SSH 终端会话。
- 支持多终端窗口。
- 支持终端字体、颜色、光标等显示配置。

### SFTP / FTP 文件管理

- 浏览远程目录。
- 上传、下载文件和文件夹。
- 新建文件、新建文件夹。
- 重命名、删除远程文件或目录。
- 复制文件名、远程路径和 SCP 命令。

### 端口转发

- 支持本地端口转发。
- 支持远程端口转发。
- 支持 SOCKS 代理。
- 支持基于 ssh2 的转发模式和本地 SSH 命令模式。

### 远程桌面

- 支持 RDP 配置管理和启动。
- 支持 VNC 配置管理和启动。
- Windows RDP 可使用系统自带远程桌面客户端。
- VNC 需要本机安装对应 VNC 客户端，例如 RealVNC。

### 工作区管理

- 可将常用远程目录加入工作区视图。
- 支持在线/离线工作区树。
- 适合频繁访问固定远程目录的场景。

### 配置管理

- 支持连接配置导入导出。
- 支持 `.db` 配置备份。
- 支持 JSON 配置导入导出，方便跨机器迁移。
- 支持剪贴板 JSON 导入。
- 支持清空配置。

## 与 1.0.81 的区别

| 对比项 | 1.0.81 | 2.0.0 |
| --- | --- | --- |
| 工程形态 | 主要是编译后产物 | 补充源码工程结构 |
| 前端 | Vue 2 + Element UI | Vue 3 + Element Plus |
| 构建 | 不便于重新构建 | 支持 webpack 构建和 VSIX 打包 |
| 配置导出 | 以 `.db` 为主 | `.db` + JSON |
| 状态反馈 | 部分操作反馈不足 | 补充成功/失败提示 |
| 已知 Bug | 部分取消输入、连接清理、命令注册问题 | 已修复一批高风险问题 |
| 自动化 | 无 GitHub Actions | 支持自动构建 VSIX 和 Release |

## 安装方式

### 从 VSIX 安装

下载 GitHub Actions 或 Release 中生成的 `.vsix` 文件，然后执行：

```powershell
code --install-extension sshtools-2.0.0.vsix
```

也可以在 VS Code 中打开 Extensions 面板，选择 `Install from VSIX...` 手动安装。

### 从源码构建

环境要求：

- Node.js 20 或更高版本。
- npm。
- VS Code 1.85 或更高版本。

```powershell
git clone https://github.com/charley008/sshtool2.git
cd sshtool2

npm install
npm run build
npm run package
```

构建完成后，项目根目录会生成：

```text
sshtools-2.0.0.vsix
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装依赖 |
| `npm run dev` | 开发模式构建 |
| `npm run build` | 生产模式构建 |
| `npm run package` | 构建并生成 VSIX 安装包 |

## 项目结构

```text
src/
  api/           命令和业务 API
  connections/   SSH、FTP、端口转发、远程桌面连接逻辑
  models/        数据模型
  nodes/         TreeView 节点
  providers/     VS Code TreeDataProvider
  services/      服务管理与业务服务
  storage/       本地存储封装
  utils/         工具函数
  webview/       配置页面和管理页面

public/          Webview HTML 模板
resources/       插件图标和菜单图标
docs/            修复记录和优化计划
out/             webpack 构建产物，不建议提交到 Git
```

## 端口转发说明

本地端口转发的含义类似：

```text
本地 127.0.0.1:8888 -> SSH 隧道 -> 远程服务器侧 127.0.0.1:9999
```

概念上对应：

```bash
ssh -L 127.0.0.1:8888:127.0.0.1:9999 user@example.com
```

也就是说，本地监听 `127.0.0.1:8888`，请求会通过 SSH 连接转发到远程服务器视角下的 `127.0.0.1:9999`。目标服务需要在远程服务器上监听对应端口，否则本地监听可以启动，但实际访问时会连接失败。

## 连接 Windows 主机

如果要通过 SSH 连接 Windows 主机，需要在 Windows 目标主机上启用 OpenSSH Server：

1. 安装 OpenSSH Server。
2. 启动 `sshd` 服务。
3. 放行防火墙中的 SSH 端口，默认端口为 `22`。
4. 使用 Windows 用户名和密码或密钥连接。

参考文档：

- [OpenSSH for Windows](https://github.com/PowerShell/Win32-OpenSSH/releases)
- [Microsoft OpenSSH 安装文档](https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse)

## 远程桌面依赖

- RDP：Windows 通常可直接使用系统自带远程桌面客户端。
- Linux RDP：通常需要安装 `xfreerdp`。
- VNC：需要安装可用的 VNC 客户端，例如 RealVNC。
- VNC 默认端口通常为 `5900`，具体以服务端配置为准。

## GitHub Actions

仓库内置了自动构建流程：

- push 到 `main` 或 `master` 时自动构建 VSIX。
- pull request 时自动验证构建。
- 手动运行 workflow 时自动构建 VSIX。
- 推送 `v*` 标签时，自动将 VSIX 上传到 GitHub Release。

发布新版本示例：

```powershell
git tag v2.0.0
git push origin v2.0.0
```


## 已知限制

- 本项目仍保留部分原版数据结构和命令习惯，部分代码命名可能不够现代化。
- Linux 下 RDP/VNC/本地 SSH 命令模式依赖系统已安装对应客户端。
- 远程桌面和端口转发建议在自己的环境中重点测试。
- 配置迁移涉及历史数据格式，升级前建议先导出配置备份。

## License

MIT License，详见 [LICENSE.md](LICENSE.md)。
