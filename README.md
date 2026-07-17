# Shortcut Override for Netflix

[![CI](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml)
[![Release](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/release.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/chenghsj/netflix-shortcut-override?label=release)](https://github.com/chenghsj/netflix-shortcut-override/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Install-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/shortcut-override-for-net/jebnhiecgnchnioahfagmnebdknddbom)
[![Microsoft Edge Add-ons](https://img.shields.io/badge/Edge-Install-0078D7?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyByb2xlPSJpbWciIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU%2BTWljcm9zb2Z0IEVkZ2U8L3RpdGxlPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNMjEuODYgMTcuODZxLjE0IDAgLjI1LjEyLjEuMTMuMS4yNXQtLjExLjMzbC0uMzIuNDYtLjQzLjUzLS40NC41cS0uMjEuMjUtLjM4LjQybC0uMjIuMjNxLS41OC41My0xLjM0IDEuMDQtLjc2LjUxLTEuNi45MS0uODYuNC0xLjc0LjY0dC0xLjY3LjI0cS0uOSAwLTEuNjktLjI4LS44LS4yOC0xLjQ4LS43OC0uNjgtLjUtMS4yMi0xLjE3LS41My0uNjYtLjkyLTEuNDQtLjM4LS43Ny0uNTgtMS42LS4yLS44My0uMi0xLjY3IDAtMSAuMzItMS45Ni4zMy0uOTcuODctMS44LjE0Ljk1LjU1IDEuNzcuNDEuODIgMS4wMiAxLjUuNi42OCAxLjM4IDEuMjEuNzguNTQgMS42NC45Ljg2LjM2IDEuNzcuNTYuOTIuMiAxLjguMiAxLjEyIDAgMi4xOC0uMjQgMS4wNi0uMjMgMi4wNi0uNzJsLjItLjEuMi0uMDV6bS0xNS41LTEuMjdxMCAxLjEuMjcgMi4xNS4yNyAxLjA2Ljc4IDIuMDMuNTEuOTYgMS4yNCAxLjc3Ljc0LjgyIDEuNjYgMS40LTEuNDctLjItMi44LS43NC0xLjMzLS41NS0yLjQ4LTEuMzctMS4xNS0uODMtMi4wOC0xLjktLjkyLTEuMDctMS41OC0yLjMzVC4zNiAxNC45NFEwIDEzLjU0IDAgMTIuMDZxMC0uODEuMzItMS40OS4zMS0uNjguODMtMS4yMy41My0uNTUgMS4yLS45Ni42Ni0uNCAxLjM1LS42Ni43NC0uMjcgMS41LS4zOS43OC0uMTIgMS41NS0uMTIuNyAwIDEuNDIuMS43Mi4xMiAxLjQuMzUuNjguMjMgMS4zMi41Ny42My4zNSAxLjE2LjgzLS4zNSAwLS43LjA3LS4zMy4wNy0uNjUuMjN2LS4wMnEtLjYzLjI4LTEuMi43NC0uNTcuNDYtMS4wNSAxLjA0LS40OC41OC0uODcgMS4yNi0uMzguNjctLjY1IDEuMzktLjI3LjcxLS40MiAxLjQ0LS4xNS43Mi0uMTUgMS4zOHpNMTEuOTYuMDZxMS43IDAgMy4zMy4zOSAxLjYzLjM4IDMuMDcgMS4xNSAxLjQzLjc3IDIuNjIgMS45MyAxLjE4IDEuMTYgMS45OCAyLjcuNDkuOTQuNzYgMS45Ni4yOCAxIC4yOCAyLjA4IDAgLjg5LS4yMyAxLjctLjI0LjgtLjY5IDEuNDgtLjQ1LjY4LTEuMSAxLjIyLS42NC41My0xLjQ1Ljg4LS41NC4yNC0xLjExLjM2LS41OC4xMy0xLjE2LjEzLS40MiAwLS45Ny0uMDMtLjU0LS4wMy0xLjEtLjEyLS41NS0uMS0xLjA1LS4yOC0uNS0uMTktLjg0LS41LS4xMi0uMDktLjIzLS4yNC0uMS0uMTYtLjEtLjMzIDAtLjE1LjE2LS4zNS4xNi0uMi4zNS0uNS4yLS4yOC4zNi0uNjguMTYtLjQuMTYtLjk1IDAtMS4wNi0uNC0xLjk2LS40LS45MS0xLjA2LTEuNjQtLjY2LS43NC0xLjUyLTEuMjgtLjg2LS41NS0xLjc5LS44OS0uODQtLjMtMS43Mi0uNDQtLjg3LS4xNC0xLjc2LS4xNC0xLjU1IDAtMy4wNi40NVQuOTQgNy41NXEuNzEtMS43NCAxLjgxLTMuMTMgMS4xLTEuMzggMi41Mi0yLjM1UTYuNjggMS4xIDguMzcuNThxMS43LS41MiAzLjU4LS41MloiLz48L3N2Zz4%3D)](https://microsoftedge.microsoft.com/addons/detail/shortcut-override-for-net/ddfnieehcebicbmnejlafjphppdjmdhi)

Customize Netflix playback shortcuts with a small unofficial browser extension.

This extension intercepts configured keyboard shortcuts on Netflix watch pages and routes playback operations through Netflix's player API where needed. It is designed for users who want predictable shortcuts without relying on Netflix's default key handling or visible UI focus state.

This project is not affiliated with, endorsed by, or sponsored by Netflix.

## Features

- Override Netflix playback shortcuts on watch pages.
- Use the toolbar popup to check page status, toggle shortcut handling, review keys, and open options.
- Edit every shortcut from the options page.
- Enable or disable each shortcut independently.
- Reset shortcut bindings without resetting global or speed settings.
- Show compact media hints for shortcut actions.
- Choose the options UI language.
- Rewind and fast-forward by a configurable interval.
- Configure the rewind and fast-forward interval.
- Control play/pause, volume, mute, fullscreen, skip intro, and playback speed.
- Toggle a Document Picture-in-Picture player with Netflix subtitle mirroring.
- Use the same configurable shortcut to enter or exit Picture-in-Picture.
- The first click focuses the Picture-in-Picture window; later clicks play or pause the video.
- In subtitle-mirrored Picture-in-Picture, Space is handled by the extension because Netflix cannot receive the focused window's native key event.
- Hold Space to temporarily switch to a configurable playback speed, then restore on release.
- Persist settings with `chrome.storage`.
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
| Fullscreen | `F` |
| Picture-in-Picture | `Shift + P` |
| Skip intro | `S` |
| Increase playback speed | `Shift + .` |
| Decrease playback speed | `Shift + ,` |
| Reset playback speed | `Shift + /` |

Space has two behaviors:

- Tap `Space` to play or pause.
- Hold `Space` for roughly 250 ms to temporarily switch to the configured hold speed. The default hold speed is `2x`.

## Speed Settings

The options page exposes these playback speed settings:

| Setting | Default | Range |
| --- | ---: | --- |
| Lowest speed | `0.25x` | `0.25x` to `1.0x` |
| Highest speed | `3x` | `1.0x` to `4.0x` |
| Speed change | `0.25x` | `0.05x` to `4.0x` |
| Space hold speed | `2x` | `0.25x` to `4.0x`; while enabled, the extension handles both Space tap and hold |

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
- Google Chrome or a Chromium-based browser that supports Manifest V3 extensions.
- Chrome or Edge Chromium is required for the subtitle-preserving Document Picture-in-Picture feature.

## Install From Release

Use this path if you just want to install the extension without building it from source.

1. Download the latest release zip from the [GitHub Releases page](https://github.com/chenghsj/netflix-shortcut-override/releases/latest).

2. Extract the zip file.

3. Open Chrome Extension Manager:

   ```text
   chrome://extensions
   ```

4. Enable Developer mode.

5. Click "Load unpacked".

6. Select the extracted folder that contains `manifest.json`.

7. Open the extension options page and configure shortcuts.

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

6. Select the generated `dist` directory in this repository.

7. Open the extension options page and configure shortcuts.

Do not load the repository root. Chrome should load `dist`.

## Development

Install dependencies once:

```sh
npm ci
```

Use the default development command when working on the extension loaded in Chrome:

```sh
npm run dev
```

This matches the CRXJS development flow: it removes the old `dist` directory and starts the CRXJS/Vite dev server with HMR.

Keep this terminal running while testing the unpacked extension. If the dev server stops, Chrome can show the CRXJS dev loading page for extension pages.

Reload the extension in `chrome://extensions` after changes that affect the manifest, service worker startup, or content script registration. UI-only changes should usually update through CRXJS HMR.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Remove `dist` and start the CRXJS/Vite dev server with HMR. |
| `npm run build` | Type-check, build, and patch the production extension output. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run Vitest tests. |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg`. |
| `npm run changelog` | Generate release notes from git commits. |

## Project Structure

```text
.
|-- .github/workflows
|   |-- ci.yml
|   `-- release.yml
|-- public
|   |-- favicon.svg
|   `-- icons
|-- scripts
|   |-- fix-extension-build.mjs
|   |-- generate-icons.mjs
|   `-- generate-release-notes.mjs
|-- src
|   |-- background
|   |-- components
|   |-- content
|   |-- options
|   `-- shared
|-- manifest.json
|-- popup.html
|-- options.html
`-- vite.config.ts
```

Key areas:

- `src/content/index.ts`: keyboard interception and routing between the shortcut, PiP, and hint domains.
- `src/content/shortcuts/`: media command handling and Space hold interaction state.
- `src/content/hints/`: hint overlay rendering, layout, icons, and timing.
- `src/content/pip/`: Document Picture-in-Picture lifecycle, subtitle mirroring, and PiP keyboard routing.
- `src/content/netflix-api-bridge.ts`: page-world bridge for Netflix player API access.
- `src/background/index.ts`: background-side Netflix API execution fallback.
- `src/popup/popup-app.tsx`: toolbar popup for quick status, toggles, shortcut summary, and options entry.
- `src/options/options-app.tsx`: extension options UI.
- `src/shared/shortcuts.ts`: shortcut defaults, normalization, conflict checks, and speed helpers.
- `src/shared/i18n.ts`: localized options copy and media hint labels.
- `scripts/fix-extension-build.mjs`: patches and validates the CRXJS production build output.

## How Shortcut Handling Works

Chrome content scripts normally run in an isolated world, while Netflix player internals live on the page. The extension uses two content scripts:

- a `MAIN` world bridge, loaded at `document_start`
- the main isolated content script, also loaded at `document_start`

The isolated content script handles keyboard events and sends bridge requests for Netflix-specific actions such as seeking. This keeps shortcut logic in the extension while still using Netflix's player API for behavior that native video APIs may not handle correctly on Netflix.

## Permissions

The extension requests:

| Permission | Why it is needed |
| --- | --- |
| `storage` | Save shortcut, language, playback speed, seek, and Space-hold settings. |
| `scripting` | Execute Netflix player API operations from the extension context. |
| `activeTab` | Read the active tab URL after the toolbar popup is opened so the popup can show page status. |
| `*://*.netflix.com/*` | Run the extension only on Netflix pages. |

## Privacy

- No remote analytics or tracking code is included.
- No external API calls are made by the extension.
- Shortcut, language, playback speed, seek, and Space-hold settings are stored with `chrome.storage`.
- Content scripts only run on pages matching `*://*.netflix.com/*`.
- The toolbar popup reads the active tab URL only after the popup is opened, and only to show page status.
- See the full privacy policy in [PRIVACY.md](PRIVACY.md).

## Testing

Run all local checks:

```sh
npm run lint
npm test
npm run build
```

The test suite covers shortcut normalization, options behavior, content shortcut handling, Netflix API bridge behavior, and background execution behavior.

## Release

Releases are driven by `.github/workflows/release.yml`.

The release version comes from `manifest.json`, not from `package.json`. For example, if the manifest version is `0.1.0`, the release tag must be:

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
2. Validate that the tag matches `manifest.json`.
3. Run lint and tests.
4. Build the extension.
5. Generate release notes.
6. Package `dist` as a zip file.
7. Package the Microsoft Edge-specific zip file.
8. Publish or update the GitHub Release.

The generated release assets are:

- `shortcut-override-for-netflix-<version>.zip`
- `shortcut-override-for-netflix-<version>.zip.sha256`
- `shortcut-override-for-netflix-edge-<version>.zip`
- `shortcut-override-for-netflix-edge-<version>.zip.sha256`

## Changelog

Release notes are generated from commits since the previous `v*` tag.

Preview release notes locally:

```sh
npm run changelog -- --tag v0.1.0 --output release-notes.md
```

Commit messages that follow Conventional Commits are grouped into sections such as Features, Fixes, Build and CI, and Maintenance. Other commit messages are placed under Changes.

## Known Limitations

- Shortcuts only run on Netflix watch pages or pages with a visible Netflix player.
- Shortcut handling is skipped while typing in inputs, textareas, or editable content.
- Skip intro only works when Netflix renders a visible skip intro button.
- Seeking uses Netflix's internal player API. If Netflix changes that API, rewind and fast-forward may need an extension update.
- Browser extension pages and content scripts may need a manual reload after manifest, service worker, or content script changes.

## Bug Reports

When reporting an issue, include:

- Browser name and version.
- Extension version.
- The Netflix page type where the issue happened.
- The shortcut or action that failed.
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

1. Confirm Chrome loaded the `dist` folder.
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
4. Refresh the Netflix tab after changing settings.

## Packaging For Manual Distribution

Build first:

```sh
npm run build
```

Create a zip from the contents of `dist`:

```sh
(cd dist && zip -r ../shortcut-override-for-netflix.zip .)
```

The zip root should contain `manifest.json`, not a nested `dist` folder.

For Microsoft Edge Partner Center, build the Edge-specific package:

```sh
npm run build:edge
```

That package is written to `release-assets/shortcut-override-for-netflix-edge-<version>.zip`.
It is generated from `dist`, but removes the Chrome extension `key` field and shortens
`short_name` to satisfy Edge validation.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
