---
title: 如何在 Linux 上玩《鸣潮》
published: 2026-10-25
description: '在 Fedora 系统上运行《鸣潮》的完整方案，通过 ProtonPlus 安装 DW-Proton 兼容层，借助 ww-manager 命令行工具下载并管理游戏本体，最后利用 Steam 配置特定参数启动。'
image: 'https://res.cloudinary.com/rhc7o5mz/image/upload/blog/posts/play-wuthering-waves-on-linux/cover.avif'
tags: [Linux, 游戏, 鸣潮, Steam, Proton]
category: 'Linux'
slug: play-wuthering-waves-on-linux
---

> [!CAUTION] 封号风险
> 本文涉及使用兼容层（如 Proton）运行带有腾讯 ACE 反作弊的《鸣潮》。非原生环境运行存在被反作弊系统误判甚至**封号**的风险。操作前请务必三思，本博客不对账号异常负责。

> [!WARNING] 时效性说明
> 网游的反作弊机制升级极为频繁，本文方案可能随游戏更新随时失效，不保证未来的长期可用性。

## 运行环境

- 系统：Fedora 44 KDE
- 游戏版本：`3.7`
- DW-Proton 版本：`11.0.15`
- ww-manager 版本：`2.3.1`

## 兼容层准备

::github{repo=Vysp3r/protonplus}

ProtonPlus 是一个可以方便地集中管理游戏启动器兼容层的工具，安装它用来管理兼容层：

```bash
flatpak install flathub com.vysp3r.ProtonPlus
```

安装后打开，左上角切到 Steam，然后选择兼容层安装，未来也可以一键更新。安装的位置在 `~/.local/share/Steam/compatibilitytools.d/`，重启 Steam 后即可在 Steam 的兼容性设置中找到安装的兼容层。这里选择安装 [DW-Proton](https://github.com/dawn-winery/dwproton-mirror/)，其继承了 [Proton-CachyOS](https://github.com/CachyOS/proton-cachyos) 的优秀性能优化，又包含了二游特攻补丁，兼容性更强。

## 游戏下载与管理

::github{repo=timetetng/wutheringwaves-cli-manager}

ww-manager 是一个《鸣潮》第三方命令行管理器，包含下载、管理、更新以及多服切换等功能。这里用来代替官方启动器使用，因为官方启动器在 Linux 上的使用会比较麻烦，如果想运行官方启动器可以尝试参考 [在 Linux 上运行鸣潮官方启动器](https://site.moyingji.one/linux/gaming/workarounds/wuwa-launcher) 中的手搓修复方案。

推荐使用 uv 安装和管理 ww-manager，如果没有 uv 先自行安装并配置解释器、缓存和工具的路径，同时配置镜像源。然后使用 uv 安装 ww-manager：

```bash
uv tool install ww-manager
```

然后，创建游戏目录并指定路径：

```bash
mkdir -p "$HOME/games/WutheringWaves"
ww -p "$HOME/games/WutheringWaves"
```

然后开始下载客户端，这里下载国服 SD 资源：

```bash
ww download cn sd
```

更多其他使用方法，请查看项目 [README](https://github.com/timetetng/wutheringwaves-cli-manager/blob/main/README.md)，下面列出一些常用命令：

```bash
ww update               # 更新工具
ww status               # 查看状态（服务器、游戏版本与画质包状态等）
ww sync                 # 同步与修复文件
ww predownload          # 下载增量更新包（预下载阶段也可用）
ww predownload --apply  # 应用增量更新
ww sync --new           # 仅校验增量涉及文件
ww log                  # 获取抽卡记录链接
```

## Steam 启动配置

Steam 的安装与首次启动问题解决可以参考之前的 [文章](/posts/fedora-setup-config-troubleshooting/#steam)。要使用 Steam 启动《鸣潮》，需要先添加到 Steam 中。点击右下角 **添加游戏 > 添加非 Steam 游戏 > 浏览**，然后找到 `游戏目录/Client/Binaries/Win64/Client-Win64-Shipping.exe` 添加。点击 **设置 > 属性**，启动选项填写 `STEAMDECK=1 %command% -krqlv=sd`（`-krqlv` 填写对应档位的画质包名称），在 **兼容性** 中选择刚刚安装的 `DW-Proton Latest`，然后开始游戏！

第一次打开游戏时会跳用户协议窗口，以及登录时下方勾选同意用户协议这些涉及用户协议的文字内容会乱码，不影响使用，游戏内其他地方的文字不会有问题，可以不管。

## 写在最后

最后需要提醒的是，在 Linux 下通过兼容层运行带反作弊的网游，本质上是在“走钢丝”。某天游戏大版本更新，或者反作弊机制升级，这套方案随时可能失效。如果真遇到无法运行的情况，可以去关注一下 [ProtonDB](https://www.protondb.com/app/3513350) 的社区动态，看看有没有解决方法。
