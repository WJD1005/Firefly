---
title: Fedora 折腾记录：安装、配置与常见问题解决
published: 2026-10-21
description: '记录 Fedora 44 KDE 从安装到日常可用的配置全过程。涵盖系统安装与国内镜像源配置，NVIDIA 驱动、fcitx5-rime 输入法、Steam 与 Watt Toolkit 等软件的安装与配置，以及 Firefox/Chromium 视频硬解与其他常见问题解决。'
image: 'https://res.cloudinary.com/rhc7o5mz/image/upload/blog/posts/fedora-setup-config-troubleshooting/cover.avif'
tags: [Linux, Fedora, KDE, NVIDIA, 视频硬解, 踩坑记录]
category: 'Linux'
slug: fedora-setup-config-troubleshooting
---

## 前言

不知从什么时候起，我越来越想要一个更可控、更干净、完全符合我强迫症和洁癖的操作系统。在仔细审视了日常需求后，我发现目前几乎没有必须依赖 Windows 的场景。平时我已经有意识地在使用跨平台软件，哪怕遇到极端情况，实验室工位的电脑有 Windows 可用，本地也可以有虚拟机兜底。这些条件彻底打消了我的顾虑（虽然实际用起来还是需要很折腾的），于是，把 Fedora 作为主力系统的念头，就这么顺理成章地变成了现实。

至于为什么最终选择了 Fedora，因为在我眼里，不同派系的 Linux 发行版有着不同的性格：

- Debian 像是工作：追求极致的稳定，代价是软件包相对较老，更适合放在服务器或工作机上按部就班，不太适合日常使用和娱乐等。
- Arch Linux 像是折腾：滚动更新，追求最新，需要你亲手去揉捏每一处细节，适合享受折腾过程的人，但是日常使用可能不是那么省心。
- Fedora 更像是生活：半年一次的版本更新，既让我能及时体验到较新的内核、驱动与桌面特性，又能尽可能保持在一种可控的稳定状态。

这套既有新鲜感又有安全感的平衡，加上高度纯净的默认环境，恰好长在了我的审美上。这篇记录，就是这段折腾旅程的产物。

本文适用的系统环境：**Fedora Linux 44 (KDE Plasma Desktop Edition)**。

## 系统安装

> 镜像下载：[Fedora KDE Plasma Desktop | The Fedora Project](https://fedoraproject.org/kde/download/)

我这里使用 Ventoy 制作启动盘，进入 Live 环境后开始安装。因为我是直接替换 Windows 作为我的主力系统，所以直接使用整个磁盘安装自动分区，自动分区结果为：

| 分区 | 大小 | 格式化 | 挂载点 |
| --- | --- | --- | --- |
| nvme0n1p1 | 629 MB | efi | /boot/efi |
| nvme0n1p2 | 2.15 GB | ext4 | /boot |
| nvme0n1p3 | 509 GB | btrfs subvolume | / |
| nvme0n1p3 | 509 GB | btrfs subvolume | /home |

可以看到，根目录与家目录使用了 Btrfs 子卷，它们同属于一个物理分区，共享同一个空间池，实现了空间的自由分配。这种设计的优势在于：它避免了传统 Windows 分区中 C 盘爆满而 D 盘空闲或者相反的尴尬；虽然 Windows 不分盘也能解决空间分配问题，但在单块硬盘的情况下，又无法将系统与用户数据隔离。而 Btrfs 完美兼顾了这两点：它既支持快照与回滚，又能单独对根目录拍摄快照回滚而不影响家目录；即便需要重装系统，也只需格式化根目录子卷即可。空间自由分配与系统数据隔离，这两个愿望在 Btrfs 子卷的加持下一次满足了。

发现没有 Swap 分区，这是因为默认使用 ZRAM 代替，把物理内存划分出一部分创建一个压缩的块设备当作虚拟内存，速度快、不伤硬盘、动态分配。在安装完系统后使用以下任意一条命令都可以看出利用 ZRAM 虚拟出了 Swap 空间：

```bash
free -h
swapon --show
zramctl
```

## 包管理与镜像源

### 使用优先级

作为一个强迫症晚期患者，用好包管理器是第一件事，能用包管理器装尽量用包管理器装，包管理器没有的尽量少装。基于此，我的软件安装优先级从高到低排列如下：

- DNF（最高优先级）：Fedora 原生包管理器，直接与系统深度集成，依赖由 `dnf` 统一管理。安全稳定，最适合内核、驱动、开发工具及对系统集成度要求高的软件。
- Fedora Flatpak（中等优先级）：由 Fedora 官方从 RPM 重新打包。默认优先级高于 Flathub。适合官方提供且对沙箱隔离要求不苛刻的桌面应用。
- Flathub Flatpak（较低优先级）：社区维护的第三方源，应用最全，兼容性好。适合 Fedora 官方仓库没有或版本太旧的桌面应用，尤其是闭源软件。

如果包管理器未收录，就只能采用脱离包管理的妥协方案，比如解压包与 AppImage。这两者均无法实现自动更新，由于完全依赖手动管理，这类方案仅适合应急使用。同理，直接下载离线的 `.rpm` 单体包也属于这种情况。虽然它的安装过程依然交由底层的 `dnf` 处理，但因为它没有绑定软件源，同样无法自动更新。

### Fedora 镜像源配置

> [Fedora - USTC Mirror Help](https://mirrors.ustc.edu.cn/help/fedora.html)

```bash
sudo dnf config-manager setopt \
    fedora.baseurl='https://mirrors.ustc.edu.cn/fedora/releases/$releasever/Everything/$basearch/os/' \
    fedora.metalink= \
    updates.baseurl='https://mirrors.ustc.edu.cn/fedora/updates/$releasever/Everything/$basearch/' \
    updates.metalink=
sudo dnf clean all
sudo dnf makecache
```

### RPM Fusion 镜像源配置

> [RPM Fusion - USTC Mirror Help](https://mirrors.ustc.edu.cn/help/rpmfusion.html)

```bash
sudo dnf install https://mirrors.ustc.edu.cn/rpmfusion/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm https://mirrors.ustc.edu.cn/rpmfusion/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm
sudo sed -e 's|^metalink=|#metalink=|g' \
         -e 's|^#baseurl=http://download1.rpmfusion.org|baseurl=https://mirrors.ustc.edu.cn/rpmfusion|g' \
         -i.bak \
         /etc/yum.repos.d/rpmfusion*.repo
sudo dnf clean all
sudo dnf makecache
```

### Flathub 镜像源配置

> [Flathub 缓存 - USTC Mirror Help](https://mirrors.ustc.edu.cn/help/flathub.html)

```bash
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
sudo flatpak remote-modify flathub --url=https://mirrors.ustc.edu.cn/flathub
```

## 软件安装与配置

下面仅记录安装方式较特殊或需要额外配置的软件，开箱即用的常规软件不再赘述。

### NVIDIA 驱动

> [Howto/NVIDIA - RPM Fusion](https://rpmfusion.org/Howto/NVIDIA)

~~So, NVIDIA, f**k you!~~

Linux 用户一半的折腾，都来源于 N 卡。而且即使装上了驱动，很多功能也做不到像 A 卡一样开箱即用。但至少，现在在 Fedora 上安装 N 卡驱动已经变得非常简单！

安装驱动前的准备：如果启用了 Secure Boot，需要签名（参考 [Howto/Secure Boot - RPM Fusion](https://rpmfusion.org/Howto/Secure%20Boot)），这里我选择直接禁用 Secure Boot，就不用处理签名步骤了。然后安装驱动：

```bash
sudo dnf update -y # and reboot if you are not on the latest kernel
sudo dnf install akmod-nvidia # rhel/centos users can use kmod-nvidia instead
sudo dnf install xorg-x11-drv-nvidia-cuda #optional for cuda/nvdec/nvenc support
```

运行完后需要等待编译，检查编译是否完成：

```bash
modinfo -F version nvidia
```

如果输出显卡驱动版本即完成。查看 license：

```bash
modinfo -F license nvidia
```

输出 `Dual MIT/GPL`，这是因为自 NVIDIA 驱动 `515xx` 起，已有方法使用完整的开源内核空间驱动（用户空间驱动仍为闭源），这只适用于 Turing、Ampere 及其他新架构显卡（旧 GPU 几乎无法使用）。当前的 `kmod-nvidia` 包默认情况下会使用预构建的开源版本，所以安装使用非常方便。

重启，检查驱动安装情况：

```bash
nvidia-smi
```

要注意不被主线驱动支持的旧显卡需要安装特定分支版本，可以在 [Supported NVIDIA GPU Products](https://download.nvidia.com/XFree86/Linux-x86_64/615.71.09/README/supportedchips.html) 里面搜索自己的显卡以确定是安装主线版本还是其他特定分支版本。

### 输入法

这里使用 fcitx5-rime + 雾凇拼音：

```bash
sudo dnf install fcitx5 fcitx5-rime
```

然后我这里使用 plum 来管理方案方便后续打补丁：

```bash
git clone https://github.com/rime/plum.git plum
cd plum
rime_dir="$HOME/.config/fcitx5/rime" bash rime-install iDvel/rime-ice
```

需要注意的是 plum 安装方案时默认的是 ibus-rime 的用户文件夹路径，因此要给 fcitx5-rime 安装方案的话需要手动指定目录。

### Steam

> [Steam Installation :: Fedora Docs](https://docs.fedoraproject.org/en-US/gaming/steam/)

要玩游戏肯定离不开 Steam，而且用 Steam 兼容层玩 Windows 游戏很方便，但是部分游戏可能需要特殊版本或社区版本的 Proton 来运行。要注意不要安装 Flathub 上的 Steam，因为在 Flatpak 沙箱里面运行可能会存在一些问题，所以这里使用 `dnf` 安装：

```bash
sudo dnf install steam
```

打开发现任务栏出现一会又关闭，使用终端运行发现已经启动，先 kill 掉，然后再终端运行，会发现正在下载更新，需要等待非常漫长的下载过程。

在更新完成后，GUI 依旧无法启动，在终端使用以下环境变量运行 Steam 可以成功运行：

```bash
__GL_CONSTANT_FRAME_RATE_HINT=3 steam
```

该环境变量可以通过禁用 NVIDIA 驱动中出现问题的代码路径来绕过特定的驱动兼容性问题。同理，也可以一开始就在终端使用这条命令启动并更新，更新完就能直接正常启动。

想要查看一个游戏是否能玩、要用什么版本的 Proton，可以在 [ProtonDB](https://www.protondb.com/) 查询。

### Watt Toolkit

这玩意无法通过包管理器安装，但是鉴于它非常有用这里手动安装一下。官网给出了安装脚本，但是其安装路径写在脚本中不够优雅。为了控制安装路径，这里使用下载压缩包（`.tgz`）的形式手动解压安装。这里我选择放在 `~/apps/` 中，以集中对所有类似的解压、AppImage 以及 Windows（通过兼容层运行）小应用进行用户层面的直观管理。先确保系统有以下依赖：`certutil`，`jq`，`zenity`，然后下载压缩包并解压：

```bash
mkdir -p ~/apps/watt-toolkit
tar -xzf ~/Downloads/Steam _v3.1.0_linux_x64.tgz -C ~/apps/watt-toolkit
```

给运行脚本赋予权限：

```bash
chmod +x ~/apps/watt-toolkit/Steam++.sh
```

运行后弹出弹窗申请权限要求允许绑定网络特权端口（`setcap cap_net_bind_service`），确定即可。未来需要撤销授权应该可以使用：

```bash
sudo setcap -r ~/apps/watt-toolkit/modules/Accelerator/Steam++.Accelerator
```

接着需要授权 hosts 文件权限，官网使用以下命令直接修改文件权限：

```bash
sudo chmod a+w /etc/hosts
```

这种做法不够优雅，因为会让任何用户任何程序都有权限去修改它。一开始我想对程序单独授权但是尝试失败了，这里就仅做用户限制放开自己对文件的写权限，相对于官网的做法权限会小一点，使用 ACL 实现：

```bash
sudo setfacl -m u:wjd:rw /etc/hosts
```

验证权限：

```bash
getfacl /etc/hosts
```

如果未来要撤销，可以使用：

```bash
sudo setfacl -x u:wjd /etc/hosts
```

点击一键加速，连通性测试显示 error，还要安装证书：

```bash
sudo cp /home/wjd/.local/share/Steam++/Plugins/Accelerator/SteamTools.Certificate.cer /etc/pki/ca-trust/source/anchors/watt-toolkit.crt
sudo update-ca-trust
```

这里发现火狐浏览器无须手动导入证书即可实现加速（后面换 Chromium 也没问题），应该是继承了系统证书，Fedora 在这一方面做得比较好，无须按照官网教程手动一个个导入，但 Steam 还不能加速，还是需要处理证书。官网说由于内核是相同的所以给 Chrome 导入即可，但其实不用额外装一个 Chrome 浏览器，启动 Steam 任意一个游戏，使用 `Shift + Tab` 打开游戏内覆盖，找到网页浏览器，这个网页浏览器可以修改地址栏，输入 `chrome://settings/certificates`，然后参考官网教程导入。但是实际上我发现也不用导入，在授权机构 `org-BeyondDimension` 下已经能看到`
SteamTools Certificate`了，只是显示不可信，点击修改勾选 `信任该证书，以标识网站身份`，然后即可成功加速。

最后为了方便启动，新建桌面启动文件 `~/.local/share/applications/watt-toolkit.desktop` 然后写入：

```ini
[Desktop Entry]
Name=Watt Toolkit
Comment=Steam++ 加速器
Exec=/home/wjd/apps/watt-toolkit/Steam++.sh
Icon=/home/wjd/apps/watt-toolkit/Icons/Watt-Toolkit.png
Terminal=false
Type=Application
Categories=Utility;
```

就可以出现在菜单中了，没有的话刷新缓存：

```bash
update-desktop-database ~/.local/share/applications
```

### VS Code

> [Installing Visual Studio Code on Linux](https://code.visualstudio.com/docs/setup/linux)

先安装密钥和 yum 仓库，然后更新包缓存，最后使用 `dnf` 安装软件包：

```bash
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc &&
echo -e "[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\nautorefresh=1\ntype=rpm-md\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" | sudo tee /etc/yum.repos.d/vscode.repo > /dev/null
dnf check-update &&
sudo dnf install code
```

修改编辑器字体，因为默认字体族为 `'Droid Sans Mono', monospace`，非常丑陋看着难受，这里直接用自带的 `Noto Sans Mono` 和 `Noto Sans CJK SC`：

```json
"editor.fontFamily": "'Noto Sans Mono', 'Noto Sans CJK SC', monospace",
"editor.fontSize": 16
```

喜欢英文字符宽度是中文字符宽度一半以严格对齐的也可以尝试用 `Noto Sans Mono CJK SC`，但是我个人觉得会导致英文字符有点窄像被门挤了不太喜欢。

### MPV

安装 mpv：

```bash
sudo dnf install mpv
```

复制配置模板到用户配置文件夹：

```bash
cp -r /usr/share/doc/mpv/ ~/.config/
```

在 `mpv.conf` 中随便瞎写点配置先用着：

```ini
hwdec=auto                            # 硬解
vo=gpu-next                           # 使用新一代渲染器，画质和性能更佳
profile=gpu-hq                        # 启用高质量GPU渲染预设
scale=ewa_lanczossharp                # 高质量缩放算法
dscale=ewa_lanczossoft                # 高质量缩放着色器

keep-open=always                      # 播放完暂停

osd-font="Noto Sans Mono"             # 修复OSC字体问题
sub-font="Noto Sans CJK SC"           # 字幕使用中文字体，显示美观
sub-font-size=45                      # 字幕大小
sub-auto=fuzzy                        # 自动加载同名字幕，容错率高

target-colorspace-hint-mode=source    # 根据输入源的色彩空间来设置输出，解决了SDR内容被错误当作HDR
```

如果觉得 mpv 太简洁不习惯使用想用更好的 GUI 交互的话也可以用加了 GTK+ 前端的 Celluloid：

```bash
sudo dnf install celluloid
```

它和 mpv 是共享配置的，按 mpv 去配置即可。

## 常见问题

### 家目录下的中文目录

`~/Documents` 等家目录下的系统目录被本地化为了中文变为 `~/文档` 等，这本质是 `xdg-user-dirs` 自动翻译的结果，这使得在终端敲命令涉及输入这些路径时非常便秘，需要将其变回英文。

这里采用的修改方法不涉及全局系统配置，仅对当前用户做出最小修改。首先，将用户目录语言修改为英文阻止自动翻译：

```bash
echo "en_US" > ~/.config/user-dirs.locale
```

之后，在 `~/.config/user-dirs.dirs` 中将目录修改回英文：

```ini
XDG_DESKTOP_DIR="$HOME/Desktop"
XDG_DOWNLOAD_DIR="$HOME/Downloads"
XDG_TEMPLATES_DIR="$HOME/Templates"
XDG_PUBLICSHARE_DIR="$HOME/Public"
XDG_DOCUMENTS_DIR="$HOME/Documents"
XDG_MUSIC_DIR="$HOME/Music"
XDG_PICTURES_DIR="$HOME/Pictures"
XDG_VIDEOS_DIR="$HOME/Videos"
```

最后，重命名实际的文件夹：

```bash
mv ~/桌面 ~/Desktop
mv ~/下载 ~/Downloads
mv ~/模板 ~/Templates
mv ~/公共 ~/Public
mv ~/文档 ~/Documents
mv ~/音乐 ~/Music
mv ~/图片 ~/Pictures
mv ~/视频 ~/Videos
```

修改之后发现存在 `~/Desktop/桌面`，删掉即可（有东西先挪出来）。文件管理器的边栏导航失效，重新编辑指向的位置即可。

### 浏览器视频无法播放

发现 B 站部分视频无法播放，显示网络状况异常，请稍后重试，错误码 6003。这实际上不是网络问题，实际是解码器出问题。Fedora 默认安装的是 `ffmpeg-free` 包，移除了部分专利解码器，用完整版 `ffmpeg`（RPM Fusion 提供）替换即可：

```bash
sudo dnf swap ffmpeg-free ffmpeg --allowerasing
```

还有一种方法是保持系统 `ffmpeg-free` 包不变，仍由官方仓库提供，仅使用 RPM Fusion 提供的 `libavcodec-freeworld` 在运行时覆盖掉官方 `ffmpeg-free` 中的 `libavcodec-free` 缺失的非自由解码器：

```bash
sudo dnf install libavcodec-freeworld
```

第二种方法仅补充了解码器，但是考虑到全局通用性我选择替换完整版的 `ffmpeg` 以获得完整的编码器、格式封装、高级滤镜支持。

### 浏览器视频硬解

~~So, NVIDIA, f**k you!~~

#### Firefox

> [Howto/NVIDIA - RPM Fusion](https://rpmfusion.org/Howto/NVIDIA)
>
> [Firefox - ArchWiki](https://wiki.archlinux.org/title/Firefox)

有两种方案实现硬解，一种是基于 VA-API，安装桥接工具和依赖：

```bash
sudo dnf install libva-nvidia-driver libva-utils vdpauinfo
```

安装完后使用 `vainfo` 验证，此时 N 卡具备了使用 VA-API 硬解的能力。

Firefox 要在 N 卡上用 VA-API 硬解，目前需要在 `about:config` 中将 `media.hardware-video-decoding.force-enabled` 改为 `true`（不然 `about:support` 里看是不支持的）。此时发现虽然 `about:support` 中变为了支持，但这其实是因为开启了强制启用所以显示支持，实测还无法硬解。参考 [nvidia-vaapi-driver](https://github.com/elFarto/nvidia-vaapi-driver/) 的文档可能还需要使用一些环境变量，经测试，只需要使用 `MOZ_DISABLE_RDD_SANDBOX=1` 环境变量运行就可以了，可以在终端中先进行测试：

```bash
env MOZ_DISABLE_RDD_SANDBOX=1 firefox
```

成功后可以复制一个桌面启动文件到用户目录：

```bash
cp /usr/share/applications/org.mozilla.firefox.desktop ~/.local/share/applications/
```

修改所有 `Exec` 行加上环境变量例如：

```ini
Exec=env MOZ_DISABLE_RDD_SANDBOX=1 firefox %u
```

最后更新桌面数据库即可直接启动：

```bash
update-desktop-database ~/.local/share/applications
```

另一种更新、更优雅、更原生的做法是用 Vulkan 实现硬件加速，因为 FFmpeg 引入了 Vulkan 支持，无需依赖桥接传统的 VA-API，本身是开箱即用的。想要在 Firefox 上使用，要求 Firefox 版本在 153 及以上，在 `about:config` 中将 `media.hardware-video-decoding-vulkan.enabled` 设为 `true` 以启动复制路径，可选设置 `media.hardware-video-decoding-vulkan.direct-export.enabled` 为 `true` 以直接输出，对 N 卡来说这两个设置对显卡架构和驱动版本是有要求的，具体参考 [ArchWiki](https://wiki.archlinux.org/title/Firefox)。但是实测发现还不能起效，目前同样需要开启强制启动设置 `media.hardware-video-decoding-vulkan.force-enabled` 为 `true`，注意和 `media.hardware-video-decoding.force-enabled` 是不同的，后者实际上是强制启动 VA-API 的。

#### Chromium

> [Chromium - ArchWiki](https://wiki.archlinux.org/title/Chromium)

本来就打算使用 Firefox 的，开源理想主义战士这一块，而且硬解已经折腾好了。但理想和现实总是冲突的，由于各种兼容性问题和使用感受，迫使我转向基于 Chromium 内核的浏览器以获得更好的兼容性和使用体验。在基于 Chromium 的开源浏览器中，本来打算使用 Ungoogled Chromium 以剥离所有谷歌服务的，但是这玩意没有官方打包遂放弃（洁癖这一块），虽然也考虑过 Brave Origin 等，但最后还是选择官方仓库中的最上游的 Chromium 打包来获得稳定的使用体验：

```bash
sudo dnf install chromium
```

有意思的是，当你使用 `dnf search chromium` 的时候，可以看到它的简介：`A WebKit (Blink) powered web browser that Google doesn't want you to use`，赛博竖中指这一块。~~So, Google, f**k you!~~

目前在 Chromium 上我只实现了使用 VA-API 硬解。根据 [ArchWiki](https://wiki.archlinux.org/title/Chromium)，Chromium 143 及以后基于 VA-API 的硬件加速应该是开箱即用的。但是目前对于 N 卡，除了要安装上面的桥接工具之外，还需要启用 `VaapiOnNvidiaGPUs`。[ArchWiki](https://wiki.archlinux.org/title/Chromium) 描述配置可在 `~/.config/chromium-flags.conf` 中写入 `--enable-features=VaapiOnNvidiaGPUs`。但是经测试无效，折腾了非常久尝试加各种参数和环境变量启动均无效，最后发现 ArchWiki 确实是对的，确实只需要这个参数，折腾更多参数是无意义的。真正的问题在于在 Fedora 上 Chromium 根本就没有读取 `~/.config/chromium-flags.conf`！在终端带参数直接运行测试：

```bash
chromium-browser --enable-features=VaapiOnNvidiaGPUs
```

发现能成功实现硬解，因此固化的方式应该是复制一个桌面启动文件：

```bash
cp /usr/share/applications/chromium-browser.desktop ~/.local/share/applications/
```

修改所有 `Exec` 行加上参数例如：

```ini
Exec=chromium-browser --enable-features=VaapiOnNvidiaGPUs %U
```

要验证硬解是否生效，可以在 `chrome://gpu/` 中查看是否有硬件解码器，还可以打开 `chrome://media-internals/` 然后播放视频查看对应的日志。

## 结语

经过这一番折腾，当前的 Fedora 环境已经基本达到了我日常使用与娱乐的可用状态。从底层的系统环境到上层的软件配置，它变得完全可控且干净，彻底满足了我的强迫症与洁癖。

写这篇记录，并不是为了安利。我一直认为，向毫无经验的新手推荐 Linux 桌面是一件极不负责任的事。网上经常有人吹嘘 Linux 桌面有多好用，却刻意淡化了背后的排错成本和维护门槛。普通人需要的是拿来即用的工具，而不是把时间花在修系统上。

如果你不知道自己能用 Linux 干什么，那就证明你根本不需要它。真正需要 Linux 的人，自然会去寻找并使用它。所以，这篇记录仅作折腾过程的分享与参考。至于向别人推荐 Linux 日用，大可不必，我向来只负责劝退。
