# polywock/globalSpeed：PiP 尺寸與 title bar 實作研究

## 研究範圍與結論

- 研究對象：[`polywock/globalSpeed`](https://github.com/polywock/globalSpeed)，截至 2026-07-22 可見的 `master` HEAD [`10e49f4b778cb99c5dab05b24de2b3b6de2ec36a`](https://github.com/polywock/globalSpeed/commit/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a)。
- 來源原則：實作以 GitHub 原始碼與 commit 為準；瀏覽器行為以 Chrome for Developers、W3C/WICG 規格為準。
- 核心結論：globalSpeed 的 PiP 命令實際呼叫 **`HTMLVideoElement.requestPictureInPicture()`**，不是 `documentPictureInPicture.requestWindow()`。因此截圖中看似「無 browser title bar」的效果，是 Chrome 原生 Video PiP 的 user-agent 視窗呈現，不是 globalSpeed 用 CSS 或無框視窗 API 隱藏 title bar。
- globalSpeed 也能辨認別人已建立的 Document PiP 視窗，讓快捷鍵優先控制其中媒體；但它沒有建立該視窗。整個目前 HEAD 搜尋不到 `documentPictureInPicture.requestWindow()` 或任何 `requestWindow` 呼叫。
- 本專案則明確呼叫 [`documentPictureInPicture.requestWindow()`](../src/content/pip/pip-manager.ts)，取得一個可放任意 DOM 的新 `Document`。Document PiP 因防冒用要求，user agent 必須持續揭露控制它的 origin；Chrome 顯示包含 origin 的 browser title bar，屬這套 API 的安全 UI，頁面 CSS 無法移除。
- 容易混淆的地方：`videoSize`、`elementSize` 和 `intersectionRatio` 是媒體偵測/選擇資料，不是 PiP 視窗 resizing；Document PiP 的 `disallowReturnToOpener` 是隱藏「返回原分頁」按鈕，不是隱藏 title bar。

### 重要更正：兩張截圖不是同一種 PiP 視窗

| 項目 | globalSpeed 開啟的 PiP | 本專案目前開啟的 PiP |
| --- | --- | --- |
| 實際 API | `video.requestPictureInPicture()` | `documentPictureInPicture.requestWindow()` |
| 視窗內容 | 只能顯示該 `<video>`；呈現與 controls 由瀏覽器管理 | 完整同源 `Document`；頁面可放影片、字幕與自訂 controls |
| browser chrome | Video PiP 規格沒有要求 Document PiP 那種固定 origin title bar；實際 decoration 與 controls 由 user agent／OS 決定，網站不能控制 | WICG 要求 origin 必須一直清楚可見；title bar 是規格列出的實作方式，因此 Chrome 的固定 title bar 不能由內容 CSS 隱藏 |
| 可否複製 globalSpeed 外觀 | 只有改用原生 Video PiP 才能取得同一類 Chrome-managed UI；globalSpeed 沒有可移植的無框 CSS | 保留 Document PiP 就必須接受 user-agent chrome；`disallowReturnToOpener` 也只能少一顆返回按鈕 |

這裡不能只依截圖判斷「globalSpeed 隱藏了 title bar」。直接證據是其 [`applyMediaEvent.ts`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/contentScript/isolated/utils/applyMediaEvent.ts#L225-L242) 呼叫 `elem.requestPictureInPicture()`，而 W3C Video PiP 規格把該浮窗定義成顯示 video element 的 user-agent PiP window，CSS 甚至不得套用到小窗中的影片。[W3C Picture-in-Picture §3.2](https://w3c.github.io/picture-in-picture/#picture-in-picture)

## 1. globalSpeed 實際使用的兩種 PiP

### 1.1 原生 Video PiP：只把一個 `<video>` 交給瀏覽器

1. 支援檢查在 [`src/utils/supports.ts#L1-L2`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/utils/supports.ts#L1-L2)：`HAS_PIP_API` 只檢查 `HTMLVideoElement.prototype.requestPictureInPicture` 和 `Document.prototype.pictureInPictureElement` 是否存在；`BLOCKS_PIP` 另外檢查 Picture-in-Picture Permissions Policy。
2. PiP 命令在 [`src/defaults/commands.ts#L353-L365`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/defaults/commands.ts#L353-L365) 宣告需要影片及 PiP API；popup 只有在 `requestPictureInPicture`、影片軌和 duration 都可用時顯示按鈕，見 [`src/popup/MediaView.tsx#L130-L143`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/popup/MediaView.tsx#L130-L143)。
3. 快捷鍵或 popup 送出的 `PIP` 事件由 [`src/background/utils/processKeybinds.ts#L463-L466`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/background/utils/processKeybinds.ts#L463-L466) 交給 `applyToMedia`；它最後透過 [`src/utils/configUtils.ts#L86-L97`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/utils/configUtils.ts#L86-L97) 對目標 tab/frame 傳送 `APPLY_MEDIA_EVENT`。背景接收器再於 [`src/background/index.ts#L250-L253`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/background/index.ts#L250-L253) 轉送至 content script。
4. 真正的切換函式是 [`src/contentScript/isolated/utils/applyMediaEvent.ts#L225-L242`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/contentScript/isolated/utils/applyMediaEvent.ts#L225-L242)：
   - 先以 `HAS_PIP_API` fail closed。
   - 若目前 `pictureInPictureElement` 就是目標 video，`toggle` 走 `document.exitPictureInPicture()`。
   - 進入時確認元素仍連接於 DOM、移除 `disablePictureInPicture`，再呼叫 `elem.requestPictureInPicture()`。
   - `SecurityError` 且訊息包含 permissions policy 時顯示 PiP 被阻擋的提示。

這是「原生 PiP 控制」而非「建立自訂小窗」。Chrome 官方說明也指出，`requestPictureInPicture()` 會把影片縮到由瀏覽器管理的浮動視窗；呼叫必須發生在使用者手勢中，且可能因未載入 metadata、audio-only、Permissions Policy 或 `disablePictureInPicture` 而拒絕。[Chrome 原生 PiP 進入、限制與離開流程](https://developer.chrome.com/blog/watch-video-using-picture-in-picture?hl=en#enter-picture-in-picture)

### 1.2 Document PiP：globalSpeed 只辨認及選取，不負責開窗

Document PiP 支援是在 commit [`1430e97a`](https://github.com/polywock/globalSpeed/commit/1430e97a1d8da385991b9ada57d06f717ce92623) 加入的。這個 commit 的重點是把已存在的 Document PiP 視窗納入媒體選擇，不是呼叫 `documentPictureInPicture.requestWindow()` 建立它。

- 子視窗辨認函式 [`src/utils/helper.ts#L393-L402`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/utils/helper.ts#L393-L402) 將 `window.opener.documentPictureInPicture.window === window` 視為 Document PiP；結果快取，跨域/不可讀情況以 `try/catch` 回傳 `false`。
- 送出媒體狀態時，[`src/contentScript/isolated/utils/genMediaInfo.ts#L67-L81`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/contentScript/isolated/utils/genMediaInfo.ts#L67-L81) 若辨認成功就將 scope 標為 `isDip`。
- 背景的 [`src/background/utils/getAutoMedia.ts#L53-L73`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/background/utils/getAutoMedia.ts#L53-L73) 先以 `pipMode`，再以 `isDip` 找 PiP 媒體；若 `ignorePiP` 沒有開啟，就優先把快捷鍵指向該媒體。這解釋了為什麼 PiP 小窗即使不是目前 active tab，仍可接收 globalSpeed 的媒體命令。
- 媒體狀態的 `pipMode` 來自 [`src/contentScript/isolated/utils/genMediaInfo.ts#L4-L64`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/contentScript/isolated/utils/genMediaInfo.ts#L4-L64)：對 video 的 root `DocumentOrShadowRoot` 讀取 `pictureInPictureElement`，並同時記錄 `videoSize`、`elementSize` 和可見性。

### 1.3 為什麼原生 Video PiP 看起來無框，Document PiP 卻有 title bar？

兩套 API 的安全與自訂能力不同：

- Video PiP 只允許一個 `HTMLVideoElement` 進入浮窗，網站對輸入與 styling 的控制很有限；Chrome 官方把它和可放任意 HTML、自訂 controls 的 Document PiP 明確區分。[Chrome：Video PiP 與 Document PiP 的能力差異](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#custom-video-player)
- Video PiP 規格把浮窗和播放 controls 交給 user agent，並沒有規定必須使用 Document PiP 那種固定 origin title bar。截圖裡 controls 如何覆蓋或淡出只能視為該 Chrome／OS 版本的 user-agent UI；可以確定的是，那不是 globalSpeed 建立或能以 CSS 控制的 DOM。
- Document PiP 可承載任意 HTML，更容易冒充其他網站或系統 UI。因此 WICG 規格要求 user agent **隨時**清楚揭露控制視窗的 origin，並明列「在視窗 titlebar 顯示 origin」為做法。[WICG Document PiP §3.2.2 Origin Visibility](https://wicg.github.io/document-picture-in-picture/#origin-visibility)
- `disallowReturnToOpener: true` 只是一個要求 user agent 不顯示「返回 opener」UI affordance 的 hint。Chrome 官方文件也只承諾隱藏 back-to-tab button，沒有承諾移除 origin 或整條 title bar。[Chrome `disallowReturnToOpener`](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#hide-the-back-to-tab-button-in-pip-window)；[WICG `requestWindow()` steps](https://wicg.github.io/document-picture-in-picture/#dom-documentpictureinpicture-requestwindow)

因此，若產品條件同時是「任意 DOM／自訂 Netflix 時間軸」和「完全沒有 browser title bar」，目前標準 Web API 沒有能同時滿足兩者的選項。前者需要 Document PiP；後者只能接近原生 Video PiP 的 Chrome-managed 視覺，而且不是網頁可保證或客製的無框模式。

## 2. 「PiP 自適應影片大小」：實作審計結果

### 2.1 globalSpeed 有哪些尺寸資料？

在 [`genMediaInfo.ts#L36-L52`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/contentScript/isolated/utils/genMediaInfo.ts#L36-L52)，globalSpeed 讀取：

- `videoWidth` / `videoHeight` → `info.videoSize`：影片來源的 intrinsic/decoded 尺寸。
- `getBoundingClientRect()` → `info.elementSize`：影片元素在頁面中目前的 CSS layout 尺寸。
- `IntersectionObserver` → `intersectionRatio`：影片在頁面 viewport 的可見比例。

這些欄位用於媒體選擇，例如 `getAutoMedia` 對大於 `200 × 200` 的頁面影片加權（[`getAutoMedia.ts#L80-L100`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/background/utils/getAutoMedia.ts#L80-L100)），不是用來呼叫 PiP window 的 resize API。

### 2.2 沒有找到的實作

截至上述 HEAD，PiP 相關事件在 [`MediaTower.ts#L111-L124`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/contentScript/isolated/MediaTower.ts#L111-L124) 只註冊 `enterpictureinpicture` / `leavepictureinpicture`，沒有註冊 `PictureInPictureWindow` 的 `resize` listener。`handleMediaEvent` 只重新掃描媒體並寫回狀態（[`MediaTower.ts#L163-L207`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/contentScript/isolated/MediaTower.ts#L163-L207)）。

在 repo 的 PiP 實作中也沒有 `requestWindow`、`resizeTo`、`resizeBy` 或 `PictureInPictureWindow` 的呼叫；`applyMediaEvent` 的進入流程只呼叫 `requestPictureInPicture()`，如 [`applyMediaEvent.ts#L225-L242`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/contentScript/isolated/utils/applyMediaEvent.ts#L225-L242) 所示。因此「PIP 自適應影片大小」不能歸因於 globalSpeed 的 CSS/DOM/API 實作。

### 2.3 瀏覽器真正提供的自適應行為

原生 video PiP 視窗的尺寸是由 user agent 管理：

- W3C PiP 規格明定，套在 video 元素上的 CSS（例如 opacity、visibility、transform）不應套用到 PiP 視窗，且 PiP 視窗 aspect ratio 依影片尺寸決定；規格也允許 user agent 設定最小/最大尺寸。[W3C Picture-in-Picture §3.2](https://w3c.github.io/picture-in-picture/#picture-in-picture)
- 頁面可以在 `enterpictureinpicture` 的 `event.pictureInPictureWindow` 讀 `width` / `height`，並在該物件上監聽 `resize`；尺寸變動時由瀏覽器派發事件。[W3C `PictureInPictureWindow` 範例與 resize](https://w3c.github.io/picture-in-picture/#examples)
- Chrome 官方把用途描述為「依 PiP 視窗尺寸調整影片品質」，並警告 resize 事件可能快速連發，昂貴操作應 throttle/debounce；這不是改變原生小窗尺寸的 API。[Chrome PiP window size](https://developer.chrome.com/blog/watch-video-using-picture-in-picture?hl=en#get-the-picture-in-picture-window-size)

換句話說，若使用者所說的「自適應影片大小」是「視窗變大時調高串流品質/解碼尺寸」，globalSpeed 沒做這一層；若是「小窗保持影片比例」，那是瀏覽器依 video size 的原生行為，也不是 globalSpeed 的 CSS。

## 3. 原生 PiP 的時間軸、點擊跳轉與 hover 控制

### 3.1 PiP 浮窗裡的時間軸是瀏覽器 UI

globalSpeed 沒有建立 PiP timeline DOM，也沒有把滑鼠座標換算成秒數。它只呼叫 `elem.requestPictureInPicture()`；W3C 定義的 `requestPictureInPicture()` 沒有 width/height 或 timeline 參數，回傳的 `PictureInPictureWindow` 只提供唯讀視窗尺寸與 resize 事件。[W3C `HTMLVideoElement.requestPictureInPicture()` 與 `PictureInPictureWindow`](https://w3c.github.io/picture-in-picture/#api)

可以確定的是，timeline 屬 user-agent UI，而 globalSpeed 沒有負責像素到秒數換算。W3C 允許 user agent 提供會改變 playback state 的 Video PiP controls，但沒有規定 timeline 必須直接 seek `<video>`，也沒有規定必須先派發 Media Session `seekto`。[W3C PiP §3.2–3.3](https://w3c.github.io/picture-in-picture/#picture-in-picture) 因此 Netflix 的實際 seek 路徑不能只由 API 外觀推定，需按 §3.6 驗證。

### 3.2 hover 時的播放/暫停按鈕也是瀏覽器提供

Chrome 的原生 video PiP 會在 hover/focus 時顯示自己的播放、暫停、音量、時間軸等控制列。這些按鈕不在頁面 DOM 裡，content script 不能用 CSS 修改；按下後由瀏覽器呼叫等價的 media operation，再由 video 事件反映回頁面。Chrome 官方也把原生 video PiP 描述為只有有限的輸入與瀏覽器產生 controls；要自訂 controls 應改用 Document PiP。[Chrome：原生 video PiP 與 Document PiP 的差異](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#custom-video-player)

globalSpeed 的同步鏈路是 [`MediaTower.ts#L111-L124`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a)：監聽 `play`、`pause`、`timeupdate`、`enterpictureinpicture`、`leavepictureinpicture`；事件發生後由 [`MediaTower.ts#L163-L207`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a) 重新產生媒體狀態並寫入 session storage。因此 extension popup 能顯示目前播放/暫停狀態，但不是它畫出 PiP 浮窗的 hover controls。

### 3.3 GlobalSpeed popup 自己的跳轉按鈕是另一條路徑

如果你看到的是 GlobalSpeed extension popup 裡的控制列，那些不是 PiP 原生 timeline：[`MediaView.tsx#L60-L90`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a) 的左右按鈕送出相對 `SEEK`（-5/+5 秒），由 [`applyMediaEvent.ts#L92-L115`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a) 的 seek path 最終改寫 `media.currentTime`。它也有自己的 pause/play button，但仍是對同一個 `<video>` 發送 `PAUSE` 事件，不是控制 PiP window DOM。

### 3.4 對目前這個 repo 的直接影響

目前 Document PiP 的 [`video-placement.ts#L53-L83`](../src/content/pip/video-placement.ts) 把影片放入 PiP document 後設定 `object-fit: contain`，並明確設定 `video.controls = false`。因此目前的 PiP 會有影片比例與字幕鏡像，但不會自動有原生 timeline、播放/暫停或 hover controls。

若要保留你現在的 Document PiP 架構，需自行建立 controls：`input[type=range]` 只作為自己的預覽 UI，由 `timeupdate` 等唯讀媒體事件更新；點擊或拖曳結束後，透過 Netflix player bridge 發出絕對 seek，不可綁定 `video.currentTime` setter。控制列可用 CSS 的 `:hover` 或 `pointerenter/pointerleave` 控制顯示。若要直接得到瀏覽器原生 timeline/hover controls，則要改走 GlobalSpeed 使用的 `video.requestPictureInPicture()`；兩者不能同時把同一個 video 當成兩套 PiP UI 管理。

### 3.5 Netflix 不能直接走 native `currentTime`

對 Netflix 而言，上述「自訂 controls」不能直接把 seek 寫成 `video.currentTime = ...`。目前 repo 的 Netflix bridge 已明確採取另一條路徑：在 [`netflix-page-api-executor.ts#L77-L102`](../src/shared/netflix-page-api-executor.ts) 取得 `window.netflix...playerApp.getAPI().videoPlayer`，先讀 `player.getCurrentTime()`，再呼叫 `player.seek(targetTime)`；測試也保證 seek 不會修改 native video 的 `currentTime`（[`netflix-api-bridge.test.ts#L54-L103`](../src/content/netflix-api-bridge.test.ts)）。

因此你的觀察應視為設計限制：Netflix 原生 video controls／native timeline 可能繞過 Netflix player state，造成 seek 不同步或播放器錯誤。PiP controls 應只負責顯示與收集 UI input，再透過 [`sendNetflixApi()`](../src/content/netflix-api-client.ts) 呼叫 `seek`、`play`、`pause`；不要用 native `<video>` timeline 作為 Netflix seek 實作。若 Netflix API 不存在，bridge 目前選擇回報失敗，也不 fallback 到 native seek。

### 3.6 可行性補充：用 Media Session `seekto` 攔截原生 Video PiP timeline

**結論：這是值得做實機 spike 的候選方案，但目前第一手文件不足以證明 Chrome 的原生 Video PiP timeline 在所有情況下一定派發 `seekto`。在 Chrome + Netflix 實機驗證通過前，不可視為已解決 native seek 風險。**

可以確定的部分：

1. Media Session 規格定義 `seekto` 的意圖是移動到指定時間；handler 收到的 `details.seekTime` 必須是目標秒數，連續 scrub 時還可能帶 `fastSeek`。[W3C Media Session：actions 與 `MediaSessionActionDetails`](https://w3c.github.io/mediasession/#actions-model)
2. 規格允許 platform 或 user-agent 建立的 UI surface 成為 media session action source。當該 source 真的觸發某個 action，而且 active media session 已註冊該 action，user agent 必須執行對應 handler。[W3C Media Session action routing](https://w3c.github.io/mediasession/#actions-model)
3. Chrome 官方 2026 文件說 Video PiP 的 progress bar 會使用 `navigator.mediaSession.setPositionState()`，並在「讓使用者直接從 PiP 導覽內容」的建議中示範 `setActionHandler('seekto', ...)`。這證明 Chrome 把 `seekto` 視為 Video PiP 控制能力的一部分，而非只限硬體媒體鍵。[Chrome：Video PiP 的 progress bar 與 `seekto`](https://developer.chrome.com/blog/automatic-picture-in-picture-initiated-by-the-browser#best-practices-for-media-session)

尚未被規格或 Chrome 官方文件保證的部分：

- Media Session 規格沒有規定「原生 Video PiP 的 timeline/scrubber 必須是 `seekto` action source」。它只規定：如果某個 action source 已經觸發 `seekto`，該如何路由。
- Chrome 官方文件建議實作 `seekto` 來取得 PiP 內導覽能力，但沒有逐字承諾每個 Chrome 版本、OS、PiP 進入方式與 timeline gesture 都一定走 handler，也沒有說 browser 不會在某些路徑直接 seek 關聯的 `<video>`。
- Video PiP 規格另外允許 user agent 提供直接改變 video playback state 的 controls。因此仍存在「Chrome timeline 繞過 Media Session，直接對 video seek」的相容性風險。[W3C Picture-in-Picture §3.3](https://w3c.github.io/picture-in-picture/#exit-picture-in-picture)

若實測確認 Chrome timeline 會派發 `seekto`，handler 可以只把 `details.seekTime` 轉送到 Netflix player bridge，完全不執行 `video.currentTime = ...`。依 Media Session 的 action handling 演算法，已註冊 action 時執行的是頁面 handler；規格只建議 user agent 為 play/pause 提供 default handler，沒有定義 `seekto` 的 default handler。但這個推論只適用於 timeline 確實進入 Media Session action routing 的前提。

還有三個整合限制：

- `navigator.mediaSession` 每個 action 只對應一個 handler；Netflix 或其他 script 之後呼叫 `setActionHandler('seekto', ...)` 可能覆蓋本專案 handler，反過來本專案也可能覆蓋 Netflix 的 handler。
- user agent 會把 action 送到它選出的 active media session；規格明確把 session 選擇留給 user agent。iframe、廣告、下一集換源或音訊焦點變更都可能改變路由。
- 要讓 PiP progress bar 與 Netflix player 一致，可能還需從 Netflix telemetry 持續呼叫 `setPositionState({ duration, playbackRate, position })`；錯誤或過期的 position state 會讓 Chrome PiP 顯示錯誤進度。

最低實機驗證矩陣：

1. 在目標 Chrome/macOS 版本註冊只記錄、不寫 `video.currentTime` 的 `seekto` handler，開啟原生 Video PiP，分別點擊 timeline 與拖曳 scrubber。
2. 確認每次操作都先收到 `seekto`，`seekTime` 正確，最後只呼叫一次 Netflix `player.seek(targetMs)`；同步監看 native video 的 `seeking`/`seeked`、`currentTime` 與 Netflix 錯誤。
3. 驗證快速連續拖曳及 `fastSeek`、暫停狀態 seek、片頭/片尾、廣告或預告、下一集自動切換。
4. 驗證 Netflix 原本是否會註冊或重新註冊 Media Session handlers，以及 extension handler 在換集、換 video element、離開再進入 PiP 後是否仍持有 action。
5. 至少比較「網站按鈕進入 PiP」與「Chrome UI/自動進入 PiP」；任何一條 timeline 路徑未派發 `seekto`，就不能採用原生 timeline 作為 Netflix-safe seek UI。

## 4. 「隱藏 title bar」：實作審計結果

### 4.1 globalSpeed 沒有隱藏 title bar

PiP 相關程式沒有建立或選取 title-bar DOM，也沒有設定 `document.title`；globalSpeed 在 [`genMediaInfo.ts#L67-L79`](https://github.com/polywock/globalSpeed/blob/10e49f4b778cb99c5dab05b24de2b3b6de2ec36a/src/contentScript/isolated/utils/genMediaInfo.ts#L67-L79) 只是讀取 `document.title` 來產生媒體資訊。原生 video PiP 的視窗 chrome 與 controls 屬瀏覽器 UI，不是 content script 可用 CSS 覆蓋的頁面 DOM；Chrome 也說原生 PiP 的可自訂 controls/styling 很有限。[Chrome Document PiP 對比原生 video PiP](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#custom-video-player)

### 4.2 Document PiP 只能隱藏「返回分頁」按鈕

Document PiP 的 `requestWindow()` 可接收 `disallowReturnToOpener: true`，Chrome 文件定義它的效果是隱藏 PiP 視窗中的「back to tab」按鈕；它不承諾移除整個 title bar。[Chrome `disallowReturnToOpener`](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#hide-the-back-to-tab-button-in-pip-window)

更根本的限制來自 Document PiP 規格：user agent 必須持續讓使用者知道控制視窗的 origin，例如可在視窗 titlebar 顯示 origin；這是反 spoofing 的安全 UI。`disallowReturnToOpener` 只是對 user agent 的 hint，要求不要提供返回 opener 的 UI affordance，並非隱藏 origin/title bar 的開關。[WICG Document PiP §3.2.2 與 requestWindow steps](https://wicg.github.io/document-picture-in-picture/#origin-visibility)

所以若需求是「整條瀏覽器 title bar 消失」，不能以 web extension 的 DOM/CSS 穩定做到；若需求其實是「不要顯示返回原分頁按鈕」，只有在由 extension/site 自己建立 Document PiP 時才能於 `requestWindow()` 傳 `disallowReturnToOpener: true`。globalSpeed 目前不建立該視窗，因此它也沒有可插入這個 option 的現成流程。

## 5. 可移植到其他 extension 的做法

### 5.1 只需控制原生 video PiP

適合只想提供快捷鍵、播放速度、seek 或媒體品質調整的 extension：

1. Feature-detect `requestPictureInPicture`、`pictureInPictureElement` 和 `pictureInPictureEnabled`；同時把 Permissions Policy、`disablePictureInPicture`、`readyState`、audio-only 等拒絕條件當成正常分支。[Chrome feature detection 與拒絕條件](https://developer.chrome.com/blog/watch-video-using-picture-in-picture?hl=en#enter-picture-in-picture)
2. 在使用者 click/key gesture 的同步流程呼叫 `video.requestPictureInPicture()`；不要把第一次呼叫延後到非 user activation 的 Promise continuation。
3. 監聽 video 的 `enterpictureinpicture` / `leavepictureinpicture`，不要只依賴 request Promise 更新狀態；瀏覽器 UI 或其他頁面也可能觸發進出 PiP。[Chrome PiP events](https://developer.chrome.com/blog/watch-video-using-picture-in-picture?hl=en#listen-to-picture-in-picture-events)
4. 若要做「依小窗大小調整品質」，在 enter 時保存 `event.pictureInPictureWindow`，監聽其 `resize`，讀 read-only 的 `width` / `height`，用 debounce 後調整串流/解碼設定，leave 時移除 listener。不要嘗試用 CSS 變形原生 PiP video，也不要假設可以從頁面設定原生小窗初始寬高。

### 5.2 需要自訂 DOM、字幕或 controls

改用 Document PiP，流程是：

1. 檢查 `'documentPictureInPicture' in window`，並只在 user gesture 中呼叫 `documentPictureInPicture.requestWindow({ width, height })`。本專案使用 640 CSS px 的偏好初始寬度，並依影片 intrinsic/rendered aspect ratio 計算高度；這是初始尺寸提示，不是禁止使用者調整視窗。[Chrome Document PiP feature detection、requestWindow 與 options](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#interface)
2. 將 player/container `append` 到 `pipWindow.document.body`；若要保留外部樣式，將 stylesheet 複製到 PiP document，並以 `@media (display-mode: picture-in-picture)` 對 PiP layout 做 CSS。[Chrome Document PiP 的 DOM/CSS 做法](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#copy-style-sheets-to-pip)
3. 在 `pipWindow` 監聽 `pagehide`，把 player 搬回 opener；否則使用者直接關閉小窗時，原頁可能留下錯誤的 DOM 狀態。[Chrome Document PiP lifecycle](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#handle-when-the-pip-window-closes)
4. 若要由 PiP 內的按鈕調整大小，使用 `pipWindow.resizeBy()` / `resizeTo()`；兩者需要 user gesture，Chrome 文件標示 resizing 從 Chrome 121 可用。背景自動依內容 resize 不應假設可行。[Chrome Document PiP resize](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/#resize-the-pip-window)
5. 若由 extension content script 操作頁面，記得 content script 可讀寫共享 DOM，但 JavaScript global 仍在 isolated world；需要頁面 JavaScript 狀態時，以 DOM event/`window.postMessage` 或 extension messaging 橋接。這是 Chrome content script 的安全模型，也是 globalSpeed 將媒體偵測、content script 與 background message 分開的原因。[Chrome content scripts：DOM、isolated world 與 messaging](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)

globalSpeed 可移植的架構模式是：content script 在每個候選 frame 記錄媒體與 PiP 狀態 → 以 session storage 聚合 → background 在 `getAutoMedia` 優先選取 `pipMode`/`isDip` → 以 tab/frame message 把命令送回真正持有 video 的 context。這個模式可沿用；但要新增 adaptive resize 或自訂 title-bar 行為，必須另加 Document PiP 的建立/DOM/lifecycle 層，不能只複製 globalSpeed 現有的 `PIP` command。

## 6. 限制與風險清單

- **瀏覽器支援差異**：原生 PiP 與 Document PiP 是兩套 API；Document PiP 目前仍非所有瀏覽器都支援。應分別 feature-detect，不要只檢查 `requestPictureInPicture`。
- **使用者手勢**：兩套 API 的建立/resize 都受 transient activation 限制；由快捷鍵觸發時要確保呼叫仍在允許的 gesture 路徑內。
- **Permissions Policy / page policy**：嵌入 iframe 或網站政策可能阻擋 PiP；globalSpeed 對原生 PiP 的 `SecurityError` 有明確提示，但移植時仍應處理 rejected Promise。
- **PiP 生命週期**：原生 PiP 可能由瀏覽器 UI、右鍵選單或另一頁觸發/終止；Document PiP 在 opener 關閉或導覽時也會關閉。狀態應靠事件同步，而非只靠本地 boolean。
- **視窗尺寸不是可信的 layout contract**：原生 PiP 尺寸由 user agent 決定；Document PiP 的初始 `width`/`height` 可能被 clamp，position 由 user agent 決定，且 resize API 有 user-gesture 限制。[Document PiP 規格的尺寸、位置與安全限制](https://wicg.github.io/document-picture-in-picture/#security-considerations)
- **title bar 不可攜**：整體 title bar 是瀏覽器/OS chrome，不能以 extension CSS 穩定隱藏；即使使用 Document PiP，origin visibility 的安全要求仍可能保留瀏覽器提供的識別 UI。
- **globalSpeed 的 `isDipWindow` 快取**：它把結果快取且以 `window.opener` 關係辨認；這對辨認視窗很簡潔，但移植到 opener 關係被 sandbox、跨域或瀏覽器實作改變的環境時，應保留例外處理，必要時改用 opener 端的 `documentPictureInPicture.onenter` 與明確訊息握手。

## 7. 最終判定

| 使用者描述 | globalSpeed 現況 | 可移植判定 |
| --- | --- | --- |
| PiP 自適應保持影片比例 | 主要是瀏覽器原生 PiP 行為；globalSpeed 只讀 `videoSize`/`elementSize` 做媒體選擇 | 原生 PiP 可監聽 `PictureInPictureWindow.resize` 做品質調整；不能直接設定原生小窗尺寸 |
| PiP 視窗隨內容/播放器尺寸建立 | globalSpeed 沒有 `requestWindow({width,height})` | 使用 Document PiP；本專案以 640 px 初始寬度和影片比例計算高度，使用者改變視窗比例時以 `object-fit: contain` 保持影片比例 |
| 隱藏整個 title bar | globalSpeed 沒有此實作，瀏覽器也不提供通用 web API | 不可可靠移植；只能用 Document PiP 的 `disallowReturnToOpener` 隱藏返回按鈕 |
| 原生 timeline 安全轉送 Netflix seek | globalSpeed 沒有 Media Session `seekto` → Netflix API bridge | 可做候選 spike；官方資料支持 `seekto` 用於 PiP 導覽，但未保證 timeline 必定派發，必須依 §3.6 實機驗證 |
| PiP 小窗仍可用 global 快捷鍵 | globalSpeed 已實作：`pipMode` / `isDip` → `getAutoMedia` 優先選取 → tab/frame message | 可直接移植此資料聚合與訊息路由模式 |
