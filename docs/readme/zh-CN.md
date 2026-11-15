# Shortcut Override for Netflix

[English](../../README.md) · [繁體中文](zh-TW.md) · 简体中文 · [日本語](ja.md) · [한국어](ko.md)

[![CI](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/chenghsj/netflix-shortcut-override?label=release)](https://github.com/chenghsj/netflix-shortcut-override/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

自定义 Netflix 播放快捷键、按字幕跳转，并使用保留字幕的画中画。

本项目为非官方扩展，与 Netflix 无关，也未获得其认可或赞助。

## 安装

[![Chrome Web Store](../assets/chrome.svg)](https://chromewebstore.google.com/detail/shortcut-override-for-net/jebnhiecgnchnioahfagmnebdknddbom)
[![Microsoft Edge Add-ons](../assets/edge.svg)](https://microsoftedge.microsoft.com/addons/detail/shortcut-override-for-net/ddfnieehcebicbmnejlafjphppdjmdhi)
[![Firefox Add-ons](../assets/firefox.svg)](https://addons.mozilla.org/firefox/addon/70ea1dc7212746bd96bd/)

从浏览器商店安装后，打开 Netflix 视频，点击工具栏的扩展图标，即可查看状态或打开设置。

手动安装可从 [GitHub Releases](https://github.com/chenghsj/netflix-shortcut-override/releases/latest) 下载对应浏览器的安装包：

- **Chrome／Edge：**解压 Chromium ZIP，在 `chrome://extensions` 或 `edge://extensions` 开启开发者模式，选择“加载已解压的扩展程序”，再选择包含 `manifest.json` 的文件夹。
- **Firefox：**打开 `about:debugging#/runtime/this-firefox`，选择“临时载入附加组件”，再选择 Firefox ZIP。此方式在浏览器重启后失效；永久安装与自动更新请使用 Firefox Add-ons。

## 主要功能

- 自定义快捷键、清空按键、单独启用或禁用，并在设置中处理按键冲突。
- 控制播放、逐帧移动、快进与快退、切换集数、音量、全屏及播放速度。
- 添加前进／后退组合、视频百分比跳转、常用倍速与字幕大小快捷键。
- 按自定义顺序切换常用字幕与音轨，并可单独选择口述影像音轨。
- 跳至上一句或下一句字幕，或重播当前句子。
- 在 Chrome 与 Edge 使用保留 Netflix 字幕、带播放控件的画中画。
- 长按播放／暂停键暂时调整速度，松开后恢复原速。
- 自动跳过片头、前情提要或播放下一集，并可隐藏 Netflix 暂停遮罩。
- 通过工具栏弹出窗口检查兼容性，并复制本地诊断信息。
- 通过浏览器存储同步设置、导出与导入备份，并提供五种界面语言与三种界面风格。

## 默认快捷键

所有按键均可在设置中修改。

| 操作 | 默认按键 |
| --- | --- |
| 播放／暂停 | `Space` |
| 快退／快进 | `Left`／`Right` |
| 上一帧／下一帧（自动暂停） | `,`／`.` |
| 上一种／下一种音轨语言 | `Shift + A`／`Shift + D` |
| 提高／降低音量 | `Up`／`Down` |
| 静音 | `M` |
| 开启／关闭 Netflix 字幕 | `C` |
| 切换到下一个字幕语言 | `Shift + C` |
| 切换到上一个字幕语言 | `Shift + X` |
| 切换字幕大小（可自定义；默认 80% → 100% → 125%） | `Shift + V` |
| 全屏 | `F` |
| 画中画 | `Shift + P` |
| 跳过片头 | `S` |
| 上一集／下一集 | `Ctrl + P`／`Ctrl + N` |
| 提高／降低播放速度 | `Shift + .`／`Shift + ,` |
| 应用常用倍速（默认 `1.5x`） | `Shift + "` |
| 重置播放速度 | `Shift + /` |

启用长按变速后，短按播放／暂停键切换播放状态；长按约 250 毫秒则暂时应用长按速度，默认为 `2x`。

每次跳转默认为 `10s`，可设为 `1s` 至 `60s`。速度上下限、调整幅度、偏好速度与长按速度也能修改。完整范围与重置规则请见[详细使用指南（英文）](../user-guide.md)。

`Ctrl + P` 与 `Ctrl + N` 可能被浏览器保留，必要时请修改集数快捷键。切换集数使用 Netflix 的集数控件，且必须有可播放的对应集数。

## 设置与自定义

从设置页侧边栏选择快捷键分类、常规设置、自动播放与跳过，或备份与恢复。可跨五种界面语言搜索设置、功能名称、语言名称或按键。工具栏弹出窗口提供可搜索的快捷键参考与兼容性状态；点击“打开设置”会进入对应的设置页编辑。

- **进度与跳转：**添加共用 1–3,600 秒间隔、分别设置按键的前进／后退组合，或跳至视频 0–100% 的位置。
- **字幕大小：**修改默认的 80% → 100% → 125% 循环，或添加 50–300% 的固定大小与自定义循环。新循环支持 2–6 个不同大小，可拖动调整顺序；常规播放与画中画分别保存当前大小。
- **播放速度：**添加 `0.25x` 至 `4x` 的常用倍速快捷键，同时编辑速度与按键。长按倍速位于播放／暂停下方，速度上下限与调整幅度则位于播放速度页。
- **常用字幕与音轨：**批量添加字幕语言或音轨，再拖动调整切换顺序；口述影像音轨可单独选择。快捷键会跳过当前视频未提供的项目；列表为空时则切换所有可用轨道。常用列表只影响快捷键切换，打开视频时不会自动改变轨道。
- **本页功能：**使用“管理本页功能”隐藏不需要的控件并禁用对应快捷键，同时保留按键与参数。重新显示时，没有按键冲突的快捷键会启用。也可在编辑器中清空按键，保存为“未设置”。
- **外观：**选择 Classic、Neobrutalism 或 Markdown 界面风格，并单独设置浅色、深色或跟随系统。

在“自动播放与跳过”中，可分别启用片头、前情提要或下一集；Netflix 显示对应按钮时，扩展会自动点击。在“常规设置”启用“隐藏暂停遮罩”，可隐藏暂停时的节目名称、简介与黑色遮罩，保留字幕和播放控制栏。这些选项均默认关闭。

## 字幕导航

字幕导航**默认关闭**：

1. 打开设置，启用快捷键覆盖。
2. 启用字幕导航，并在浏览器提示时允许 Netflix 与字幕来源的网站访问权限。
3. 在 Netflix 选择字幕轨。

| 操作 | 默认按键 |
| --- | --- |
| 上一句 | `A` |
| 下一句 | `D` |
| 重播当前句子 | 未设置（默认停用） |
| 播放／暂停 | `W` |

`A`、`D` 保持原本的播放或暂停状态。重播功能从当前字幕开始播放，不会循环或在句尾自动停止。`W` 立即切换播放状态，不会启用长按变速。

**字幕导航不会覆盖常规快捷键。**已启用的快捷键会保留按键；请为字幕导航改键，或在冲突提示中明确转移归属。已有重复设置会保留常规快捷键，`S` 会继续跳过片头，直到明确重新分配。

拒绝网站授权时，字幕导航会保持关闭；再次开启即可重试。这些按键也可在 Chrome 与 Edge 的扩展画中画窗口中使用。

## 界面语言

支持英文、繁体中文、简体中文、日文与韩文。可自动跟随支持的浏览器界面语言，或在设置中手动选择。

## 浏览器支持与限制

- 支持桌面版 Chrome 111+、Edge 111+ 与 Firefox 128+。保留字幕的画中画需使用 Chrome 或 Edge 116+；Firefox 中此功能禁用。
- 快捷键只在 Netflix 观看页面或显示播放器的页面运行；在可编辑字段输入时不会拦截按键。
- 全屏只适用于 Netflix 页面。跳过片头需要有可见的 Netflix 跳过按钮。
- 跳转、字幕切换与字幕导航依赖 Netflix 未公开的播放器接口，Netflix 更新后可能需要调整扩展。

## 权限与隐私

- **Netflix 网站访问权限：**执行播放快捷键并读取当前选择的字幕轨。
- **可选的 `https://*.nflxvideo.net/*` 访问权限：**启用字幕导航时请求授权，使用导航时下载字幕文件；不会在此 CDN 网站运行内容脚本。
- **存储、脚本执行及当前标签页：**保存设置、执行播放操作、检查兼容性及恢复播放焦点。只有选择恢复操作时，弹出窗口才会重新加载 Netflix。

关闭字幕导航不会撤销已授予的网站访问权限。详见[权限说明（英文）](../user-guide.md#permissions)与[授权问题排查（英文）](../troubleshooting.md#subtitle-website-access)。

不使用流量分析、跟踪或第三方处理服务。字幕从 Netflix 分发主机下载并在本地解析，时间缓存只保留在内存中；设置使用浏览器同步存储。兼容性诊断保留在设备上，除非你自行复制并分享。完整政策请见[隐私政策（英文）](../../PRIVACY.md)。

## 开发与文档

需要 Node.js 22.18.0 以上与 npm。在项目根目录执行：

```sh
npm ci
npm run build
```

Chrome／Edge 加载 `dist/chromium`；Firefox 以临时附加组件加载 `dist/firefox/manifest.json`。

`npm run build` 会检查类型、构建两种浏览器版本，并验证生成的后台程序入口。开发时可用 `npm run dev` 启动 HMR；自动化检查使用 `npm test` 与 `npm run lint`。

以下详细文档以英文维护：

- [使用指南](../user-guide.md)：设置、字幕导航、权限与隐私细节。
- [开发指南](../development.md)：HMR、命令、架构与测试。
- [设置升级检查](../settings-upgrade.md)：设置迁移、备份兼容性与已安装浏览器验证。
- [发布指南](../release.md)：版本标签、打包、校验码与 Firefox 提交。
- [问题排查](../troubleshooting.md)：快捷键、网站授权及开发问题。
- [行为规范](../behavior-spec.md) · [Chrome 浏览器测试](../chrome-real-browser-test.md) · [Firefox 浏览器测试](../firefox-real-browser-test.md)

## 问题反馈与许可证

请通过 [GitHub issue](https://github.com/chenghsj/netflix-shortcut-override/issues/new/choose) 提供浏览器与扩展版本、失败的操作，以及工具栏弹出窗口中可复制的兼容性诊断信息。

本项目采用 [MIT 许可证](../../LICENSE)。
