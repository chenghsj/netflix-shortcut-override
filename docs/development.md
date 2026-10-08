# Development Guide

[README](../README.md) · [User guide](user-guide.md) · [Development](development.md) · [Release](release.md) · [Troubleshooting](troubleshooting.md)

Requires Node.js 22 or newer and npm. CI uses Node.js 24. Run commands from the repository root.

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

Then open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on…", and select `dist/firefox/manifest.json`. See [the Firefox browser test guide](firefox-real-browser-test.md) for the smoke-test checklist.

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

The real-Chrome regression flow, including the reload-in-progress popup case, is documented in [docs/chrome-real-browser-test.md](chrome-real-browser-test.md). The Firefox smoke-test flow is documented in [docs/firefox-real-browser-test.md](firefox-real-browser-test.md).
