# Change Log

## 2.0.0 2026-05-08

- 前端从 Vue 2 + Element UI 重写为 Vue 3 + Element Plus
- 配置管理新增 JSON 导出（方便跨机器迁移）

## 1.0.81 2022-10-17

- 修复寡欲终端已知Bug

## 1.0.78 2022-03-21

- 支持 terminal 自定义样式

## 1.0.77 2022-03-15

- 支持 VNC远程，需要在Client端和Server端安装 RealVNC

## 1.0.76 2021-11-23

- 解决 ssh 私钥连接问题

## 1.0.75 2021-08-21

- 解决一些已知问题

## 1.0.72 2021-07-29

- 支持 连接ftp共享

## 1.0.69 2021-07-19

- 提示:Ctrl+鼠标滑轮调整终端字体大小
- 提示:Alt+鼠标滑轮实现终端快速滚动

## 1.0.66 2021-07-17

- 支持当前目录下所有"文件"批量下载

- 支持是否实时显示SSH Tools日志输出开关

[![WQOu9J.png](https://z3.ax1x.com/2021/07/17/WQOu9J.png)](https://imgtu.com/i/WQOu9J)

## 1.0.65 2021-07-14

- 支持分组管理

[![WQO1nx.png](https://z3.ax1x.com/2021/07/17/WQO1nx.png)](https://imgtu.com/i/WQO1nx)

[![WQOmh4.png](https://z3.ax1x.com/2021/07/17/WQOmh4.png)](https://imgtu.com/i/WQOmh4)

## 1.0.62

- 支持copy 主机信息（加密）和剪切板导入主机信息功能

## 1.0.61

- 加密配置文件

## 1.0.56 - 2021-06-04

- 支持linux和windows 的图形化远程桌面
  
- Windows: use mstsc
  
- Linux: use xrdp(server) and freerdp(client),Need to install xrdp and freerdp packages 
  
- Default Port: 3389

## 1.0.54 - 2021-05-29

- 支持连接 Windows主机, 使用openssh for windows，windows需要安装openssh,且开启对应端口。
  
- [下载](https://github.com/PowerShell/Win32-OpenSSH/releases)   [安装文档](https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse)

## 1.0.44 - 2021-05-05

- 相对完善了"端口转发"功能，支持"本地端口转发和远程端口转发"，同时有"内部机制和ssh命令"两种连接方式

## 1.0.43 - 2021.04.30

- 整合 配置文件导入导出功能 到 配置管理页面  

- 同时对于“修改连接”页面进行调整，支持对”工作区“进行重命名和删除


## 1.0.42 - 2021.04.24

- 支持是否开启保存本地缓存文件，默认false。主要体现在启动vscode对已经打开的远程主机文件可以直接保存，不用再次打开文件。  


## 1.0.37 - 2021.04.04

- 支持在setting中对sshtools一些参数的自定义


## 1.0.17 - 2021.03.25

- 新增工作区，含在线和离线两种视图


## 1.0.13 - 2020.12.26

- 支持 Online、Offline 和 Manager三种视图显示
  
- 支持 强制保存“连接主机”信息；此功能将不会检测“连接主机”的信息是否正确


## 1.0.9 - 2020.12.24

- 支持 动态检测“连接主机”是否在线

- 支持 动态检测“连接主机的目录文件”更新

- 支持 配置文件差异导入；若是连接信息相同，以导入配置文件为准


## 1.0.8 - 2020.12.18

- 支持 复制文件或文件夹名称
  
- 支持 复制文件或文件夹地址

- 支持 复制文件或文件夹 scp 命令

- 支持 重命名文件或文件夹
  

## 1.0.6 - 2020.12.12

- 支持 文件图标美化
  

## 1.0.4 - 2020.12.10

- 支持开启多个终端窗口

- 国际化支持 显示英文和中文
  

## 1.0.3 - 2020.12.8

- 支持导入配置

- 支持导出配置

- 支持清除所有配置


## 1.0.0 - 2020.12.7

- 发布

