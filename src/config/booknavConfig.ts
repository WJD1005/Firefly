import type { BooknavGroup, BooknavPageConfig } from "../types/booknavConfig";

// 书签导航页面配置
export const booknavPageConfig: BooknavPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// favicon 自动获取配置
	favicon: {
		// 书签未填写 icon 时，是否自动获取目标站点的 favicon 图标
		enabled: true,

		// favicon 接口地址，{domain} 为占位符，会被替换成目标站点域名
		// 更换接口只需保证地址里含有 {domain}，例如：
		//   https://a.favicon.im/{domain}
		//   https://favicon.im/{domain}
		api: "https://a.favicon.im/{domain}",
	},
};

// 书签导航配置
// 每个数组项是一个分类组，分类组内的 items 是该分类下的书签
export const booknavConfig: BooknavGroup[] = [
	{
		id: "blog",
		name: "博客",
		icon: "material-symbols:code-rounded",
		desc: "博客搭建相关",
		weight: 100,
		items: [
			{
				title: "Astro",
				url: "https://astro.build",
				desc: "内容驱动型网站的 Web 框架",
				weight: 10,
			},
			{
				title: "Firefly Docs",
				url: "https://docs-firefly.cuteleaf.cn",
				desc: "Firefly 主题模板文档",
				icon: "https://docs-firefly.cuteleaf.cn/logo.png",
				weight: 9,
			},
			{
				title: "GitHub",
				url: "https://github.com",
				desc: "全球最大的代码托管平台",
				// icon 字段可以使用 astro-icon 图标库的图标名称
				// 也可以使用图片 URL 和本地图片路径
				// 不填则会通过接口自动获取目标站点的 favicon 图标（需要在上面配置）
				icon: "fa7-brands:github",
				weight: 8,
			},
			{
				title: "Cloudflare",
				url: "https://www.cloudflare.com",
				desc: "极速的 CDN 与网站托管服务",
				icon: "https://www.cloudflare.com/favicon.ico", 
				weight: 7,
			},
			{
				title: "WeAvatar",
				url: "https://weavatar.com",
				desc: "国内极速的头像解析与托管服务",
				icon: "https://weavatar.com/favicon.ico",
				weight: 6,
			},
			{
				title: "Cloudinary",
				url: "https://cloudinary.com",
				desc: "强大的云端图片存储与优化平台",
				icon: "https://cloudinary.com/favicon.ico",
				weight: 5,
			},
		],
	},
	// {
	// 	id: "opensource",
	// 	name: "项目",
	// 	icon: "material-symbols:code-rounded",
	// 	desc: "好用的开源项目",
	// 	weight: 90,
	// 	items: [
	// 		{
	// 			title: "Firefly",
	// 			url: "https://github.com/CuteLeaf/Firefly",
	// 			desc: "清晰美观的 Astro 个人博客主题模板",
	// 			// icon: "/favicon/firefly-32.png",
	// 			weight: 10,
	// 		},
	// 	],
	// },
	{
		id: "tools",
		name: "工具",
		icon: "material-symbols:build-outline-rounded",
		desc: "在线工具",
		weight: 80,
		items: [
			{
				title: "Bigjpg",
				url: "https://bigjpg.com/",
				desc: "AI人工智能图片无损放大",
				weight: 10,
			},
			{
				title: "TinyPNG",
				url: "https://tinypng.com",
				desc: "在线压缩 PNG / JPEG 图片",
				weight: 10,
			},
			{
				title: "LaTeXLive",
				url: "https://www.latexlive.com/",
				desc: "在线 LaTeX 公式编辑器",
				weight: 9,
			},
			{
				title: "LaTeX 表格在线生成器",
				url: "https://tableconvert.com/zh-cn/latex-generator",
				desc: "在线生成 LaTeX 表格",
				weight: 9,
			},
			{
				title: "Markdown 表格在线生成器",
				url: "https://tableconvert.com/zh-cn/markdown-generator",
				desc: "在线生成 Markdown 表格",
				weight: 9,
			},
			{
				title: "regex101",
				url: "https://regex101.com/",
				desc: "正则表达式匹配",
				weight: 8,
			},
			{
				title: "Ezgif",
				url: "https://ezgif.com/",
				desc: "在线动图编辑器",
				weight: 8,
			},
			{
				title: "SRT 字幕编辑器",
				url: "https://huiyingzimu.com/srt-editor/",
				desc: "在线编辑字幕",
				weight: 8,
			},
			{
				title: "在线对齐时间轴",
				url: "https://huiyingzimu.com/txt-align/",
				desc: "在线对齐时间轴",
				weight: 8,
			},
			{
				title: "iLovePDF",
				url: "https://www.ilovepdf.com/zh-cn",
				desc: "PDF 文件在线处理工具",
				weight: 8,
			},
			{
				title: "AI 抠图",
				url: "https://www.koukoutu.com/removebgtool/all",
				desc: "在线自动抠图",
				weight: 8,
			},
			{
				title: "Carbon",
				url: "https://carbon.now.sh",
				desc: "把代码片段生成漂亮的图片",
				weight: 8,
			},
		],
	},
];
