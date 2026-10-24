---
title: Astro 博客搭建与 Cloudflare Pages 部署
published: 2026-10-24
description: '记录使用 Astro 框架搭建个人博客，并部署至 Cloudflare Pages 的完整流程。涵盖 Node.js/pnpm 本地环境配置、Git 分支管理策略、Cloudflare Pages 自动构建避坑，以及自定义域名托管与防索引配置。'
image: 'https://res.cloudinary.com/rhc7o5mz/image/upload/blog/posts/astro-blog-setup-cloudflare-pages-deploy/cover.avif'
tags: [Astro, Cloudflare Pages, 博客搭建, 静态站点, 网站部署]
category: '博客'
slug: astro-blog-setup-cloudflare-pages-deploy
---

## 前言

荒废了几年的博客，最近决定整体翻修。旧站点停在 Hexo + GitHub Pages 上，文章还在，但已经不太想继续用了。这次干脆一步到位来一次整体升级，框架换成 Astro，部署迁到 Cloudflare Pages，图的就是更好的性能和开发体验。

换 Astro，主要是它在博客这件事上更现代。Hexo 能用，但页面里带多少脚本基本看主题，老主题容易拖着一堆用不上的东西，打开速度就那样。Astro 的主题通常更轻，页面干净，打开快，阅读体验更舒服。开发上也顺手，主题结构更清楚，以后想加点小功能也方便。它本来就是为内容站设计的现代框架，博客是它的主场。

迁到 Cloudflare Pages，是因为它比 GitHub Pages 专业一点。GitHub Pages 本质上是帮你把仓库里的静态文件部署成一个网站，功能到此为止；而 Cloudflare Pages 是一个正经的托管平台，即使是白嫖的免费计划，也能同时部署很多服务，统一部署、统一管理。连接 Git 仓库后自动构建部署，推上去就完事，体验很丝滑，还提供丰富的管理、监测和安全功能。

## 安装 Node.js 与配置

首先配置开发环境，我使用的是 [Fedora 系统](/posts/fedora-setup-config-troubleshooting/)，安装 Node.js 并设置 npm 全局目录：

```bash
sudo dnf install nodejs
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
```

在 `~/.bashrc` 中增加环境变量：

```bash
if [[ ":$PATH:" != *":$HOME/.npm-global/bin:"* ]]; then
    export PATH="$HOME/.npm-global/bin:$PATH"
fi
```

激活与验证：

```bash
source ~/.bashrc
echo $PATH | tr ':' '\n' | grep npm-global
npm config get prefix
```

npm 换源：

```bash
npm config set registry https://registry.npmmirror.com
```

用 Corepack 管理 pnpm：

```bash
sudo corepack enable
corepack prepare pnpm@latest --activate
```

pnpm 换源：

```bash
pnpm config set registry https://registry.npmmirror.com
pnpm config get registry
```

## 本地开发部署

可以先挑一个喜欢的主题，我这里选择 [Firefly](https://github.com/CuteLeaf/Firefly)，直接在仓库页面 Fork 到自己仓库，然后克隆到本地：

```bash
git clone git@github.com:WJD1005/Firefly.git
cd Firefly
```

为了便于维护，这里保持 `master` 分支只同步上游仓库，把所有个性化修改在另一个分支（如 `custom`）上提交，保持 `master` 分支的纯净。这样做可以把追上游更新和建立自己的博客两件事在 Git 历史上分开，未来可以有选择的合并或部分回滚到上游仓库默认状态，便于长期维护和跟随更新。先创建并切换到 `custom` 分支：

```bash
git switch -c custom
```

安装依赖：

```bash
pnpm install
```

然后启动开发服务器：

```bash
pnpm dev
```

浏览器打开 `http://localhost:4321` 即可，可以开始配置自己的博客和写文章了，一边进行自己的自定义配置和换图片、换图标等，一边清理不需要的资源。

完成以后，提交并 push 到 GitHub 仓库，第一次 push 时远端仓库还没有这个分支，需要使用：

```bash
git push --set-upstream origin custom
```

## Cloudflare Pages 部署

打开 [Cloudflare 主页](https://dash.cloudflare.com/)，在左侧侧边栏选择 **计算 > Workers and Pages**，点击 **创建应用程序**，选择 **Connect GitHub** 并在弹出的窗口中选择特定仓库授权。要注意这个页面其实配置的是 Cloudflare Workers，Cloudflare Pages 藏起来了要点击下面的小字 **继续前往 Pages**，选择 **导入现有Git储存库**，然后勾选对应的仓库，填写项目名称，分支选择刚刚的 `custom` 分支。其他设置如下：

- 框架预设：`Astro`
- 构建命令：`pnpm run build`
- 构建输出目录：`dist`

点击保存并部署，部署成功后打开 `<projectname>.pages.dev` 即可查看。

## 自定义域名（可选）

使用 `pages.dev` 国内访问可能不稳定，且对 SEO 不友好，被绑死也不自由，最好还是绑定一个自己的域名。就算只是玩玩不想买域名，挑一个靠谱的免费二级域名注册个子域都比这个默认域名好一点。

如果是其他地方注册的域名，先把域名托管到 Cloudflare 上。在主页选择 **域名 > 概览** 进入域名概览页，点击 **添加域名 > 连接域名**，然后填写域名。关于爬虫设置，搜索和代理均设置为允许，保证网站能被正常搜索和被 AI 回答搜索引用，训练我这里选择设为禁止，不让 AI 使用我的内容训练。注意禁止和阻止的差别，阻止有可能误伤混合类爬虫（例如 Googlebot），这些爬虫同时用于搜索和训练，阻止将会影响搜索。

设置完成后，Cloudflare 会给出名称服务器，复制名称服务器到域名提供商的管理页完成配置后，回到 Cloudflare 点击 **我已更新名称服务器**，然后稍等即可完成托管。

域名托管到 Cloudflare 后，到项目页设置自定义域即可。

在绑定自己的域名后，如果要防止 `*.pages.dev` 和 `*.*.pages.dev` URL 被索引，可以在本地项目的 `public/` 目录下新建一个名为 `_headers` 纯文本文件，写入以下内容：

```text
https://:project.pages.dev/*
	X-Robots-Tag: noindex

https://:version.:project.pages.dev/*
	X-Robots-Tag: noindex
```
