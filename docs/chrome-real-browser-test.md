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

For the ordinary shortcut checks below, leave the Subtitle navigation master off so its default `S` binding does not replace Skip Intro. Before testing shortcuts, open the extension toolbar popup on the watch page.

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
- Missing playback state is retried within roughly two seconds while the diagnostics dialog stays open.
- Automatic checks stop after playback is ready or a stable unsupported capability is identified.
- A missing content-script receiver produces the inline reload recovery state instead of retrying indefinitely.
- Closing the diagnostics dialog stops automatic checks and returns to the uncluttered popup.

Run these against the real Netflix watch page:

- Configured Play / Pause key (`Space` by default): play/pause.
- Hold the configured Play / Pause key: temporary hold speed, then restore on release.
- `ArrowRight`: seek forward by configured seconds.
- `ArrowLeft`: seek backward by configured seconds.
- `ArrowUp`: volume up.
- `ArrowDown`: volume down.
- `M`: mute/unmute.
- `C`: turn Netflix subtitles off; press it again to restore the previously selected track when available.
- `F`: fullscreen.
- `Shift+P`: enter Picture-in-Picture; press it again to exit.
- `S`: Skip Intro when the Netflix button is visible.
- `Shift+.`: speed up.
- `Shift+,`: speed down.
- `Shift+"`: set the configured preferred speed directly; repeated presses keep that speed.
- `Shift+/`: reset speed.

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

Open the popup with subtitle navigation off: its separate summary shows only its title and Not enabled. Enable both masters in Options and reopen the popup: all four configured subtitle keys appear, disabled rows show Disabled, and ordinary shortcuts claimed by enabled subtitle rows show Subtitle priority with the overriding action in their tooltip. Verify the default S/Skip Intro overlap, a custom key with modifiers, and release after disabling the overlapping row. Turning off the global override collapses the subtitle summary without clearing its saved values. Editing, resets, and authorization stay in Options.

This is an acceptance checklist, not a record of a completed run. Record the browser and extension version, loaded directory, selected subtitle language, and each result. Reload the unpacked `dist/chromium` extension and Netflix tab before testing source changes.

### Settings and key priority

1. With a fresh installation, confirm Netflix is the only required host and `nflxvideo.net` is optional. For fresh settings, confirm Subtitle navigation is off by default and ordinary shortcuts work without CDN access. Both shortcut tables use the same Function / Key / Enabled / Actions columns. The title's help tooltip explains the feature and the global switch dependency; the subtitle master appears before its Reset button.
2. Enable the global shortcut override and Subtitle navigation, and select a Netflix subtitle track. Already-granted host access must enable without another prompt. If access is withheld, the subtitle master click must display Chrome's permission request for Netflix and `nflxvideo.net`, without `nflximg.net` or `nflxext.com`; denial keeps it off with localized retry guidance, and a subsequent accepted request enables it. Do not revoke existing permissions solely for a test without arranging restoration with the user.
3. Verify A/D jump to the previous/next subtitle start while preserving both playing and paused states. Verify S seeks to the current or most recently started subtitle and plays once without an automatic loop or stop. Verify W toggles immediately and does not apply hold speed.
4. Verify ordinary shortcuts still work. With subtitle navigation enabled, S replays instead of skipping the intro. Disable the replay row and confirm S is released to the ordinary Skip Intro binding when its button is available.
5. Edit a subtitle key and disable a row. Turn the global override off: subtitle controls become disabled, the title tooltip remains available, and the saved values are retained. Turn it back on and confirm those same values return.
6. With only the subtitle master off, confirm keys remain editable/resettable and row switches are disabled. The subtitle section Reset restores its four keys and row enabled states while preserving its master and other settings; the ordinary section Reset preserves subtitle settings. Restore test changes afterward.

### Disabled-key reuse and conflict popover

1. Record the original settings. Disable subtitle Play / pause (W), then edit Next subtitle to W. Saving must succeed and leave Play / pause disabled. Attempt to enable Play / pause: the popover identifies W and Next subtitle; neither row changes yet.
2. Dismiss with Escape and by clicking outside. Settings remain unchanged and keyboard focus returns to the available row switch. Choose Change key, then cancel the recorder: settings still remain unchanged and focus returns. Repeat, record Q, and save: Play / pause becomes enabled on Q while Next subtitle stays enabled on W.
3. Restore the overlap and choose Use for Play / pause. Play / pause becomes enabled on W and Next subtitle becomes disabled while retaining W. Ordinary shortcut settings remain unchanged. Repeat the reuse, cancellation, and transfer flow in the ordinary table, for example with disabled Mute and enabled Skip intro on S.
4. Reset a row whose default key was reused by another enabled row. The same popover must appear before its key or enabled state changes. Confirm transfer, then verify only the affected rows changed. Enabled rows continue reserving keys for editing even with their table master off; disabled rows release them. Existing cross-table subtitle priority remains unchanged.
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
