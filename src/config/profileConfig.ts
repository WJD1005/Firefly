import type { ProfileConfig } from "../types/profileConfig";

export const profileConfig: ProfileConfig = {
	// 头像
	// 图片路径支持三种格式：
	// 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
	// 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
	// 3. 远程 URL："https://example.com/avatar.jpg"
	// avatar: "assets/images/avatar.avif",
	avatar: "https://weavatar.com/avatar/7b68b0d48dbd1a1e1cb60dfc82c5b4f08bb0de0ec49f03026fcb0c61bc5cec5a?s=640",

	// 名字
	name: "星云质心",

	// 个人签名
	bio: "记录生活，分享技术",

	// 链接配置
	// 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	links: [
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/WJD1005",
			showName: false,
		},
		{
			name: "Bilibili",
			icon: "fa7-brands:bilibili",
			url: "https://space.bilibili.com/13205905",
			showName: false,
		},
		{
			name: "Email",
			icon: "fa7-solid:envelope",
			url: "mailto:1034691208@qq.com",
			showName: false,
		},
		{
			name: "QQ",
			icon: "fa7-brands:qq",
			url: "tencent://AddContact/?fromId=45&fromSubId=1&subcmd=all&uin=1034691208",
			showName: false,
		},
		// {
		// 	name: "Atom",
		// 	icon: "fa7-solid:atom",
		// 	url: "/atom/",
		// 	showName: false,
		// },
	],
};
