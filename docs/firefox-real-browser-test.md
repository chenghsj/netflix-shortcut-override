# Firefox Browser Smoke Test

Use this checklist to verify the Firefox-specific build locally. It covers Firefox Desktop only.

## Load the local build

1. Install dependencies with `npm ci`.
2. Run `npm run build:firefox`.
3. In Firefox, open `about:debugging#/runtime/this-firefox`.
4. Choose "Load Temporary Add-on…".
5. Select `firefox-dist/manifest.json`.

The generated `firefox-dist` directory is disposable. The Chromium build remains in `dist`.

## Netflix smoke test

Open a Netflix watch page and check:

- The extension loads without a manifest or background-script error.
- The configured shortcuts work for play/pause, seeking, volume, mute, fullscreen, skip intro, and playback speed.
- The popup reports the Netflix page status and shows the configured shortcuts.
- The options page can edit, enable, disable, and reset shortcuts.
- The Picture-in-Picture row is visible but disabled and marked unsupported.
- Press `Shift+P`; Firefox receives the shortcut without an extension hint or intercepted action.

## Release smoke test

Download `shortcut-override-for-netflix-firefox-<version>.zip` from the GitHub Release. Load the ZIP through `about:debugging#/runtime/this-firefox`, repeat the Netflix checklist, and confirm it is removed after restarting Firefox because the package is temporarily loaded.

For AMO validation, manually upload that same Firefox ZIP as the add-on package and upload `shortcut-override-for-netflix-source-<version>.zip` when source code is requested. After Mozilla approves the listed release, install it from Firefox Add-ons, repeat the checklist, and confirm it remains enabled after restarting Firefox.

Confirm the Firefox manifest does not include `browser_specific_settings.gecko.update_url`. Firefox Add-ons owns signing and automatic updates for listed releases.
