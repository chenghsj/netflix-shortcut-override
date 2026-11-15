# Development Guide

[README](../README.md) · [User guide](user-guide.md) · [Development](development.md) · [Release](release.md) · [Troubleshooting](troubleshooting.md)

Requires Node.js 22.18.0 or newer and npm. CI uses Node.js 24. Run commands from the repository root. Scripts run directly with Node.js and are included in `npm run typecheck`.

Browser builds declare Chrome/Edge 111+ and Firefox Desktop 128+ as their minimum versions. Subtitle-preserving Picture-in-Picture requires Chrome/Edge 116+ and is checked separately at runtime.

Firefox package lint reports two minimum-version warnings for `data_collection_permissions`: its built-in consent UI arrived in Desktop 140 and Android 142. The manifest retains `required: ['none']` for AMO and does not use the data-collection API. Firefox 128–139 ignores this declaration; the Desktop minimum remains 128 for MAIN-world execution and optional host permissions. See [Mozilla's consent documentation](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/) and [the older-version manifest compatibility report](https://bugzilla.mozilla.org/show_bug.cgi?id=1996829).

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

For update compatibility and installed-browser checks, see [Verify settings upgrades](settings-upgrade.md).

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

The full build type-checks first, builds Chromium and Firefox concurrently, then verifies both outputs. TypeScript reuses incremental check results from `node_modules/.tmp`; the first check after installing dependencies takes longer. Source and configuration changes invalidate the affected cached results automatically. Both browser bundles are rebuilt on every run.

For a production build of just one browser, use `npm run build:chromium` or `npm run build:firefox`. These commands only bundle that browser; run `npm run typecheck` separately when needed. Use `npm run dev` for UI development with HMR.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the CRXJS/Vite dev server with HMR. |
| `npm run build` | Clear `dist`, type-check with incremental caching, build both browser outputs concurrently, and verify background entry points. |
| `npm run build:chromium` | Build the Chromium extension in `dist/chromium`. |
| `npm run build:firefox` | Build the Firefox extension in `dist/firefox`. |
| `npm run verify:build` | Verify both generated background loaders point to the background bundle and contain its message handlers. |
| `npm run lint:firefox` | Run `web-ext lint` against `dist/firefox`. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run Vitest tests. |
| `npm run test:coverage` | Run the complete test suite with enforced coverage thresholds. |
| `npm run icons` | Regenerate enabled, disabled, dark, Classic, and Classic dark icons from `assets/icons` at 16, 32, 48, and 128 px, preserving aspect ratio and transparency. Options and popup use the selected interface style; toolbar icons follow the enabled/disabled state. |
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
|   |-- build-browsers.ts
|   |-- generate-icons.ts
|   |-- generate-release-notes.ts
|   `-- verify-build.ts
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
- `src/content/pip/pip-video-handoff.ts`: candidate selection and explicit waiting, replacement, or episode decisions. Recovery timers and episode evidence remain in this owner.
- `src/content/netflix-playback-session.ts`: playback commands and subtitle confirmation. Subtitle results expose confirmed state rather than raw transport data; successful subtitle commands invalidate older reads here. Timeline seeks also delegate playback restoration here, so newer transport intent supersedes an older seek completion; the timeline supplies only its current presentation lifetime. Adopted-video bindings guard their own presentation lifetime, while settings persistence stays with its existing owner.
- Subtitle-track cycling accepts an availability predicate that the session evaluates immediately before dispatching a queued command. The shortcut controller owns checks for the global and originating row switches, watch path, video identity and originating window. Explicit cancellation uses a separate generation from latest-action feedback so rapid valid presses remain queued, while disable/re-enable cannot revive cancelled work. Discarded commands return no confirmed subtitle state or failure hint; already-issued PiP results retain the existing fallback-persistence contract.
- `src/content/netflix-api-bridge.ts`: page-world bridge for Netflix player API access and selected subtitle metadata.
- `src/content/subtitle-navigation.ts`: subtitle navigation, timing cache, loading feedback, and pending-action cancellation.
- Subtitle navigation uses `subtitleNavigation` in settings and shortcut groups, and `SubtitleNavigation` / `SUBTITLE_NAVIGATION` in type and constant names. Settings schema v14 migrates the former `subtitlePractice` field from older settings and backups. Synced writes retain that field as an alias for older installations; current backups export only `subtitleNavigation`.
- `src/shared/netflix-caption-events.ts`: JSON string message protocol for caption metadata across browser worlds.
- `src/shared/netflix-subtitles.ts`: bounded Netflix timed-text normalization.
- `src/background/service-worker.ts`: distinct manifest entry point for the background bundle.
- `src/background/index.ts`: background-side Netflix API execution fallback, caption-fetch routing, and popup focus handoff coordination.
- `src/background/netflix-caption-fetch.ts`: allowlisted HTTPS caption downloads with size and timeout limits.
- `src/popup/popup-app.tsx`: toolbar popup for quick status, toggles, shortcut summary, and options entry.
- `src/options/options-app.tsx`: extension options UI and subtitle-section navigation.
- `src/options/use-shortcut-editor.ts`: mutually exclusive recording and conflict confirmation, saved-key checks, and recorder focus restoration.
- `src/shared/shortcut-edit.ts`: shortcut-edit snapshots and one evaluation path for preview and authoritative save. It owns entry freshness, atomic assignment-plus-parameter changes, parameter validation, and quota preflight for preferred-speed, seek, and subtitle-size edits. Plain key edits preserve the latest enabled state and retain storage-owned quota errors. The three editors keep draft strings, dialogs, recording, and focus; settings writes remain in storage.
- `src/shared/use-subtitle-activation.ts`: synchronous browser permission requests, duplicate-request prevention, and cancellation of stale approvals on disable or unmount.
- `src/shared/shortcut-routing.ts`: shared shortcut support and general-shortcut precedence for Options, popup, editing, and playback routing. Playback-context readiness and event interception remain in content.
- `src/shared/shortcut-bindings.ts`: shortcut actions, default key bindings, key normalization, matching, and display labels.
- `src/shared/shortcut-assignment.ts`: shared assignment inspection and atomic updates for the editors. It owns key conflicts, seek-pair transfer consequences, browser support, and saved-key revalidation; editors retain their drafts and interaction lifetimes.
- `src/shared/shortcut-catalog.ts`: shared shortcut identities and relationships: built-in/custom seek pairs, percentage and preferred-speed group membership, and the hold-speed parent. Options, popup, assignment, and feature management consume these facts while retaining their own labels, ordering, visibility, and search behavior.
- `src/shared/shortcut-settings.ts`: default settings, normalization, and backup-content validation, including version acceptance and strict-current versus migratable-legacy rules. `settings-backup.ts` owns only the file envelope and delegates content parsing here.
- `src/shared/playback-speed.ts`: playback-speed stepping and speed normalization helpers.
- `src/shared/i18n.ts`: localized options copy and media hint labels.
- `src/shared/shortcut-search.ts`: shared multilingual shortcut labels, function aliases, language-name keywords, and key matching for Options and the popup. Both UIs consume this index and keep only their presentation-specific row grouping.
- `src/options/settings-search.ts`: multilingual section and field-label search for editable Options settings, including saved favorite-subtitle languages and empty percentage groups.
- `src/shared/subtitle-language-catalog.ts`: language codes, translated names, native names, and common aliases shared by the favorite-subtitle picker and shortcut search.

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

## UI components

See [UI components](ui-components.md) for upstream components, application adapters, and import boundaries.
