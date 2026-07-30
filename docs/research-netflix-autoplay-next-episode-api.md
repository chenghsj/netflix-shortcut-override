# Netflix Web 自動播放下一集 API 調查

調查日期：2026-07-26。範圍限於 Netflix 官方說明、Netflix 當前網站載入的官方 client/player bundle，以及本專案程式碼。

## 結論

Netflix Web **有未公開的內部方法可以預載與觸發下一集**：目前 player session 包含 `addEpisode(...)`、`playNextEpisode(...)` 與 `watchCredits(...)`。然而，自動播放倒數、post-play 畫面與是否進行 seamless transition 是由 Akira client 的另一層 post-play/Redux orchestration 管理，不是 `play`、`pause`、`seek` 等播放器 transport 的一部分。

沒有找到受官方支援的 JavaScript API，也沒有在目前 bundle 找到通用的 `cancelAutoplay()` 類方法。雖然 `watchCredits(currentMovieId)` 會操作目前 playgraph 的 credits 路徑，但本專案實測顯示：在下一集提示出現後由 PiP 往回 seek 時呼叫它，**無法取消已啟動的 Akira post-play transition**，而且會讓 `/watch` player teardown、頁面回到 `/browse`，使 Document PiP 裡的影片失去原本版面並縮小。

因此：**可以研究性地觸發下一集，但目前沒有找到可安全取消當次自動跳轉的 API。** 對擴充功能而言，不應呼叫 `watchCredits(...)` 介入這個流程；目前較可靠的 fallback 是偵測下一集已實際切換，立即暫停新一集並關閉 PiP，不聚焦 Netflix 分頁。

## 證據

### 1. 官方公開控制只有個人檔案設定

Netflix 官方說明將「自動播放下一集」描述為個人檔案的 Playback settings 開關；設定變更後可能還需要切換個人檔案或重新登入才能更新裝置狀態。該說明沒有提供網頁播放器開發者 API。[Netflix Help Center：How to autoplay the next episode](https://help.netflix.com/en/node/121518)

Netflix 的官方 GitHub 組織列出公開 OSS 專案，但本次檢索未找到 Netflix Web player 或 post-play 控制 API 的官方公開套件／文件。[Netflix Open Source Platform](https://github.com/Netflix)

### 2. Player transport 與 post-play orchestration 是兩層系統

Netflix 當前官方 player bundle 的 session facade 除了 `seek(...)`，還定義：

- `addEpisode(...)`：把下一集加入 player playgraph。
- `playNextEpisode(...)`：切換到 playgraph 中的下一集；若找不到下一集會拒絕並回報 `Next episode not found`。
- `watchCredits(...)`：解析目前 title 的 content 與 credits segment，並在下一條路徑還不是 credits 時，以 playgraph 更新操作改寫 next edge。這是「觀看片尾」能力，不等同於取消 Akira 已啟動的 post-play 倒數。

來源：[Netflix Cadmium playercore 6.0060.069.911](https://assets.nflxext.com/player/html/ffe/cadmium-playercore-6.0060.069.911.js)（bundle modules 64059、52531）。

Netflix 當前 Akira client 則在 UI/state orchestration 層執行以下流程：

- `PLAYER_ADD_NEXT_VIDEO` 呼叫 session 的 `addEpisode(nextVideoData)`。
- `PLAYER_PLAY_NEXT_VIDEO` 等待預載完成，再呼叫 `playNextEpisode({ playbackState, sessionParams: { isUIAutoPlay } })`。
- `PLAY_NEXT_SEAMLESS_VIDEO` 也呼叫 `playNextEpisode(...)`。
- `WATCH_CREDITS` 取得 session 後呼叫 `watchCredits(currentMovieId)`。

同一 bundle 另有獨立的 post-play domain/state，包含 `autoplay`、`autoplaySeconds`、`startedByVideoId`、`getAutoPlaySeconds(...)` 與 `isPostPlayStartedByVideoId(...)`。這些是 Akira client 內部 state selector/action，不是 `getVideoPlayerBySessionId(...)` 回傳 player session 的公開方法。[Netflix Akira client 127a4b0c](https://assets.nflxext.com/web/ffe/wp/ui/akira/akiraClient.127a4b0c21577949022b.js)（相關 modules 125129、419406、64059 orchestration references）。

### 3. 可控制、取消、偵測與觸發的實際界線

| 需求 | 可觀察的內部能力 | 判斷 |
| --- | --- | --- |
| 觸發下一集 | `addEpisode(...)` 後呼叫 `playNextEpisode(...)` | 存在，但依賴 Netflix 已建立的 next-episode/playgraph 資料，屬未公開且可能改版的內部 API。 |
| 取消自動下一集 | 未找到可靠入口；`watchCredits(currentMovieId)` 只操作 player playgraph | 實測不能取消已啟動的 Akira post-play transition，並會破壞目前播放頁／PiP 版面。未找到通用的 `cancelAutoplay()` 方法。 |
| 偵測 post-play 倒數 | Akira state 有 `autoplaySeconds`、`startedByVideoId` | 存在於 client state，但目前沒有證據顯示它透過 `window.netflix...videoPlayer` 提供穩定入口。 |
| 偵測已切換下一集 | player 有 video/session 變更事件與 movie ID；頁面 URL 與影片元素也會改變 | 適合在 transition 發生後偵測；比介入倒數可靠。 |
| 播放／暫停／跳轉 | `play()`、`pause()`、`seek(...)` | 僅控制當前 media transport；不等於取消 post-play timer/state。 |

### 4. 本專案現況

本專案曾實測 `watchCredits` action，結果是下一集仍會自動播放，同時 Netflix 頁面從 `/watch` 回到 `/browse`，造成 PiP 畫面縮小。再次以 `/watch/<id>` 的 `currentMovieId` 呼叫後結果仍相同，因此這條實驗路徑已移除。PiP timeline 往回 seek 已恢復為單純 seek，不再改寫 Netflix 的 credits/playgraph 狀態。

PiP handoff 測試已把下一集視為影片生命週期／session replacement：包括 `ended`、`emptied`、`loadedmetadata`、新 video 出現與同一 video 被重用。這條 transition-after-the-fact 偵測路徑比呼叫未公開的 post-play state/action 更穩定。[`pip-manager.test.ts`](../src/content/pip/pip-manager.test.ts)

## 建議

不要把 `playNextEpisode(...)` 或 `watchCredits(...)` 當成一般 transport API，也不要假設 seek backward 本身會取消 Netflix 的 post-play 狀態。維持正常 seek 行為；若仍發生 transition，交由 PiP handoff 偵測下一集、暫停新一集並關閉 PiP，但不聚焦 Netflix 分頁。若未來要在倒數期間真正取消，應尋找 Akira post-play action/state 的穩定入口，而不是操作 player credits playgraph。

## 限制

Netflix client/player bundles 是官方網站實際載入的一手程式碼，但它們經過 minify、沒有公開相容性承諾，檔名與內部 module、action、method 名稱都可能隨部署改變。以上內部方法只能視為 2026-07-26 當下可觀察的實作細節，不能視為受支援的公共 API。
