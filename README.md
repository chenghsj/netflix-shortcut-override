# Shortcut Override for Netflix

[![CI](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml)
[![Release](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/release.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/chenghsj/netflix-shortcut-override?label=release)](https://github.com/chenghsj/netflix-shortcut-override/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

[![Chrome Web Store](docs/assets/chrome.svg)](https://chromewebstore.google.com/detail/shortcut-override-for-net/jebnhiecgnchnioahfagmnebdknddbom)
[![Microsoft Edge Add-ons](docs/assets/edge.svg)](https://microsoftedge.microsoft.com/addons/detail/shortcut-override-for-net/ddfnieehcebicbmnejlafjphppdjmdhi)
[![Firefox install](docs/assets/firefox.svg)](https://addons.mozilla.org/firefox/addon/70ea1dc7212746bd96bd/)

Customize Netflix playback shortcuts with a small unofficial browser extension.

This extension intercepts configured keyboard shortcuts in Netflix playback contexts—watch pages or pages with a visible player—and routes playback operations through Netflix's player API where needed. It is designed for users who want predictable shortcuts without relying on Netflix's default key handling or visible UI focus state.

This project is not affiliated with, endorsed by, or sponsored by Netflix.

## Features

- Override Netflix shortcuts in active playback contexts.
- Use the toolbar popup to check page status, toggle shortcut handling, review keys, and open options.
- Diagnose content-script, video, Netflix player API, page bridge, and Picture-in-Picture compatibility from a discreet toolbar-popup dialog.
- Show an inline recovery notice when an updated extension has not connected to the open Netflix tab.
- Reload the Netflix tab from the recovery notice, close the popup, and return keyboard focus to the page.
- Restore keyboard focus to the same still-visible Netflix playback context after the toolbar popup is dismissed, including when the popup was opened before a reload finished.
- Keep compatibility in the checking state while Netflix is loading, discard stale results, and recheck automatically after loading finishes.
- Retry compatibility diagnostics automatically while the dialog is open and playback state is unresolved, then stop after reaching a stable result or detecting that the tab must be reloaded.
- Copy a privacy-safe compatibility report that excludes the active Netflix URL.
- Edit every shortcut from the options page.
- Enable or disable each shortcut independently.
- Reuse disabled keys and resolve conflicts in a popover before enabling or resetting a shortcut.
- Reset shortcut bindings without resetting global or speed settings.
- Show compact media hints for shortcut actions.
- Follow the browser UI language automatically when supported, or choose the options UI language manually.
- Rewind and fast-forward by a configurable interval.
- Configure the rewind and fast-forward interval.
- Control play/pause, volume, mute, Netflix subtitles, fullscreen, skip intro, and playback speed.
- Enable optional subtitle navigation with configurable previous, next, replay, and play/pause keys.
- Toggle a Document Picture-in-Picture player with Netflix subtitle mirroring on Chrome and Edge Chromium.
- Use the same configurable shortcut to enter or exit Picture-in-Picture on supported Chromium browsers.
- When Netflix automatically advances to the next episode, close Picture-in-Picture and leave the next episode's playback state to Netflix and the profile's autoplay setting.
- Firefox supports the shortcut, popup, and options features; the subtitle-preserving Picture-in-Picture setting is disabled because Firefox is not supported.
- In Chromium's subtitle-mirrored Picture-in-Picture window, the first primary click immediately plays or pauses the video while allowing the browser to focus the window.
- Use the PiP overlay for timeline seeking, playback transport, volume, mute, and subtitle appearance settings; it hides after three seconds of pointer idle.
- In Chromium's subtitle-mirrored Picture-in-Picture window, enabled shortcuts use their configured keys for supported actions; fullscreen remains available only on the Netflix page.
- Hold the configured Play / Pause shortcut to temporarily switch to a configurable playback speed, then restore on release.
- Export complete settings backups and review them before confirming an import; malformed, incomplete, or newer-version backups are rejected before replacement.
- Persist settings with `chrome.storage.sync`.
- Build as a Manifest V3 browser extension.

## Default Shortcuts

| Action | Default key |
| --- | --- |
| Play / Pause | `Space` |
| Rewind | `Left` |
| Forward | `Right` |
| Volume up | `Up` |
| Volume down | `Down` |
| Mute | `M` |
| Toggle Netflix subtitles | `C` |
| Fullscreen | `F` |
| Picture-in-Picture | `Shift + P` |
| Skip intro | `S` |
| Increase playback speed | `Shift + .` |
| Decrease playback speed | `Shift + ,` |
| Set preferred playback speed | `Shift + "` |
| Reset playback speed | `Shift + /` |

Press `C` to turn Netflix's native subtitles off or on. The extension restores the previously selected subtitle track when it remains available; otherwise, it selects the first available subtitle track. In the extension-managed PiP window, the shortcut and subtitle switch stay synchronized.

The configured Play / Pause shortcut has two behaviors when hold speed is enabled:

- Tap the key to play or pause.
- Hold it for roughly 250 ms to temporarily switch to the configured hold speed. The default hold speed is `2x`.

## Subtitle Navigation

Subtitle navigation is **off by default**. In Options, turn on **Enable shortcut override** and the **Subtitle navigation** master switch, allow Netflix subtitle website access if the browser asks, then select a Netflix subtitle track. If access is already granted, the switch enables without another permission prompt. Denying access leaves it off; turn the switch on again to retry.

| Action | Default key | Behavior |
| --- | --- | --- |
| Previous subtitle | `A` | Jump to the preceding subtitle start. |
| Next subtitle | `D` | Jump to the next subtitle start. |
| Replay current subtitle | `S` | Seek to the most recently started subtitle and begin playback once; it does not loop or stop automatically at the subtitle end. Before the first subtitle, replay starts at the first subtitle. |
| Play / Pause | `W` | Toggle playback immediately, without hold-speed behavior. |

A/D preserve the current playing or paused state. These keys can also be used in the extension-managed PiP window on Chrome and Edge. Enabled subtitle navigation keys take priority over ordinary shortcuts: by default, `S` replays a subtitle instead of skipping the intro while subtitle navigation is enabled. Disabling its row or master switch releases that key to the ordinary shortcuts. Typing fields are excluded. The ordinary Play / Pause shortcut keeps its existing tap/hold behavior.

The section has the same Function / Key / Enabled / Actions columns as the ordinary shortcut table. Each row supports enabling, key editing, and reset. The section **Reset** restores all four default bindings and row enabled states, preserving its master switch and other settings; the ordinary shortcut section's Reset does not reset subtitle navigation. The title's help tooltip explains the feature and its dependency on the global switch.

Turning off the global shortcut override disables the subtitle navigation controls without clearing their values. Turning it back on restores access to those saved values. When only the subtitle navigation master is off, key editing and reset remain available, while the row switches are disabled.

Within either shortcut table, individually disabled rows keep their saved keys but allow other rows to reuse them. Enabled rows reserve their keys within that table even while a master switch is off. Enabling or resetting a row whose key is already reserved opens a popover without changing settings: choose **Change key** to record a different key and enable the row, or **Use for [action]** to disable the current owner and transfer the key. Clicking outside or pressing Escape cancels; cancelling the key editor also leaves settings unchanged. Ordinary and subtitle shortcuts remain separate groups, with subtitle navigation taking priority during playback.

The popup has a separate, read-only Subtitle navigation summary. It shows the four configured keys and individual disabled states while both master switches are on; otherwise it shows only the title and **Not enabled**. Ordinary shortcuts whose configured keys are claimed by enabled subtitle navigation rows display **Subtitle priority**, with the overriding action in their tooltip. Key editing, resets, and website authorization remain in Options.

Subtitle timings are loaded on demand and cached in memory for the selected video/player session/track. During a download, a compact text hint and spinner remain visible until loading completes, fails, or the operation is cancelled. The spinner takes 1.6 seconds per revolution and respects reduced-motion preferences. Cache hits, successful jumps, and subtitle boundaries show no navigation hint. Failures use the volume-value text hint style for five seconds; `W` keeps the play/pause icon hint.

Playback toggles, disabling the pending action, and closing its PiP window cancel pending navigation. Re-enabling a disabled action does not revive the cancelled request. A late response cannot seek or start playback after cancellation.

This feature uses undocumented Netflix subtitle metadata and HTTPS subtitle delivery documents, so availability can vary by Netflix player build or selected track. It uses the currently selected track without changing its language. See [Permissions](#permissions) and [Privacy](#privacy) for subtitle CDN access.

## Speed Settings

The options page exposes these playback speed settings:

| Setting | Default | Range |
| --- | ---: | --- |
| Lowest speed | `0.25x` | `0.25x` to `1.0x` |
| Highest speed | `3x` | `1.0x` to `4.0x` |
| Speed change | `0.25x` | `0.05x` to `4.0x` |
| Preferred speed | `1.5x` | `0.25x` to `4.0x` |
| Play / Pause hold speed | `2x` | `0.25x` to `4.0x`; follows the configured Play / Pause shortcut |

Values are normalized to `0.05x` increments.

## Seek Settings

The options page and popup expose the configurable seek interval:

| Setting | Default | Range |
| --- | ---: | --- |
| Seconds per seek | `10s` | `1s` to `60s` |

## Supported Languages

The options UI currently includes:

- English
- Traditional Chinese (`zh-TW`)
- Simplified Chinese (`zh-CN`)
- Japanese
- Korean

## Requirements

- Node.js 22 or newer. CI uses Node.js 24.
- npm
- Google Chrome, Microsoft Edge, or Firefox Desktop.
- Chrome or Edge Chromium is required for the subtitle-preserving Document Picture-in-Picture feature; Firefox displays it as unsupported.

## Install From Release

Use this path if you just want to install the extension without building it from source.

### Chrome or Edge Chromium

1. Download the latest Chromium zip from the [GitHub Releases page](https://github.com/chenghsj/netflix-shortcut-override/releases/latest).

2. Extract the zip file.

3. Open Chrome Extension Manager:

   ```text
   chrome://extensions
   ```

4. Enable Developer mode.

5. Click "Load unpacked".

6. Select the extracted folder that contains `manifest.json`.

7. Open the extension options page and configure shortcuts.

### Firefox Desktop

For local use, download the Firefox zip from the [GitHub Releases page](https://github.com/chenghsj/netflix-shortcut-override/releases/latest). Open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on…", and select the downloaded zip. Firefox removes a temporary add-on after the browser restarts.

For persistent installation and automatic updates, install the [Mozilla-signed version from Firefox Add-ons](https://addons.mozilla.org/firefox/addon/70ea1dc7212746bd96bd/). The Firefox Picture-in-Picture setting is disabled and marked unsupported; `Shift+P` passes through without being intercepted.

## Install From Source

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Build the extension:

   ```sh
   npm run build
   ```

3. Open Chrome Extension Manager:

   ```text
   chrome://extensions
   ```

4. Enable Developer mode.

5. Click "Load unpacked".

6. Select the generated `dist/chromium` directory in this repository.

7. Open the extension options page and configure shortcuts.

Do not load the repository root. Chrome should load `dist/chromium`.

To test Firefox locally, build both browser-specific directories:

```sh
npm run build
```

Then open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on…", and select `dist/firefox/manifest.json`. See [the Firefox browser test guide](docs/firefox-real-browser-test.md) for the smoke-test checklist.

## Development

Install dependencies once:

```sh
npm ci
```

Use the default development command when working on the extension loaded in Chrome:

```sh
npm run dev
```

This starts the CRXJS/Vite development server with HMR.

Keep this terminal running while testing the unpacked extension. If the dev server stops, Chrome can show the CRXJS dev loading page for extension pages.

Reload the extension in `chrome://extensions` after changes that affect the manifest, service worker startup, or content script registration. UI-only changes should usually update through CRXJS HMR.

The default `npm run build` command creates both browser-specific outputs under `dist`. Load `dist/firefox/manifest.json` as a temporary add-on from `about:debugging`. Firefox uses the same source code and settings; the Picture-in-Picture shortcut is disabled and passes through.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the CRXJS/Vite dev server with HMR. |
| `npm run build` | Clear `dist`, type-check, build both browser outputs, and verify background entry points. |
| `npm run build:chromium` | Build the Chromium extension in `dist/chromium`. |
| `npm run build:firefox` | Build the Firefox extension in `dist/firefox`. |
| `npm run verify:build` | Verify both generated background loaders point to the background bundle and contain its message handlers. |
| `npm run lint:firefox` | Run `web-ext lint` against `dist/firefox`. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run Vitest tests. |
| `npm run test:coverage` | Run the complete test suite with enforced coverage thresholds. |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg`. |
| `npm run changelog` | Generate release notes from git commits. |

## Project Structure

```text
.
|-- .github/workflows
|   |-- ci.yml
|   `-- release.yml
|-- public
|   `-- icons
|-- manifest.config.ts
|-- scripts
|   |-- generate-icons.mjs
|   |-- generate-release-notes.mjs
|   `-- verify-build.mjs
|-- src
|   |-- background
|   |   |-- index.ts
|   |   `-- service-worker.ts
|   |-- components
|   |-- content
|   |-- lib
|   |-- options
|   |-- popup
|   `-- shared
|-- popup.html
|-- options.html
`-- vite.config.ts
```

Key areas:

- `CONTEXT.md`: canonical domain terminology for playback, compatibility, and PiP behavior.
- `docs/behavior-spec.md`: observable product requirements and recovery policies.
- `src/content/index.ts`: keyboard interception and routing between the shortcut, PiP, and hint domains.
- `src/content/shortcuts/`: media command handling and Play / Pause hold interaction state.
- `src/content/hints/`: hint overlay rendering, layout, icons, and timing.
- `src/content/pip/`: Document Picture-in-Picture lifecycle, subtitle mirroring, and PiP keyboard routing.
- `src/content/netflix-api-bridge.ts`: page-world bridge for Netflix player API access and selected subtitle metadata.
- `src/content/subtitle-practice.ts`: subtitle navigation, timing cache, loading feedback, and pending-action cancellation.
- `src/shared/netflix-caption-events.ts`: JSON string message protocol for caption metadata across browser worlds.
- `src/shared/netflix-subtitles.ts`: bounded Netflix timed-text normalization.
- `src/background/service-worker.ts`: distinct manifest entry point for the background bundle.
- `src/background/index.ts`: background-side Netflix API execution fallback, caption-fetch routing, and popup focus handoff coordination.
- `src/background/netflix-caption-fetch.ts`: allowlisted HTTPS caption downloads with size and timeout limits.
- `src/popup/popup-app.tsx`: toolbar popup for quick status, toggles, shortcut summary, and options entry.
- `src/options/options-app.tsx`: extension options UI.
- `src/shared/shortcut-bindings.ts`: shortcut actions, default key bindings, normalization, and conflict checks.
- `src/shared/shortcut-settings.ts`: default settings, validation, and settings normalization.
- `src/shared/playback-speed.ts`: playback-speed stepping and speed normalization helpers.
- `src/shared/i18n.ts`: localized options copy and media hint labels.

## How Shortcut Handling Works

Chrome content scripts normally run in an isolated world, while Netflix player internals live on the page. The extension uses two content scripts:

- a `MAIN` world bridge, loaded at `document_start`
- the main isolated content script, also loaded at `document_start`

The isolated content script handles keyboard events and sends bridge requests for Netflix-specific actions such as seeking. This keeps shortcut logic in the extension while still using Netflix's player API for behavior that native video APIs may not handle correctly on Netflix. Chromium caption metadata requests and responses use JSON string event details with message identity and payload validation. Firefox routes playback commands and caption metadata through the background's MAIN-world execution path instead of depending on the page bridge. The injected function contains its runtime dependencies so serialization does not lose imported helpers. Caption documents are then downloaded through the background worker.

## Permissions

The extension requests:

| Permission | Why it is needed |
| --- | --- |
| `storage` | Save ordinary and subtitle navigation shortcuts, language, playback speed, seek, and hold-speed settings. |
| `scripting` | Execute Netflix player API operations and restore focus to the visible playback context after the popup closes. |
| `activeTab` | Check the active Netflix tab, request local compatibility status, restore playback focus, and reload that tab when the user selects the recovery action. |
| `*://*.netflix.com/*` | Run content scripts on Netflix pages and retrieve selected subtitles delivered from Netflix hosts. |
| `https://*.nflxvideo.net/*`, `https://*.nflximg.net/*`, `https://*.nflxext.com/*` | Retrieve Netflix subtitle documents when subtitle navigation is requested. No content scripts run on these CDN hosts. |

Both builds request the existing Netflix and subtitle CDN host access when you turn on the Subtitle navigation master. The request runs directly from that click; the browser only prompts when approval is needed. The feature remains off while awaiting approval and after a denial or request failure. Turning it off does not revoke website access used by the extension.

Firefox may leave declared website access disabled, including on temporary add-ons. If permissions are later revoked, uncached subtitle downloads return `CAPTION_PERMISSION_REQUIRED` before sending a CDN request. Turn the subtitle master off and on to request access again. Manual recovery is also available in the browser's extension permissions; in Firefox, open `about:addons` → this extension → **Permissions and Data**. Approve access and retry the shortcut.

## Privacy

- No remote analytics or tracking code is included.
- Subtitle navigation retrieves the selected subtitle document from Netflix delivery hosts. No analytics or third-party processing service receives subtitle data.
- Shortcut, enabled state, language, theme, playback speed, seek, hold-speed, subtitle navigation, and PiP subtitle settings are stored with `chrome.storage.sync`.
- A pending popup focus handoff is stored temporarily in `chrome.storage.session` for at most 30 seconds. It contains only tab/window identifiers, an opaque request identifier, and a deadline.
- Subtitle documents are parsed locally; the navigation timing cache remains in content-script memory and is not saved to sync storage. Requests may include browser-managed cookies for the Netflix delivery host.
- Content scripts only run on pages matching `*://*.netflix.com/*`.
- The toolbar popup checks the active tab only after it is opened. It uses that tab to show page status, request locally generated compatibility diagnostics, restore keyboard focus to a still-visible playback context after dismissal, and reload the Netflix page only when the user selects the recovery action.
- Compatibility diagnostics stay on the device. A report is written to the clipboard only when the user selects Copy diagnostics.
- See the full privacy policy in [PRIVACY.md](PRIVACY.md).

## Testing

Run all local checks:

```sh
npm run lint
npm run test:coverage
npm run build
```

The coverage check enforces minimum global thresholds of 80% statements, 65% branches,
80% functions, and 85% lines. The test suite covers shortcut normalization, options behavior,
content shortcut handling, Netflix API bridge and background execution behavior, compatibility
readiness, subtitle navigation and its JSON bridge, pending-action cancellation, PiP controls and subtitle mirroring, video handoff, and episode-transition recovery.

The real-Chrome regression flow, including the reload-in-progress popup case, is documented in [docs/chrome-real-browser-test.md](docs/chrome-real-browser-test.md). The Firefox smoke-test flow is documented in [docs/firefox-real-browser-test.md](docs/firefox-real-browser-test.md).

## Release

Releases are driven by `.github/workflows/release.yml`.

The extension version comes from `package.json`. For example, if it is `0.1.0`, the
release tag must be:

```text
v0.1.0
```

To release from git:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The release workflow will:

1. Install dependencies.
2. Validate that the tag matches `package.json`.
3. Run lint and tests with coverage thresholds.
4. Build the extension.
5. Lint the Firefox build.
6. Generate release notes.
7. Package Chromium, Firefox, and source ZIPs.
8. Generate one `SHA256SUMS` file for all three ZIPs.
9. Publish or update the GitHub Release with all browser packages.

The generated release assets are:

- `shortcut-override-for-netflix-chromium-<version>.zip`
- `shortcut-override-for-netflix-firefox-<version>.zip`
- `shortcut-override-for-netflix-source-<version>.zip`
- `SHA256SUMS`

Place `SHA256SUMS` beside the three downloaded ZIP files, then verify them with
`sha256sum -c SHA256SUMS` on Linux or `shasum -a 256 -c SHA256SUMS` on macOS.

No AMO credentials are required by the release workflow. To publish Firefox manually:

1. Download the Firefox and source ZIPs from the GitHub Release.
2. In the AMO Developer Hub, upload the Firefox ZIP as a new version.
3. Upload the matching source ZIP when AMO requests source code.
4. Complete validation and submit the version for review.

AMO requires every submitted version number to be new. A GitHub Release can replace an existing asset, but an AMO version such as `0.4.2` cannot be uploaded again; increment the extension version first.

## Changelog

Release notes are generated from commits since the previous `v*` tag.

Preview release notes locally:

```sh
npm run changelog -- --tag v0.1.0 --output release-notes.md
```

Commit messages that follow Conventional Commits are grouped into sections such as Features, Fixes, Build and CI, and Maintenance. Other commit messages are placed under Changes.

## Known Limitations

- Shortcuts only run in Netflix playback contexts: watch pages or pages with a visible Netflix player.
- Shortcut handling is skipped while typing in inputs, textareas, or editable content.
- Skip intro only works when Netflix renders a visible skip intro button.
- Seeking and subtitle toggling use Netflix's internal player API. If Netflix changes that API, these actions may need an extension update.
- Browser extension pages and content scripts may need a manual reload after manifest, service worker, or content script changes.

## Bug Reports

GitHub's bug-report form asks for:

- Browser name and version.
- Extension version.
- The Netflix page type where the issue happened.
- The shortcut or action that failed.
- Compatibility diagnostics copied from the toolbar popup when available, or a note that the popup reported the extension was not active.
- Any console errors from the Netflix tab or extension service worker.

## Troubleshooting

### Options page shows "CRXJS DEV MODE"

This means Chrome is using a CRXJS dev build and the Vite dev server is not reachable.

Start the dev server and keep it running:

```sh
npm run dev
```

Then reload the extension in:

```text
chrome://extensions
```

If you want a non-dev-server build, stop any running Vite dev server for this project and run:

```sh
npm run build
```

Then reload the unpacked extension again.

### Changes do not appear in Chrome

During `npm run dev`, CRXJS HMR should update UI code while the dev server is running. Some extension changes still require a manual reload.

1. Confirm Chrome loaded the `dist/chromium` folder for a production build, or `dist` while using `npm run dev`.
2. Confirm `npm run dev` is still running.
3. Click reload for the extension in `chrome://extensions` if the change touches the manifest, service worker, or content script registration.
4. Refresh any open Netflix watch tabs.

### Icon changes do not appear

Regenerate icons and rebuild:

```sh
npm run icons
npm run build
```

Then reload the extension. Chrome may cache toolbar icons, so opening a new Chrome window can help confirm the current icon.

### Rewind or forward does not work

The extension uses Netflix's player API for seeking. If Netflix changes its internal player API, seeking may fail until the bridge is updated.

Check the browser console for shortcut bridge errors and run:

```sh
npm test
```

### Shortcut does not trigger

Check the options page:

1. Make sure shortcut override is enabled.
2. Make sure the specific action is enabled.
3. Check whether another action already uses the same key.
4. Open the toolbar popup in the Netflix playback context.
5. If the popup shows that the extension is not active, select Reload Netflix. The popup closes after starting the reload so keyboard focus returns to Netflix.
6. If the compatibility button is available, open it and confirm the required playback features are ready.

If Netflix is still loading, compatibility remains in the checking state. After ten seconds the popup explains that it will recheck automatically; wait for loading to finish instead of reloading again.

## Packaging For Manual Distribution

Build first:

```sh
npm run build
```

Create a zip from the contents of `dist/chromium`:

```sh
(cd dist/chromium && zip -r ../../shortcut-override-for-netflix.zip .)
```

The zip root should contain `manifest.json`, not nested `dist/chromium` folders.

The same Chromium ZIP is used for Chrome Web Store and Microsoft Edge Partner Center.
The production manifest omits `key`, and the shared `short_name` already satisfies Edge
validation. The release workflow also creates the Firefox, source, and checksum assets.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
