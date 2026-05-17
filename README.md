# Shortcut Override for Netflix

[![CI](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml)
[![Release](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/release.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/chenghsj/netflix-shortcut-override?label=release)](https://github.com/chenghsj/netflix-shortcut-override/releases/latest)

Customize Netflix playback shortcuts with a small unofficial Chrome extension.

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
- Configure the Left / Right rewind and fast-forward interval.
- Control play/pause, volume, mute, fullscreen, skip intro, and playback speed.
- Hold Space to temporarily switch to a configurable playback speed, then restore on release.
- Persist settings with `chrome.storage`.
- Build as a Manifest V3 Chrome extension.

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
| Each change | `0.25x` | `0.05x` to `4.0x` |
| Space hold speed | `2x` | `0.25x` to `4.0x` |

Values are normalized to `0.05x` increments.

## Seek Settings

The options page and popup expose the Left / Right seek interval:

| Setting | Default | Range |
| --- | ---: | --- |
| Left / Right seconds | `10s` | `1s` to `60s` |

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

- `src/content/index.ts`: keyboard interception, media actions, hint overlay, and Space hold behavior.
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
| `storage` | Save shortcut, language, hint, and playback speed settings. |
| `scripting` | Execute Netflix player API operations from the extension context. |
| `activeTab` | Read the active tab URL after the toolbar popup is opened so the popup can show page status. |
| `*://*.netflix.com/*` | Run the extension only on Netflix pages. |

## Privacy

- No remote analytics or tracking code is included.
- No external API calls are made by the extension.
- Shortcut, language, hint, and playback speed settings are stored with `chrome.storage`.
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
7. Publish or update the GitHub Release.

The generated release assets are:

- `shortcut-override-for-netflix-<version>.zip`
- `shortcut-override-for-netflix-<version>.zip.sha256`

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

## License

No license file is currently included. Add one before public distribution if you intend to publish or accept external contributions.
