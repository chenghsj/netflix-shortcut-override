# Real Netflix Chrome Test Steps

This document describes the intended manual/agent-assisted test flow for the real Netflix site in the user's real Google Chrome profile.

## Scope

Use this when validating actual Netflix behavior:

- Real Google Chrome profile.
- Real logged-in Netflix watch page.
- Production extension loaded from `dist`, or the currently installed Chrome Web Store extension when validating the shipped version.
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

The unpacked extension directory is:

```text
/Users/cheng/Desktop/netflix-shortcut-override/dist
```

## 2. Load the Extension in the Real Chrome Profile

Skip this section only when intentionally testing the Chrome Web Store version that is already installed in the user's real Chrome profile.

1. Open the Google Chrome profile used for Netflix.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select:

```text
/Users/cheng/Desktop/netflix-shortcut-override/dist
```

Expected extension ID from the manifest key:

```text
jebnhiecgnchnioahfagmnebdknddbom
```

If Chrome already has the Chrome Web Store extension installed with the same ID, confirm the intended test target before changing it. Loading, disabling, or replacing extensions changes the user's real browser profile and should not be done silently.

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

Run these against the real Netflix watch page:

- `Space`: play/pause.
- Hold `Space`: temporary hold speed, then restore on release.
- `ArrowRight`: seek forward by configured seconds.
- `ArrowLeft`: seek backward by configured seconds.
- `ArrowUp`: volume up.
- `ArrowDown`: volume down.
- `M`: mute/unmute.
- `F`: fullscreen.
- `S`: Skip Intro when the Netflix button is visible.
- `Shift+.`: speed up.
- `Shift+,`: speed down.
- `Shift+/`: reset speed.

Expected:

- Netflix playback responds to each shortcut.
- Media hints appear near the video center when Show media hints is enabled.
- Media hints stop appearing when Show media hints is disabled.

## 6. Agent-Assisted Chrome Workflow

When using `@Chrome`, use the existing real Netflix tab:

1. Confirm Chrome is running.
2. Confirm the Codex Chrome Extension is installed and enabled.
3. Run `browser.user.openTabs()` and find the existing `netflix.com/watch/...` tab.
4. Pass that exact returned tab object to `browser.user.claimTab(tab)`.
5. Use the returned controllable tab for keyboard input and screenshots of the real Chrome tab.
6. Finalize Chrome tabs after the run.

Do not use a separate automation-only Chrome window for this real Netflix validation.

If `browser.user.claimTab(tab)` repeatedly times out but the user explicitly wants real Chrome behavior, use Computer Use against `/Applications/Google Chrome.app` as the fallback. This still operates the user's visible Chrome window and real Netflix page. Keep the fallback limited to keyboard/UI actions that the user requested.

## 7. Computer Use Fallback Workflow

Use this only after `@Chrome` can list tabs but cannot control the selected real Chrome tab.

1. Read the real Chrome state:

```text
Computer Use -> get_app_state({ app: "Google Chrome" })
```

2. If the target Netflix URL is not selected, set the address bar value to the target URL and press `Return`.
3. Verify the state output shows:
   - Window title `Netflix`.
   - URL starts with `netflix.com/watch/...`.
   - Toolbar item `Shortcut Override` has site access.
   - Netflix `video` UI is visible.
4. Press each shortcut using real keyboard input:

```text
space
m
Right
Left
Up
Down
s
shift+period
shift+comma
shift+slash
f
f
space
```

5. After each key, inspect the returned screen/accessibility tree for the expected Netflix state or media hint.
6. Pause playback at the end unless the user wants it left playing.

## 8. Observed Run, 2026-05-18

Target URL:

```text
https://www.netflix.com/watch/...
```

Environment:

- Real `/Applications/Google Chrome.app`.
- Real Netflix watch page.
- Installed `Shortcut Override for Netflix` was the Chrome Web Store version, not the local `dist` unpacked build.
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

To live-test the patched local build, load or switch to the unpacked `dist` extension in the real Chrome profile first. Do not assume the Chrome Web Store extension uses local source changes.

## 9. Current Blocker Observed

On 2026-05-18, the Chrome health checks passed:

- Google Chrome was installed and running.
- Codex Chrome Extension was installed and enabled.
- Native messaging host manifest was correct.
- `browser.user.openTabs()` listed the real Netflix watch tab.

But control failed:

- `browser.user.claimTab()` timed out for the existing Netflix tab after 60 seconds.

This means discovery works, but the tab-control channel is blocked. Because the task is to test real Netflix behavior, do not replace this with Playwright, fake Netflix pages, or another browser path.

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
npm test
npm run lint
npm run build
```
