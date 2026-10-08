# Shortcut Override for Netflix

[English](../../README.md) · 繁體中文 · [简体中文](zh-CN.md) · [日本語](ja.md) · [한국어](ko.md)

[![CI](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/chenghsj/netflix-shortcut-override?label=release)](https://github.com/chenghsj/netflix-shortcut-override/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

自訂 Netflix 播放快捷鍵、依字幕跳轉，並使用保留字幕的子母畫面。

本專案為非官方擴充功能，與 Netflix 無關，亦未獲其背書或贊助。

## 安裝

[![Chrome Web Store](../assets/chrome.svg)](https://chromewebstore.google.com/detail/shortcut-override-for-net/jebnhiecgnchnioahfagmnebdknddbom)
[![Microsoft Edge Add-ons](../assets/edge.svg)](https://microsoftedge.microsoft.com/addons/detail/shortcut-override-for-net/ddfnieehcebicbmnejlafjphppdjmdhi)
[![Firefox Add-ons](../assets/firefox.svg)](https://addons.mozilla.org/firefox/addon/70ea1dc7212746bd96bd/)

從瀏覽器商店安裝後，開啟 Netflix 影片，點選工具列的擴充功能圖示，即可查看狀態或開啟設定。

手動安裝可從 [GitHub Releases](https://github.com/chenghsj/netflix-shortcut-override/releases/latest) 下載對應瀏覽器的套件：

- **Chrome／Edge：**解壓縮 Chromium ZIP，在 `chrome://extensions` 或 `edge://extensions` 開啟開發人員模式，選擇「載入未封裝項目」，再選取包含 `manifest.json` 的資料夾。
- **Firefox：**開啟 `about:debugging#/runtime/this-firefox`，選擇「載入暫時附加元件」，再選取 Firefox ZIP。此方式在瀏覽器重啟後失效；永久安裝與自動更新請使用 Firefox Add-ons。

## 主要功能

- 自訂各項快捷鍵、個別啟用或停用，並在設定中處理按鍵衝突。
- 控制播放、快轉與倒轉、音量、字幕、全螢幕、略過片頭及播放速度。
- 跳至上一句或下一句字幕，或重播目前句子。
- 在 Chrome 與 Edge 使用保留 Netflix 字幕、附播放控制的子母畫面。
- 長按播放／暫停鍵暫時調整速度，放開後恢復原速。
- 透過工具列彈出視窗檢查相容性，並複製本機診斷資訊。
- 透過瀏覽器儲存空間同步設定、匯出與匯入備份，並提供五種介面語言。

## 預設快捷鍵

所有按鍵皆可在設定中修改。

| 動作 | 預設按鍵 |
| --- | --- |
| 播放／暫停 | `Space` |
| 倒轉／快轉 | `Left`／`Right` |
| 提高／降低音量 | `Up`／`Down` |
| 靜音 | `M` |
| 開啟／關閉 Netflix 字幕 | `C` |
| 全螢幕 | `F` |
| 子母畫面 | `Shift + P` |
| 略過片頭 | `S` |
| 提高／降低播放速度 | `Shift + .`／`Shift + ,` |
| 套用偏好播放速度 | `Shift + "` |
| 重設播放速度 | `Shift + /` |

啟用長按變速後，短按播放／暫停鍵切換播放狀態；長按約 250 毫秒則暫時套用長按速度，預設為 `2x`。

每次跳轉預設為 `10s`，可設為 `1s` 至 `60s`。速度上下限、調整幅度、偏好速度與長按速度也能修改。完整範圍與重設規則請見[詳細使用指南（英文）](../user-guide.md)。

## 字幕導航

字幕導航**預設關閉**：

1. 開啟設定，啟用快捷鍵覆寫。
2. 啟用字幕導航，並在瀏覽器提示時允許 Netflix 與字幕來源的網站存取權。
3. 在 Netflix 選擇字幕軌。

| 動作 | 預設按鍵 |
| --- | --- |
| 上一句 | `A` |
| 下一句 | `D` |
| 重播目前句子 | `S` |
| 播放／暫停 | `W` |

`A`、`D` 保持原本的播放或暫停狀態。`S` 從目前字幕開始播放，不會循環或在句尾自動停止。`W` 立即切換播放狀態，不會啟動長按變速。

**已啟用的字幕導航按鍵優先於一般快捷鍵。**使用預設設定時，啟用字幕導航後，`S` 會重播字幕。停用該動作或字幕導航，即可恢復用 `S` 略過片頭。

拒絕網站授權時，字幕導航會保持關閉；再次開啟即可重試。這些按鍵也可在 Chrome 與 Edge 的擴充功能子母畫面中使用。

## 介面語言

支援英文、繁體中文、簡體中文、日文與韓文。可自動跟隨支援的瀏覽器介面語言，或在設定中手動選擇。

## 瀏覽器支援與限制

- 支援桌面版 Chrome、Edge 與 Firefox。保留字幕的子母畫面需使用 Chrome 或 Edge；Firefox 中此功能停用。
- 快捷鍵只在 Netflix 觀影頁面或顯示播放器的頁面運作；在可編輯欄位輸入時不會攔截按鍵。
- 全螢幕只適用於 Netflix 頁面。略過片頭需有可見的 Netflix 略過按鈕。
- 跳轉、字幕切換與字幕導航依賴 Netflix 未公開的播放器介面，Netflix 更新後可能需要調整擴充功能。

## 權限與隱私

- **Netflix 網站存取權：**執行播放快捷鍵並讀取目前選擇的字幕軌。
- **選用的 `https://*.nflxvideo.net/*` 存取權：**啟用字幕導航時要求授權，使用導航時下載字幕文件；不會在此 CDN 網站執行內容指令碼。
- **儲存空間、指令碼執行及目前分頁：**儲存設定、執行播放操作、檢查相容性及恢復播放焦點。只有選擇復原操作時，彈出視窗才會重新載入 Netflix。

關閉字幕導航不會撤銷已授予的網站存取權。詳見[權限說明（英文）](../user-guide.md#permissions)與[授權疑難排解（英文）](../troubleshooting.md#subtitle-website-access)。

不使用流量分析、追蹤或第三方處理服務。字幕從 Netflix 傳送主機下載並在本機解析，時間快取只留在記憶體；設定使用瀏覽器同步儲存空間。相容性診斷留在裝置上，除非你自行複製並分享。完整政策請見[隱私權政策（英文）](../../PRIVACY.md)。

## 開發與文件

需 Node.js 22 以上與 npm。在專案根目錄執行：

```sh
npm ci
npm run build
```

Chrome／Edge 載入 `dist/chromium`；Firefox 以暫時附加元件載入 `dist/firefox/manifest.json`。

以下詳細文件以英文維護：

- [使用指南](../user-guide.md)：設定、字幕導航、權限與隱私細節。
- [開發指南](../development.md)：HMR、指令、架構與測試。
- [發布指南](../release.md)：版本標籤、打包、校驗碼與 Firefox 提交。
- [疑難排解](../troubleshooting.md)：快捷鍵、網站授權及開發問題。
- [行為規格](../behavior-spec.md) · [Chrome 瀏覽器測試](../chrome-real-browser-test.md) · [Firefox 瀏覽器測試](../firefox-real-browser-test.md)

## 問題回報與授權

請透過 [GitHub issue](https://github.com/chenghsj/netflix-shortcut-override/issues/new/choose) 提供瀏覽器與擴充功能版本、失敗的動作，以及工具列彈出視窗可複製的相容性診斷資訊。

本專案採用 [MIT 授權](../../LICENSE)。
