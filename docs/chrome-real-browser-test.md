# Real Netflix Chrome Test Steps

This document describes the intended manual/agent-assisted test flow for the real Netflix site in the user's real Google Chrome profile.

## Scope

Use this when validating actual Netflix behavior:

- Real Google Chrome profile.
- Real logged-in Netflix watch page.
- Production extension loaded from `dist/chromium`, or the currently installed Chrome Web Store extension when validating the shipped version.
- Real keyboard shortcuts against Netflix playback.

Do not treat a fake page or isolated test browser as a substitute for this check.

## Rule: Real Chrome Only

For this validation, operate the user's visible `/Applications/Google Chrome.app` window.

Do not use:

- Chrome DevTools MCP as the browser under test.
- Chrome for Testing.
- Playwright-created browsers.
- The Codex in-app browser.
- Fake Netflix pages.

`@Chrome` may be used only when it attaches to an already-open tab in the user's real Google Chrome profile. If `@Chrome` cannot control that tab, use the Computer Use workflow below.

## 1. Build the Extension

```sh
npm run build
```

The unpacked extension directory is `<repository-root>/dist/chromium`. For example, from the repository root:

```sh
pwd
```

Append `/dist/chromium` to the printed path when selecting the unpacked extension.

## 2. Load the Extension in the Real Chrome Profile

Skip this section only when intentionally testing the Chrome Web Store version that is already installed in the user's real Chrome profile.

1. Open the Google Chrome profile used for Netflix.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist/chromium` directory inside the repository:

```text
<repository-root>/dist/chromium
```

Chrome assigns an ID to this unpacked extension. It may differ from the Chrome Web Store ID:

Check the ID shown for the loaded extension at `chrome://extensions`.

If Chrome already has the Chrome Web Store extension installed, confirm the intended test target before changing it. Loading, disabling, or replacing extensions changes the user's real browser profile and should not be done silently.

## 3. Prepare Netflix

1. Open a real Netflix watch page:

```text
https://www.netflix.com/watch/...
```

2. Start playback.
3. Reload the Netflix tab after loading or updating the unpacked extension.
4. Confirm the toolbar says `Shortcut Override` has access to the Netflix site.

## 4. Verify Real Chrome State

Verify from the visible Chrome UI or Computer Use state output:

- The app is `/Applications/Google Chrome.app`.
- The selected tab URL starts with `netflix.com/watch/...`.
- The toolbar says `Shortcut Override` has access to this site.
- Netflix playback controls or video content are visible.

Do not use Chrome DevTools as the verification path for this real-browser check.

## 5. Verify Keyboard Shortcuts

For the ordinary shortcut checks below, leave the Subtitle navigation master off. Before testing shortcuts, open the extension toolbar popup on the watch page. On the first open and after closing/reopening, confirm it directly shows shortcut search, the Playback category, and its saved keys, without tabs or quick-setting controls. The header must retain the global enable switch, compatibility status, and Open options entry. The popup must grow to its intrinsic height rather than displaying only the header and footer. Check this from a non-Netflix page too; a long search result list must scroll independently while the header and footer remain visible.

Verify playback focus restoration:

1. Select the Netflix video to dismiss the popup.
2. Without selecting the page again, press `Space`, `ArrowRight`, and `M`.
3. Verify each shortcut takes effect.
4. Repeat the popup-open, dismiss, and shortcut sequence at least five times.
5. Open the popup again, press `Esc`, and verify `Space` works without another page click.
6. Open Options, GitHub, and Other products from the popup and verify Netflix does not pull focus back from the destination.
7. Change to another browser tab while the popup is open and verify Netflix does not pull focus back.

Verify the reload-in-progress regression with the local build ten consecutive times:

1. Reload the Netflix watch tab.
2. While the page is still showing its loading spinner, open the toolbar popup.
3. Confirm the shield remains in the checking state while the tab is loading and never reports ready early.
4. If loading lasts more than ten seconds, confirm the popup says it will recheck automatically and does not reload the tab.
5. Wait until the shield reports that compatibility is ready.
6. Select the Netflix video once to dismiss the popup.
7. Immediately press `Shift+.` without another page click.
8. Confirm the first key press changes playback speed.
9. Restore speed to `1x`, then repeat from step 1 until all ten runs pass.

Any early ready result or first-key failure fails the run. Record the consecutive-pass count and reset it to zero after a failure.

If the popup reports that the extension is not active:

1. Verify the inline recovery notice explains that the Netflix tab must be reloaded.
2. Select Reload Netflix.
3. Verify the popup closes after starting the reload.
4. Wait for the Netflix watch page to finish loading.
5. Without clicking the Netflix page first, press `Space`.
6. Verify playback pauses or resumes. This confirms keyboard focus returned to the page.
7. Open the popup again and verify the recovery notice is gone and the diagnostics button is available.

Select the shield-shaped diagnostics button in the title bar and verify:

- Compatibility reports that Netflix playback features are ready.
- Extension, video, page bridge, Netflix player API, and Picture-in-Picture rows show their expected available states.
- Copy diagnostics is available after diagnostics respond and produces a report without the active Netflix URL.
- Missing playback state is retried within roughly two seconds even while the diagnostics dialog is closed. Open the popup while Netflix is initializing, leave the dialog closed, and confirm the pending header disappears once playback is ready. Repeat after opening and closing diagnostics during initialization.
- Automatic checks stop after playback is ready or a stable unsupported capability is identified.
- A missing content-script receiver produces the inline reload recovery state instead of retrying indefinitely.
- Closing the diagnostics dialog returns to the popup; pending playback checks continue until ready. Closing the popup cancels its observation.

Run these against the real Netflix watch page:

- Configured Play / Pause key (`Space` by default): play/pause.
- Hold the configured Play / Pause key: temporary hold speed, then restore on release.
- `ArrowRight`: seek forward by configured seconds.
- `ArrowLeft`: seek backward by configured seconds.
- `,` / `.` move one frame backward / forward and stay paused. Start once during playing video to confirm it pauses before stepping, then repeat while already paused. Hold each briefly to verify cumulative movement, reverse direction, resume and pause, then verify stepping starts from the new position. Confirm the start/end clamp and that ordinary seeking resets the accumulated position. Netflix diagnostics determine frame duration, with a 24 FPS estimate when unavailable; record any seek rounding separately. Compare frame/audio hint sizing with the existing compact subtitle-language hint and verify subtitle/audio language labels remain visible for 1 second after the last change.
- With General settings → Hide pause overlay enabled, pause on the source page using Netflix's controls and the configured Play / Pause shortcut, then repeat after frame stepping. Wait at least 60 seconds each time. Confirm Netflix's title/synopsis/paused overlay and dark backdrop stay hidden while the frame, captions and controls remain available and the playback position stays fixed. Turn Hide pause overlay off to restore the overlay immediately, then on to hide it. Confirm the saved off value survives reopening Options and a global-disable cycle; restore it to on after testing. Disabling the global override must also restore the overlay.
- Configure Favorite audio tracks under Volume and audio: batch-add two available languages, reorder them, and verify Shift+A / Shift+D follow that order in normal playback and PiP. Confirm missing favorites are skipped, an entirely unavailable list preserves the current audio with a hint, clearing the list restores all-track cycling, and a sole matching selected track is not reselected. Save the standard and Audio Description variants of one language separately and verify neither is substituted for the other. Reopen Options and round-trip a backup to check order and variant retention.
- `Shift+A` / `Shift+D`: previous / next audio track, wrapping in both directions. Verify the native menu's selected track and actual sound agree with the hint, including audio-description variants when offered. Holding a key must switch only once. Check a single-track title when available. Remap and disable each new action in Options, confirm the popup reflects the saved keys, and verify typing remains unaffected. Repeat the frame and audio checks in PiP.
- `ArrowUp`: volume up.
- `ArrowDown`: volume down.
- `M`: mute/unmute.
- `C`: turn Netflix subtitles off; press it again to restore the previously selected track when available.
- `F`: fullscreen.
- `Shift+P`: enter Picture-in-Picture; press it again to exit.
- `S`: Skip Intro when the Netflix button is visible.
- `Ctrl+P`: play the previous episode with one key press, including when player controls are hidden and the episode picker is closed. Confirm playback changes, rather than stopping at the episode preview.
- `Ctrl+N`: play the next episode, returning to the original episode after the previous-episode check.
- `Shift+.`: speed up.
- `Shift+,`: speed down.
- `Shift+"`: set the configured preferred speed directly; repeated presses keep that speed.
- `Shift+/`: reset speed.

### Subtitle-track queue and settings checks

- Press `Shift+X` or `Shift+Z` rapidly while a subtitle switch is pending. Valid consecutive presses must execute in order. Before the pending switch finishes, separately test global disable, disabling the originating row, changing watch IDs, replacing the video, and closing the originating PiP window. Queued commands must not dispatch afterward or show a cancelled-command hint. Disabling and immediately re-enabling the global switch must not revive the old queue. Preserve the already-issued PiP command's confirmed fallback update. If the request completes too quickly to establish a queue, record that cancellation case as unverified.
- In Options → Subtitles, confirm the Sentence jumps and replay heading has no information button or tooltip. Turn the global switch off and confirm inline prerequisite guidance remains visible and saved settings are retained. Restore the original settings.
- Edit a percentage jump at 50% and drag its numeric label eight pixels to the right: it should preview 55%, without saving. Seconds editors advance by 1 over the same distance. Pointer cancellation restores the starting draft; dialog Cancel leaves persisted values unchanged. Direct percentage entry still accepts 51%.

Expected:

- Netflix playback responds to each shortcut.
- Media hints appear near the video center after handled shortcut actions.
- The subtitle shortcut changes Netflix's active native subtitle track rather than inferring state from visible subtitle text.
- The subtitle hint uses the PiP subtitle-settings icon, shown white when subtitles are enabled and dimmed when disabled.
- PiP keeps Netflix subtitles visible and updates them when the subtitle line or language changes.
- Pressing `C` inside PiP updates the PiP subtitle switch and persists its resulting state; changing the switch also updates Netflix's native subtitle track.
- Pressing `Shift+P` inside the PiP window exits PiP without returning to the Netflix tab first.
- Resizing the PiP window keeps the subtitle overlay aligned with the video.

Verify automatic next-episode transition against at least two episode boundaries:

1. Enter PiP while an episode is playing and leave Netflix autoplay enabled.
2. Let Netflix reach the automatic next-episode boundary without interacting with the source page.
3. Confirm PiP closes. If another tab was selected before transition, confirm Netflix is not activated or focused.
4. Confirm the extension does not force a pause or resume: with Netflix autoplay enabled the next episode may continue, while an autoplay-disabled profile remains governed by Netflix.
5. Move the pointer over the Netflix player and confirm the next title is visible.
6. Confirm play/pause, seek backward/forward, volume, next episode, episode list, audio/subtitles, speed, and fullscreen controls respond.
7. Repeat in Chrome and Edge, and once when Netflix replaces the player root and once when it temporarily keeps the previous root mounted when those transition shapes can be observed.

Any extension-triggered playback-state change, blank title, black or stale video, or unresponsive control fails the run. Record the browser, Netflix autoplay setting, source and destination watch IDs, and whether the old player root remained mounted when that state can be inspected safely.

## 6. Agent-Assisted Chrome Workflow

Use the Computer Use plugin to inspect the available browsers and select the existing Netflix tab in the user's real Chrome profile:

```js
await cua.getState();
// Use the exact tab ID and browser ID returned by the inventory.
let netflixTab = await cua.getTab(tabId, { browser: browserId });
```

Read the returned documentation before operating the tab. Verify its URL and visible Netflix player, then use the documented keyboard/UI APIs. After each shortcut, inspect the current state for the expected playback behavior. Keep existing user tabs open and close only temporary tabs created for this check.

A local preview or fake player can help diagnose a failure, but is not real Netflix acceptance evidence.

## 7. Computer Use Fallback Workflow

If the browser tab API cannot operate the real Chrome tab or an internal extension page, use the native Chrome interface:

```js
let chrome = await cua.getApp('com.google.Chrome');
```

1. Confirm the selected window belongs to the Netflix Chrome profile. Use the visible tab controls to reach the existing Netflix watch page or its extension manager.
2. Inspect the current accessibility state or screenshot before each action. Confirm the toolbar reports that Shortcut Override has site access.
3. Use the documented native keyboard/UI methods to exercise the shortcuts from section 5, reading the resulting state after each action.
4. Reload the existing unpacked extension and Netflix tab after a build; do not replace another installed extension to make the test pass.
5. Restore temporary test settings and pause playback at the end unless the user requested another final state. Save a screenshot of the observed result.

If the extension manager is blank or the loaded directory cannot be verified, record that blocker and leave the new-build acceptance check unverified.

## 8. Observed Run, 2026-05-18

Target URL:

```text
https://www.netflix.com/watch/...
```

Environment:

- Real `/Applications/Google Chrome.app`.
- Real Netflix watch page.
- Installed `Shortcut Override for Netflix` was the Chrome Web Store version, not the local `dist/chromium` unpacked build.
- `@Chrome` could list real tabs, but `browser.user.claimTab(tab)` timed out.
- Computer Use opened and tested the visible real Chrome tab.

Results:

| Shortcut | Result |
| --- | --- |
| `Space` | Passed. Pause state changed to playback and the media hint appeared. |
| `M` | Passed. Muted state changed to audio playing and the hint appeared. |
| `Right` | Passed. `+10s` hint appeared and progress moved forward. |
| `Left` | Passed. `-10s` hint appeared and progress moved backward relative to playback. |
| `Up` | Passed. Volume hint changed to `19%`. |
| `Down` | Passed. Volume hint changed to `14%`. |
| `S` | Inconclusive on the Chrome Web Store version. Netflix showed Traditional Chinese copy `略過介紹`; local code was updated to recognize that copy and covered by unit tests. |
| `Shift+.` | Passed. Speed hint changed to `1.25x`. |
| `Shift+,` | Passed. Speed hint changed back to `1x`. |
| `Shift+/` | Passed. Reset speed hint showed `1x`. |
| `F` | Passed. Entered fullscreen. |
| `F` again | Passed. Exited fullscreen. |

The Netflix tab was returned to the requested URL and paused at the end of the run.

Code follow-up from this run:

- Added Traditional Chinese skip intro matching for `略過介紹`, `跳過介紹`, and simplified Chinese `跳过介绍`.
- Added unit test coverage for the current Netflix Traditional Chinese skip intro copy.
- Verified with `npm run typecheck`, `npm run lint`, `npm test -- --run`, and `npm run build`.

To live-test the patched local build, load or switch to the unpacked `dist/chromium` extension in the real Chrome profile first. Do not assume the Chrome Web Store extension uses local source changes.

## 9. Historical Blocker Observed, 2026-05-18

On 2026-05-18, the Chrome health checks passed:

- Google Chrome was installed and running.
- Codex Chrome Extension was installed and enabled.
- Native messaging host manifest was correct.
- `browser.user.openTabs()` listed the real Netflix watch tab.

But control failed:

- `browser.user.claimTab()` timed out for the existing Netflix tab after 60 seconds.

During that run, discovery worked but the tab-control channel was blocked. This record does not establish the current browser state. When the same failure occurs, do not replace real Netflix validation with Playwright, fake Netflix pages, or another browser path.

Recommended recovery:

1. Close unneeded `about:blank` automation windows.
2. Keep the target Netflix tab open.
3. Restart Chrome if acceptable.
4. Reinstall or repair the Codex Chrome Extension from the Codex plugin UI if `claimTab()` still times out.
5. Retry from the agent-assisted workflow.

## 10. Local Checks

These checks are useful before manual Netflix validation, but they do not replace it:

```sh
npm run typecheck
npm run lint
npm run test:coverage
npm run build
```

## 11. Subtitle Navigation Regression Checks

Open the popup with subtitle navigation off. Select Subtitle navigation in the category selector and confirm all four configured keys are available for reference, with a category Disabled indicator while the subtitle master is off. Confirm there is no subtitle master or playback preference control in the popup. Use Open settings to open Subtitle navigation directly, enable it in Options, and return to confirm that individual disabled rows still show Disabled. For legacy overlaps, the ordinary shortcut stays active and the subtitle row shows Shortcut priority with the general action in its accessible description. Verify a custom key with modifiers and release after disabling the overlapping row in Options. Turning off the popup global switch preserves the saved subtitle preference and keeps the keys available for reference. Confirm Open settings has visible text and an external-link icon, and its tooltip explains that editing happens on the settings page. Verify search finds subtitle-navigation actions and physical keys across categories, Escape restores the selected category, and reopening the popup clears its temporary search and category without saving navigation in settings.

This is an acceptance checklist, not a record of a completed run. Record the browser and extension version, loaded directory, selected subtitle language, and each result. Reload the unpacked `dist/chromium` extension and Netflix tab before testing source changes.

### Settings and key priority

1. With a fresh installation, confirm Netflix is the only required host and `nflxvideo.net` is optional. For fresh settings, confirm Subtitle navigation is off by default and ordinary shortcuts work without CDN access. Both shortcut tables use the same Function / Key / Enabled / Actions columns. The section title has no information button or tooltip; the subtitle master appears before its Reset button.
2. Enable the global shortcut override and Subtitle navigation, and select a Netflix subtitle track. Already-granted host access must enable without another prompt. If access is withheld, the subtitle master click must display Chrome's permission request for Netflix and `nflxvideo.net`, without `nflximg.net` or `nflxext.com`; denial keeps it off with localized retry guidance, and a subsequent accepted request enables it. Do not revoke existing permissions solely for a test without arranging restoration with the user.
3. Verify A/D jump to the previous/next subtitle start while preserving both playing and paused states. Verify S seeks to the current or most recently started subtitle and plays once without an automatic loop or stop. Verify W toggles immediately and does not apply hold speed.
4. Confirm fresh replay is Not set and disabled. Assign S to Replay and explicitly transfer the key from Skip Intro, then confirm S replays. Disable replay and re-enable Skip Intro to confirm S skips when its button is available.
5. Edit a subtitle key and disable a row. Turn the global override off: subtitle controls become disabled, inline prerequisite guidance appears, and the saved values are retained. Turn it back on and confirm those same values return.
6. With only the subtitle master off, confirm keys remain editable/resettable and row switches are disabled. The subtitle section Reset restores its four keys and row enabled states while preserving its master and other settings; the ordinary section Reset preserves subtitle settings. Restore test changes afterward.

### Disabled-key reuse and conflict popover

1. Record the original settings. Disable subtitle Play / pause (W), then edit Next subtitle to W. Saving must succeed and leave Play / pause disabled. Attempt to enable Play / pause: the popover identifies W and Next subtitle; neither row changes yet.
2. Dismiss with Escape and by clicking outside. Settings remain unchanged and keyboard focus returns to the available row switch. Choose Change key, then cancel the recorder: settings still remain unchanged and focus returns. Repeat, record Q, and save: Play / pause becomes enabled on Q while Next subtitle stays enabled on W.
3. Restore the overlap and choose Use for Play / pause. Play / pause becomes enabled on W and Next subtitle becomes disabled while retaining W. Ordinary shortcut settings remain unchanged. Repeat the reuse, cancellation, and transfer flow in the ordinary table, for example with disabled Mute and enabled Skip intro on S.
4. Reset a row whose default key was reused by another enabled row. The same popover must appear before its key or enabled state changes. Confirm transfer, then verify only the affected rows changed. Enabled rows continue reserving keys for editing even with their table master off; disabled rows release them. Repeat this between a general and a subtitle-navigation row: cancel must preserve the existing owner, and only explicit transfer may disable it. Legacy overlaps must execute the general shortcut.
5. Open a conflict popover and change settings from another view. It must close and stay closed when those settings are restored. Restore all original keys and enabled states after testing.

### Loading, errors, and cancellation

1. Use a newly selected track with uncached timings. While caption delivery is pending, verify the top text hint and spinner remain visible until completion, failure, or cancellation. The rotation takes about 1.6 seconds per revolution. If delivery is too fast to observe, record this item as unverified rather than claiming a long loading state was tested.
2. Repeat navigation on the same track. Cache hits and successful/boundary jumps show no subtitle navigation hint; W shows its playback icon. Verify reduced-motion preferences suppress spinner motion.
3. Trigger an observable unavailable-track or delivery failure. Confirm a localized text hint stays visible for about five seconds, clears the busy state, and allows retry. Diagnostics must not expose signed delivery URLs, cookies, or subtitle text.
4. During a pending replay, toggle playback using the keyboard, Netflix native controls, and PiP mouse controls. Late delivery must not undo the requested playback state.
5. During a pending action, disable its row and re-enable it before delivery finishes. Late delivery must not seek or play. Disabling a different row must preserve the pending action.
6. In PiP, request S with uncached timings and close the window while loading is visible. Confirm the source video is restored, loading feedback is cleared, and late delivery neither seeks nor starts it. Repeat using the PiP shortcut to exit. If no pending delivery can be observed, mark the cancellation scenario unverified.
7. Change subtitle language or watch ID and confirm timings from the old track/session are not used for the new one.

Automated tests cover string bridge messages and cancellation during both caption delivery and a pending seek. They do not establish actual Netflix/Chrome event timing; record those results separately.

## 12. Frame and Audio Shortcut Check, 2026-11-14

Rebuilt both targets and reloaded the existing unpacked Chrome extension from this checkout's `dist/chromium` (development version 0.6.8). The Traditional Chinese Options page showed enabled previous/next frame and previous/next audio-language rows with the new defaults.

- With Netflix paused, period and comma displayed the corresponding localized frame hint. Repeated presses moved the video position in each direction while remaining paused. Immediate position reads sometimes retained the previous value until Netflix completed its small seek; this is not evidence of guaranteed decoded-frame accuracy.
- During playback, period displayed the localized reminder to pause and did not pause the video automatically. Playback was paused again after the check.
- Shift+D changed Japanese audio to Korean; Netflix's native menu marked Korean selected. Shift+A restored Japanese, and both its native selection marker and the extension hint agreed. Audio remained muted, so actual sound output was not evaluated.
- All 882 automated tests, TypeScript, ESLint, both builds and build verification passed. Firefox package lint reported no errors and two bundled `innerHTML` warnings.

Live Firefox, PiP, end-of-video clamping, missing diagnostics, audio-description variants, single-track titles, and all remapping/disable cases were not exercised in this run. Automated coverage establishes their modeled behavior only.

### Refinement follow-up, 2026-11-14

The final preference subsequently reduced subtitle/audio language-label visibility from 1.5 seconds to 1 second. The timed observations below describe the earlier 1.5-second build.

The pause-only behavior above was subsequently replaced: pressing period during playing video now pauses through Netflix's API before stepping. This was verified live in the reloaded Chrome build; the video changed from playing to paused and showed the shorter localized frame label.

Frame and audio feedback now use the incumbent compact subtitle surface (12px label, 12px × 20px padding, and 0.82 icon scale). The measured frame surface was approximately 95 × 100 CSS pixels, and the audio-language surface approximately 103 × 92. Subtitle-language feedback was still fully visible 1.11 seconds after a switch; audio-language feedback was fully visible at 1.08 seconds and had begun fading by 1.86 seconds, consistent with the 1.5-second visible duration. Audio/subtitle selections were restored and playback left paused. All 885 automated tests, ESLint, type checking, both builds, and build verification passed. Live Firefox and PiP remain unverified.

### Real subtitle-queue acceptance, 2026-11-15

Google Chrome 157.0.8103.52 in the user's real Chrome profile, local extension 0.6.9 loaded from this checkout's `dist/chromium` (`glnfldecggfgnjjhclkbcikogdonigcf`), on the real Netflix watch player. The temporary acceptance build forwarded real Netflix commands unchanged and retained the first completed subtitle response outside the transport timeout, making a second real key press wait in the existing session queue. A visible panel counted actual transport calls. The harness was injected by a temporary Vite transform without editing application source; it is not a shipped feature.

| Case | Observed result | Status |
| --- | --- | --- |
| Normal consecutive `Shift+C` presses | Two presses sent one command while the first response was retained; release sent the second command and selected Traditional Chinese. | Pass |
| Episode transition while queued | Two presses started on watch `81787987` (episode 11). Netflix's native Next episode control changed to `81787988` (episode 12). Releasing the retained response left the actual send count at one, with no response still held. | Pass |
| Global disable while queued | Two presses sent one command and retained its response. The user switched off the extension's own global control; the live Netflix panel confirmed the disabled setting before release. The send count stayed at one after release and after the user restored the global control. | Pass |

This controlled delay establishes the queue lifecycle on real Netflix; it does not measure how often ordinary Chrome timing produces a queue. No Firefox or PiP acceptance result is implied.

Cleanup rebuilt and verified the ordinary Chromium and Firefox production outputs, with no temporary probe remaining in the bundles. The real Netflix tab was reloaded on episode 11, normal next/previous subtitle shortcuts were checked, and Netflix's native menu showed Traditional Chinese selected. The global extension switch was restored on; the original watch position was restored to 272.192 seconds (about 4:32), paused, muted and at 1× speed. Application source hashes were unchanged by the acceptance harness.

## Expanded seeking and speed ranges

These are acceptance instructions for the current source, not completed real-browser results. Record the browser/build and each outcome, then restore the original settings and playback position.

1. In **Seeking and navigation**, open the built-in Forward / Rewind editor. Verify a 1–300 second range, reject 301 with Save disabled, save 300, reopen, and confirm 300 is retained. Repeat with **Add seek pair** and distinct unoccupied forward/rewind keys. Check both keyboard directions on a title with enough duration and playback position to move 300 seconds without hitting an endpoint. Repeat in PiP on Chrome/Edge.
2. Drag a seconds label beyond either boundary and confirm it clamps to 1 or 300. Cancel a drag and then cancel the dialog to confirm saved settings are retained. Percentage editors still use 0–100%.
3. Under **Playback speed → Range and step**, set Highest speed to 5 and save by blurring the field. Increase from near 5x, confirm it reaches 5x and cannot exceed that configured maximum, then decrease again.
4. Set the built-in preferred speed to 5 and save. Add a separate preferred-speed shortcut at 5 with an unoccupied key. Reopen both editors, activate each shortcut on Netflix, and verify the playback rate and popup reference. Values above 5 normalize to 5; the default highest and preferred speeds remain 3x and 1.5x until edited.
5. Export settings and import into a disposable current-build profile. Confirm the built-in interval, custom pair values and keys, highest speed, and both preferred-speed entries retain their saved values. Existing 300-second intervals and 5x preferences must survive the round trip.
6. Upgrade a disposable installation with a valid older backup containing a custom interval above 300. Confirm it becomes 300 while retaining its ID, keys and enabled states. Verify a current-format backup containing a custom interval above 300 is rejected without replacing current settings. See [numeric migration details](settings-upgrade.md#current-numeric-ranges).

The automated boundary, editor and backup regressions do not establish actual Netflix behavior at 5x; record live playback separately.
