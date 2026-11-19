# Frame and subtitle seek diagnosis

Date: 2026-11-16. Report: [issue #17](https://github.com/chenghsj/netflix-shortcut-override/issues/17#issuecomment-6909751304), Windows 11 / Edge 157.0.4341.60 / extension v0.6.9-beta.1. The reporter used Kill Tony in Texas (`82014058`), English audio and French subtitles, while paused.

## Source evidence

Inspected the [official Cadmium player bundle](https://assets.nflxext.com/player/html/ffe/cadmium-playercore-6.0065.492.911.js) loaded by the local Edge watch tab. SHA-256: `8af8272e0808fda1651786367cf0060c313167683b8b762158911d38dd1a9abe`. Positions below are zero-based JavaScript string offsets, not line numbers or stable API identifiers.

- The public session `seek` forwards only its time argument to the internal transport (around 2978658). Passing extra arguments to the public facade cannot request precision.
- The internal player accepts a fourth `forcePreciseSeeking` argument (around 2045197 and 2719734). The seek manager uses that flag before consulting the playback/device configuration (around 2797281).
- Without precision, `calculateSeekPosition` selects the subfragment start rather than the requested position. Precision rounds the requested milliseconds instead. The current configuration can additionally add a small seek delta.
- Independently, the media element transport can suppress seeks within a configurable delta, defaulting to 50ms (around 2232294 and 2633485). Requesting precision does not override this threshold.

The source establishes a mechanism, not the reporter's active Windows configuration. Playback parameters and runtime configuration can override platform defaults.

## Reproduction and change

`npm test -- src/shared/netflix-precise-seek.test.ts` initially failed three cases: frame advancement and both subtitle directions. The fixture models four-second subfragments with precision disabled and exercises the serialized production executor, including subtitle target selection. It does not emulate a real decoder or prove which subfragments exist in the reported stream.

An additional temporary probe executed `calculateSeekPosition` extracted from the official bundle against the same four-second boundaries. Requests at 8040ms and 8080ms both became 8001ms without precision; 11000ms became 8001ms, and 6000ms became 4001ms. With precision those requests became the requested time plus 1ms. This reproduces the mechanism behind stationary forward requests and overly large backward jumps.

Frame and absolute seeks now request precision through the optional internal Netflix transport. Players without that capability retain the public Netflix transport. A throwing internal seek is reported without a second seek attempt. Relative seeking keeps its existing public transport. No native video position is written by the extension.

The regression file also covers fallback, ordinary relative seeking, and internal transport failures. All 1360 tests, lint and type checking passed after the change. Both Chromium and Firefox production builds and build verification also passed.

## Real-browser boundary

The local Mac Edge session was switched to the user's requested Netflix profile, 升. Before rebuilding, the same title with English audio and French subtitles advanced through distinct subtitle positions (550.801, 555.681, 559.060 seconds), and previous/next returned between the latter two positions while paused. This local environment did not reproduce the reporter's persistent subtitle failure. Frame stepping sometimes required multiple presses before the native video position moved, consistent with the small-seek threshold; decoded frame accuracy was not established.

After the user manually reloaded the rebuilt extension, live acceptance was completed in Mac Edge with the same 升 profile, title, English audio and French subtitles. No console errors were recorded. Once subtitle timings were cached, three D presses moved through 945.195, 948.615 and 953.162 seconds; three A presses returned through 948.615, 945.195 and 941.942 seconds. All six actions remained paused and displayed no error or loading hint. A subtitle jump during playback kept playback running; frame stepping during playback paused it.

Six forward frame presses advanced the native video from 941.942 to 942.193 seconds, and six backward presses returned it to 941.943 seconds. Movement occurred approximately every second press (about 83–84ms), consistent with Netflix suppressing smaller requests. Every sample stayed paused. This verifies cumulative movement, not one decoded frame for every key press.

Switching to a new subtitle track while paused initially produced the existing timing-not-ready message; brief playback loaded the French track, after which navigation succeeded. The local pre-change environment had also navigated subtitles correctly, so this acceptance establishes that the new transport works locally, not that the reporter's Windows failure was reproduced and eliminated.

The Windows Edge environment remains unverified. The precision request addresses fragment alignment, but does not promise one rendered frame per key press. Real-browser checks should record both requested and rendered positions and retain this distinction.

Cleanup restored the confirmed original Traditional Chinese subtitle selection, closed the temporary browser tabs, and confirmed the user's original watch tab remained paused at its original 119.412-second position.

## Actual FPS read verification

A subsequent check observed three real frame-step commands on the same title in Mac Edge. A temporary passive listener was appended to the existing built page bridge; the production executor, FPS selection and playback commands were unchanged. The listener displayed only selected numeric fields from production responses and independently read the same player's diagnostics.

All three responses reported `frameRate: 23.976` and `frameRateEstimated: false`. Each independent diagnostics read also returned a `Framerate` of 23.976, with no diagnostics error. All three commands had `seekCalled: true` and no command error. The production targets advanced by approximately 41.708375ms per frame, matching `1000 / 23.976`.

This confirms that these real commands read Netflix's FPS successfully and did not use the fallback of 24 FPS. It does not establish FPS availability for every title, browser or future Netflix version.

The temporary observer was removed and its test tab closed. The bridge bundle was restored byte-for-byte to its original SHA-256, `b5c066476e67a1766a3d5459ad5295900ce20bd38984339b3df9f90e2f0481f1`; Chromium and Firefox build verification passed afterward. The recorded numeric responses and screenshot were saved as local verification artifacts.

## Follow-up on 2026-11-18

The [reporter's beta.2 feedback](https://github.com/chenghsj/netflix-shortcut-override/issues/17#issuecomment-6971016782) confirms frame stepping is fixed in their environment. They still report an incorrect previous-subtitle landing on Rick and Morty S01E02 around 3:20, with English audio and French subtitles, and request previous/next media keys alongside Ctrl+P / Ctrl+N.

A deterministic regression exposed a related selection error: the navigation cache discarded subtitle end times, so a pause in a subtitle-free gap was treated as being inside the last started subtitle. Previous then skipped an extra sentence. An illustrative fixture with cues at 3:05–3:08 and 3:15–3:18, paused at 3:20, requested 3:05 instead of 3:15 before the change. These are fixture values, not timings captured from the reporter's French track. `npm test -- src/content/subtitle-navigation.test.ts -t 'gap after'` failed with expected 195000 / received 185000 before the fix and passes afterward.

Navigation now keeps distinct start/end intervals. Previous returns to the latest ended cue in a gap and goes one cue earlier when inside an active cue. Intervals sharing a start keep the longest end. Next/replay continue to target cue starts, and transport and cancellation behavior are retained.

The edit dialogs now store multiple keys per action. Users can add media track keys beside the saved episode keys; there are no implicit media-key assignments. The MAIN-world bridge also handles browser Media Session track actions, which can arrive without keyboard events, while retaining Netflix's handlers for fallback and restoration. This uses the browser's [Media Session action handlers](https://developer.chrome.com/blog/media-session), rather than a system-wide hotkey.

The new automated regressions exercise default keys and media keys together, browser track actions, explicit reassignment, disabled/cleared rows, typing, navigation outside watch pages, site-handler restoration, and subtitle gaps. Real Windows/Edge hardware delivery remains unverified.

After the user enabled subtitle navigation, a local Mac Edge test reproduced the missing-text symptom on the reported episode (`80098734`), with English audio and French subtitles. Paused at 200001ms, Previous correctly requested the cue at 192568–195529ms and the native video reached 192569ms, but the subtitle stayed invisible. A 100ms in-cue position offset did not fix it and was removed.

Targeted temporary instrumentation found that Cadmium's timer had already marked 192669ms as `updatedForMediaTime` with an empty active entry. At the same time its underlying subtitle manager returned a current cue at 192568–195529ms and the next at 202035–203161ms. Player time and subtitle time matched. The official bundle's timer `update` returns immediately when media time equals this cached value; calling `updateActiveEntry` alone therefore retained the empty result. This establishes a stale timer cache in this local reproduction, distinct from cue selection.

The initial fix for paused absolute seeks listened for native `seeked`, waited 100ms, invalidated the optional timer's `updatedForMediaTime`, and asked Netflix to update its own active entry. The refresh checks the original watch path, connected video, paused state and target proximity. Playback and media changes cancel it, absent seek events expire, and missing or throwing internal APIs do not fail the seek.

The serialized production-executor regression `npm test -- src/shared/netflix-precise-seek.test.ts -t 'stale empty'` first failed with expected native subtitle text / received empty text. It now passes, along with cancellation, fallback and expiry cases. Final local Edge acceptance, using the clean production build, moved from paused 200001ms to 192569ms and displayed the French subtitle. Next moved to 202036ms and displayed its subtitle; two Previous presses returned through 192569ms to 188022ms with the matching text. The video remained paused, and no console errors were recorded. This verifies the local Mac Edge scenario; the reporter's Windows hardware remains untested. Cleanup restored Traditional Chinese subtitles and closed the temporary test tab.

The multi-key implementation also passed a real Edge development-page check of adding a code-less MediaTrackNext beside Ctrl+N, saving, reopening and routing both keys in all five interface languages. All five cases passed. These were simulated keyboard events in a real browser, not physical Windows hardware tests. A native F20 press was also recorded into a second field without replacing Ctrl+N. The test restored the development page settings afterward.

Validation after the readability cleanup passed 1,433 tests across 90 files and all coverage thresholds (93.39% lines), ESLint, TypeScript, Chromium/Firefox production builds and build verification. The earlier Firefox extension lint returned zero errors and four existing compatibility/React bundle warnings.

The fixed 100ms delay was later removed. A local Edge trace showed that `seeked` could arrive while Cadmium's presentation state was still `WAITING`, when its renderer suppresses the active subtitle. For several backward jumps where presentation was already ready, the subtitle data only became available after `seeked`. The refresh now checks immediately at `seeked` and retries at 16ms intervals only while presentation or the subtitle data is pending. A newer seek, playback change, or expiry discards the pending refresh.

On the clean build in Mac Edge, ten Previous and five Next jumps around 3:10–3:40 of the same episode displayed Traditional Chinese subtitles while staying paused. This included the 216.551s and 204.831s positions that had stayed blank when the refresh ran only once at `seeked`.
