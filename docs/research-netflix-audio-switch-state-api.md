# Netflix Web 音軌切換狀態 API 調查

調查日期：2026-11-14。範圍為目前播放分頁實際載入的 Netflix 官方程式碼、該分頁的 HTML 媒體狀態，以及本專案現有換軌流程。

## 結論

Netflix 內部播放器提供音軌選取、播放／忙碌狀態、緩衝位置與字幕事件。診斷資訊另有從「實際呈現的音軌」取得的識別資料，能與選取中的音軌區分。

但 `setAudioTrack()` 的 Promise、`getAudioTrack()` 和 `audiotrackchanged` 都不能單獨證明新音軌已開始發聲，更不能證明字幕已同步。本次未找到可直接讀取「聲音與字幕相差多少毫秒」或調整此偏移的 session API。

這次確認的是目前載入版本的程式碼行為；沒有成功直接呼叫該 session 的內部 getter，也沒有進行換軌或重定位實驗，因此尚未確認使用者遇到的時間偏移根因。

## 一手來源與驗證範圍

從播放分頁的 `document.scripts` 讀到以下兩個 URL；下載後檢查的檔案即為這兩個版本：

- [Cadmium playercore 6.0065.492.911](https://assets.nflxext.com/player/html/ffe/cadmium-playercore-6.0065.492.911.js)，SHA-256：`8af8272e0808fda1651786367cf0060c313167683b8b762158911d38dd1a9abe`。
- [Akira client 41229cd655e77922775b](https://assets.nflxext.com/web/ffe/wp/ui/akira/akiraClient.41229cd655e77922775b.js)，SHA-256：`e8f043e8851546bc12e64b425d54791a00eca08e0f4d0cc4eb6aa315e63de38f`。
- [HTML Standard：媒體就緒狀態](https://html.spec.whatwg.org/multipage/media.html#ready-states)，用於解讀標準 `<video>` 狀態。

下文位置為下載原始碼的零起算 Unicode 字元位置，不是穩定行號。方法與欄位均屬未公開的 Netflix 實作，可能隨部署改變。

## 可用狀態

| 入口 | 可以取得什麼 | 使用限制 |
| --- | --- | --- |
| `getAudioTrack()`、`getAudioTrackList()` | 選取或待準備的音軌；目錄物件含 `trackId`、`bcp47`、`displayName`、聲道等 | `getAudioTrack()` 優先回傳 pending hydration 的目標，不能當作實際發聲完成訊號。設定音軌應使用當前 session 目錄中的原物件。 |
| `getTimedTextTrack()`、`getTimedTextTrackList()` | 目前選取或待準備的字幕軌與可用目錄 | 音軌切換會重新選擇相容的影音字幕組合，可能連帶改變字幕軌。 |
| `getBusy()` | `null`，或含 `networkStalled`、`stalled`、`progress`、`progressRollback` 的物件 | 兩個 stall 欄位在 Cadmium 這條實作來自同一個值；native HLS 的物件可能只有後三項。不是音軌專屬的完成狀態。 |
| `getPlaying()`、`getPaused()`、`getError()` | 播放、暫停與播放器錯誤 | 播放中不代表聽覺上的同步已正確。 |
| `getCurrentTime()`、`getSegmentTime()`、`getDuration()` | 播放器／內容時間位置，介面使用毫秒 | 不是獨立的聲音時間與字幕時間。直播可能使用調整過的內容時鐘。 |
| `getBufferedTime()` | 緩衝區終點，受內容長度限制 | 不是緩衝長度，也不是獨立的音訊／視訊時鐘。 |
| `getDiagnostics().getGroups()` | 播放器、緩衝、呈現狀態；分開的音訊／視訊緩衝量與 bitrate；呈現中的影音字幕識別資訊 | 需要診斷面板模型可用；可能回傳空陣列，部分欄位可能被省略。格式為供人閱讀的字串。 |

來源：Cadmium session facade 約 2974268–2979527；內部 getter 約 2035358–2038066；track public interface 約 2050417；診斷欄位約 2803771–2808500。Akira 在約 14292654、14293502 以事件的 `target` 呼叫音軌與忙碌 getter，證實 Netflix 自身 client 使用這種觀察方式。

## 選取音軌與呈現音軌的區別

`getAudioTrack()` 讀取 pending hydration 目標或已選取的 track set。相對地，診斷群組的 `Audio Track` 從 `currentSegment.presentedAudio.value.stream.track` 組成，包含語言、track ID、聲道與 codec。這提供一個比選取狀態更接近實際輸出管線的觀察點，但仍不是聽覺同步測量。

鄰近的 `Timed Text Track` 欄位取自 `activeTimedTextTrack`，包含語言、profile、track ID 等，沒有軌道時可顯示 `none`。可以用來觀察切換音軌後，活動字幕是否也改變。

診斷介面的 `getGroups()` 由 `playbackInfoPanel` 提供；缺少該模型時回傳空陣列。模型受 `renderDomDiagnostics` 設定控制，雖然此版本預設啟用，仍可能被執行時設定覆寫。各群組還有例外處理，不能假設所有欄位一定存在，也不宜把診斷字串當作穩定結構解析。

來源：Cadmium 約 2050014、2201998、2739711、2807220–2808500、2907588。

## 可訂閱事件

Session 提供 `addEventListener(name, handler, order?)` 與 `removeEventListener(name, sameHandler)`。第三參數為 callback 順序，並非 DOM 的 listener options；交付的事件含 `type` 與指向 facade 的 `target`。

對本次問題有用的事件包括：

- 音軌：`audiotrackchanged`、`audiotracklistchanged`。
- 字幕：`timedtexttrackchanged`、`timedtexttracklistchanged`、`showsubtitle`、`removesubtitle`。
- 播放與緩衝：`busychanged`、`playingchanged`、`pausedchanged`、`bufferedtimechanged`、`currenttimechanged`。
- Session 生命週期：`videochanged`、`sessionchanged`，用於使舊播放器的觀察失效並清理 listener。

沒有找到專門表示「新音軌已發聲，而且已與字幕同步」的事件。`audiotrackchanged` 在待準備軌道的路徑中，會在 hydration 完成前觸發。

來源：Cadmium 事件名稱約 1961760–1963500、EventSource 約 1973214、facade 訂閱與事件包裝約 2972650、2978400；Akira 約 14289871–14293555。

## `setAudioTrack()` 的回傳與副作用

此版本回傳 Promise。當相容軌道已完成 metadata hydration 時，實作設定 track set 後立即 resolve；需要 hydration 時則先儲存 pending track、送出變更事件，再執行準備流程。準備流程內某些失敗會被 catch、記錄並關閉播放器，因此 Promise fulfilled 也不能泛化為播放成功。無效音軌輸入則會回傳 rejected Promise。

另外，setter 使用目前影音字幕建立相容 track set，並不保證只改音軌；字幕變更事件與前後字幕 ID 都值得一併記錄。這是已觀察到的 API 行為，不是這次字幕偏移的已確認原因。

本專案目前的 [換軌程式](../src/shared/netflix-page-api-executor.ts) 呼叫 setter 後立即填入目標音軌名稱與 `audioTrackSwitchCalled`，沒有接取 Promise，也沒有比對切換後的呈現狀態。[結果型別](../src/shared/netflix-api.ts) 因此應解讀為命令已呼叫，而不是切換已完成。

來源：Cadmium 約 2038849–2042690、2976332。

## 此次分頁的唯讀觀察

在一次 DOM 取樣中，分頁有一個 `<video>`，`currentTime` 約 806.804 秒、`paused=false`、`readyState=4`，緩衝範圍約 790.415–838.272 秒；標準 `textTracks` 是空的。這只描述取樣當時的 HTML 媒體狀態，沒有量到換軌過程或聲音／字幕偏移。

依 HTML Standard，`readyState` 與 `canplay` 描述媒體資料是否足夠播放，沒有音軌 ID 或字幕同步誤差的語意。`textTracks` 為空也不代表 Netflix 沒有顯示字幕；本次沒有從標準 cue API 取得字幕時間。

## 可採用的後續驗證

以目標音軌 ID、選取音軌 ID、呈現音軌診斷 ID、活動字幕 ID、busy 狀態及播放時間建立有界的換軌記錄；接取 setter 的同步例外與 Promise rejection，並在 session 改變或逾時後停止觀察。事件用來觸發重新取樣，避免單靠事件名稱宣告完成。

即使這些值一致，也只能說明播放器管線中的軌道已切換；是否真的改善使用者聽到的字幕偏移，仍須用同一段影片實測。這份調查沒有加入自動 seek、固定等待或字幕延遲修正。

原始碼另有內部 `avSyncOffset`（約 1812152），用途是 seamless audio fragment splicing；沒有在本次檢查的 facade 或診斷群組發現可直接讀取的音訊／字幕偏移。不能將這個內部欄位當作使用者遇到的字幕延遲。
