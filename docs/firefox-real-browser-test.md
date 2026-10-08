# Firefox Browser Smoke Test

Use this checklist to verify the Firefox-specific build locally. It covers Firefox Desktop only.

## Load the local build

1. Install dependencies with `npm ci`.
2. Run `npm run build:firefox`.
3. In Firefox, open `about:debugging#/runtime/this-firefox`.
4. Choose "Load Temporary Add-on…".
5. Select `dist/firefox/manifest.json`. After rebuilding, reload the temporary add-on and the Netflix tab before testing again.
6. Verify Netflix website access is granted so the ordinary shortcuts can run. For subtitle access, use the Subtitle navigation master in Options; it requests Netflix and optional `nflxvideo.net` access from that click. Manual recovery remains available in `about:addons` → Shortcut Override for Netflix → Permissions and Data for Netflix and `nflxvideo.net`.

The generated `dist/firefox` directory is disposable. The Chromium build remains in `dist/chromium`.

## Netflix smoke test

Open a Netflix watch page and check with Subtitle navigation off for the ordinary shortcuts (otherwise its default `S` takes priority over Skip Intro):

- The extension loads without a manifest or background-script error.
- The configured shortcuts work for play/pause, seeking, volume, mute, Netflix subtitles, fullscreen, skip intro, and playback speed.
- Holding the configured Play / Pause shortcut temporarily applies hold speed, and `Shift+"` applies the configured preferred speed directly.
- Press `C` twice and confirm Netflix's native subtitles turn off and then restore the previously selected track when it remains available.
- The popup reports the Netflix page status and shows the configured shortcuts.
- The options page can edit, enable, disable, and reset shortcuts.
- The Picture-in-Picture row is visible but disabled and marked unsupported.
- Run the [disabled-key reuse and conflict popover checklist](chrome-real-browser-test.md#disabled-key-reuse-and-conflict-popover) in both shortcut tables. Unsupported Picture-in-Picture must not block key reuse. Verify cancellation, focus return, editing, transfer, and single-row reset before restoring original settings.
- Press `Shift+P`; Firefox receives the shortcut without an extension hint or intercepted action.

## Subtitle navigation smoke test

Check the popup's separate read-only subtitle summary: it is collapsed with Not enabled while either master is off, and shows all four configured keys and disabled row states while both are on. Enabled subtitle rows replace overlapping ordinary key displays with Subtitle priority; the tooltip identifies the subtitle action. Check the default S/Skip Intro overlap, a custom modified key, and release after disabling its subtitle row. The popup must not request website access or offer subtitle editing/reset controls.

This checklist does not establish a completed Firefox run. Record the Firefox version, extension version, loaded `dist/firefox` build, selected subtitle language, and pass/fail/unverified status.

1. With a fresh installation, confirm Netflix is the only required host and `nflxvideo.net` is optional. With fresh settings, confirm Subtitle navigation is off by default and ordinary shortcuts work without CDN access. Enable the global shortcut override and its separate subtitle master, then select a Netflix subtitle language. Missing host access must display Firefox's permission prompt from that click for Netflix and `nflxvideo.net`, without `nflximg.net` or `nflxext.com`. Deny it once: the master stays off, its settings remain unchanged, and localized retry guidance appears. Retry and allow access: the master turns on and the guidance clears. With access already granted, toggling off and on must need no additional approval. Do not revoke existing permissions solely for a test without arranging restoration with the user.
2. Press A/D and confirm movement to the previous/next subtitle start, preserving playing and paused states. Press S and confirm a single replay that starts playback; W must toggle immediately without hold speed.
3. Confirm A/D/S complete instead of reporting that the subtitle connection is unavailable. Firefox must retrieve metadata through the background's MAIN-world execution path even when its page bridge is absent. Same-world DOM tests are not sufficient evidence of this item; reload both the add-on and Netflix tab after updating the build.
4. For uncached timings, verify the loading text and spinner are shown only while delivery is pending. A rotation takes about 1.6 seconds, and reduced-motion preferences suppress it. Cached navigation, success, and boundaries have no subtitle navigation hint. If delivery completes too quickly to observe, record the loading-duration check as unverified.
5. Verify a localized failure hint remains for about five seconds and retry is possible. Reports must not include signed subtitle URLs, cookies, or subtitle content.
   With subtitle host access disabled, an uncached A/D/S request must show `CAPTION_PERMISSION_REQUIRED`, stop its loading indicator, and send no CDN request. Turn the subtitle master off and on to request access, then retry the shortcut without changing the subtitle language. `CAPTION_NETWORK` indicates a request failure after access was checked; inspect connectivity or blocking rather than repeatedly reloading the add-on.
6. Disable the replay row or subtitle master and confirm S is released to the ordinary Skip Intro action when its button is visible. Test editing and both row/section resets.
7. Turn the global override off and confirm subtitle controls are disabled, its help tooltip remains available, and configured keys and row/master states are retained when turning it on again. Restore any changed settings afterward.
8. During a pending subtitle action, toggle playback or disable its row. A late response must not seek or resume playback; re-enabling the row must not revive that request.

Document Picture-in-Picture remains unsupported in Firefox; the PiP-close cancellation scenario belongs to the [Chrome regression checklist](chrome-real-browser-test.md#11-subtitle-navigation-regression-checks).

### Local permission-flow check, 2026-10-04

This historical check predates the reduction to required Netflix access and optional `nflxvideo.net` access; it does not verify the current permission declaration.

Firefox Desktop 156.0.1, extension 0.6.2, temporarily loaded from this checkout's `dist/firefox`. Reloaded the add-on after building the options bundle `options-C3PcCKoi.js`. The Permissions and Data page showed all four declared host permissions already enabled. In the newly opened Options page, turning the subtitle master off disabled its row switches; turning it back on succeeded without a permission prompt or error. The original enabled state and row settings were restored. The denied/missing-access prompt was not tested live because existing permissions were retained; denial, retry, request failure, pending approval, and stale-response behavior have automated regression coverage. This check does not constitute a complete Netflix navigation smoke test.

### Local popup summary check, 2026-10-04

Firefox Desktop 157.0, extension 0.6.2, confirmed in `about:debugging` as loaded from this checkout's `dist/firefox`. Reloaded the add-on after building `popup-CtZCv2ED.js` and opened the actual toolbar popup on a Netflix watch tab. The accessibility tree showed the four saved A/D/S/W subtitle bindings and a Subtitle priority status for Skip Intro, identifying Replay current subtitle. Turning the global override off collapsed the subtitle summary to Not enabled and restored the ordinary S display; turning it on restored the summary and precedence status. Restored the original enabled state and dismissed the popup. Custom bindings, disabled rows, and modifier-sensitive precedence have component regression coverage; this check does not establish pixel-level layout acceptance, Chrome popup acceptance, or Netflix seek behavior.

## Release smoke test

Download `shortcut-override-for-netflix-firefox-<version>.zip` from the GitHub Release. Load the ZIP through `about:debugging#/runtime/this-firefox`, repeat the Netflix checklist, and confirm it is removed after restarting Firefox because the package is temporarily loaded.

For AMO validation, manually upload that same Firefox ZIP as the add-on package and upload `shortcut-override-for-netflix-source-<version>.zip` when source code is requested. After Mozilla approves the listed release, install it from Firefox Add-ons, repeat the checklist, and confirm it remains enabled after restarting Firefox.

Confirm the Firefox manifest does not include `browser_specific_settings.gecko.update_url`. Firefox Add-ons owns signing and automatic updates for listed releases.
