# Shortcut Override for Netflix

English · [繁體中文](docs/readme/zh-TW.md) · [简体中文](docs/readme/zh-CN.md) · [日本語](docs/readme/ja.md) · [한국어](docs/readme/ko.md)

[![CI](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml/badge.svg)](https://github.com/chenghsj/netflix-shortcut-override/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/chenghsj/netflix-shortcut-override?label=release)](https://github.com/chenghsj/netflix-shortcut-override/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Customize Netflix playback shortcuts, navigate subtitles, and watch in Picture-in-Picture with subtitle support.

This is an unofficial extension, not affiliated with, endorsed by, or sponsored by Netflix.

## Install

[![Chrome Web Store](docs/assets/chrome.svg)](https://chromewebstore.google.com/detail/shortcut-override-for-net/jebnhiecgnchnioahfagmnebdknddbom)
[![Microsoft Edge Add-ons](docs/assets/edge.svg)](https://microsoftedge.microsoft.com/addons/detail/shortcut-override-for-net/ddfnieehcebicbmnejlafjphppdjmdhi)
[![Firefox Add-ons](docs/assets/firefox.svg)](https://addons.mozilla.org/firefox/addon/70ea1dc7212746bd96bd/)

Install from your browser's store, open a Netflix video, and use the toolbar popup to check status or open Options.

For manual installation, download a browser package from [GitHub Releases](https://github.com/chenghsj/netflix-shortcut-override/releases/latest):

- **Chrome / Edge:** extract the Chromium ZIP, enable Developer mode in `chrome://extensions` or `edge://extensions`, and choose **Load unpacked**. Select the folder containing `manifest.json`.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on…**, and select the Firefox ZIP. This installation lasts until the browser restarts; use Firefox Add-ons for persistent installation and automatic updates.

## Features

- Customize each shortcut, enable or disable actions, and resolve key conflicts in Options.
- Control playback, seeking, volume, subtitles, fullscreen, skip intro, and playback speed.
- Jump to the previous or next subtitle, or replay the current one.
- Watch in Picture-in-Picture with mirrored Netflix subtitles and playback controls on Chrome and Edge.
- Hold the Play / Pause key for temporary speed adjustment, then release to restore the original speed.
- Check compatibility and copy local diagnostics from the toolbar popup.
- Sync settings through browser storage, export/import backups, and choose from five interface languages.

## Default Shortcuts

All keys can be changed in Options.

| Action | Default key |
| --- | --- |
| Play / Pause | `Space` |
| Rewind / Forward | `Left` / `Right` |
| Volume up / down | `Up` / `Down` |
| Mute | `M` |
| Toggle Netflix subtitles | `C` |
| Fullscreen | `F` |
| Picture-in-Picture | `Shift + P` |
| Skip intro | `S` |
| Increase / decrease playback speed | `Shift + .` / `Shift + ,` |
| Set preferred playback speed | `Shift + "` |
| Reset playback speed | `Shift + /` |

With hold speed enabled, tap Play / Pause to toggle playback or hold it for roughly 250 ms to use the hold speed (default `2x`).

The default seek interval is `10s` and can be set from `1s` to `60s`. Options also lets you adjust speed limits, steps, preferred speed, and hold speed. See the [detailed user guide](docs/user-guide.md) for ranges and reset behavior.

## Subtitle Navigation

Subtitle navigation is **off by default**:

1. Open Options and enable shortcut override.
2. Enable Subtitle navigation and allow Netflix/subtitle website access if prompted.
3. Select a subtitle track in Netflix.

| Action | Default key |
| --- | --- |
| Previous subtitle | `A` |
| Next subtitle | `D` |
| Replay current subtitle | `S` |
| Play / Pause | `W` |

`A` and `D` preserve the playing or paused state. `S` starts playback from the current subtitle; it does not loop or stop at its end. `W` toggles playback immediately, without hold speed.

**Enabled subtitle keys take priority over ordinary shortcuts.** With the defaults, `S` replays a subtitle while subtitle navigation is on. Disable that action or subtitle navigation to use `S` for skip intro again.

If website access is denied, the feature stays off. Turn it on again to retry. These shortcuts also work in the extension-managed Picture-in-Picture window on Chrome and Edge.

## Supported Languages

The interface follows supported browser UI languages automatically, or you can choose English, Traditional Chinese, Simplified Chinese, Japanese, or Korean in Options.

## Browser Support and Limitations

- Supports Chrome, Edge, and Firefox Desktop. The extension's subtitle-preserving Picture-in-Picture feature requires Chrome or Edge; it is disabled on Firefox.
- Shortcuts work on Netflix watch pages or pages with a visible player, and are skipped while typing in editable fields.
- Fullscreen is available only on the Netflix page. Skip intro requires a visible Netflix skip button.
- Seeking, subtitle switching, and subtitle navigation depend on undocumented Netflix player interfaces and may need updates when Netflix changes them.

## Permissions

- **Netflix website access:** run playback shortcuts and read the selected subtitle track.
- **Optional `https://*.nflxvideo.net/*` access:** download subtitle documents when navigation is requested. Access is requested when you enable subtitle navigation; no content scripts run on this CDN host.
- **Storage, scripting, and active tab:** save settings, execute playback actions, check compatibility, and restore playback focus. The popup reloads Netflix only when you select the recovery action.

Turning subtitle navigation off does not revoke website access already granted. See the [permission details](docs/user-guide.md#permissions) and [troubleshooting guide](docs/troubleshooting.md#subtitle-website-access).

## Privacy

No analytics, tracking, or third-party processing services. Subtitle documents are retrieved from Netflix delivery hosts and parsed locally; their timing cache stays in memory. Settings use browser sync storage, and compatibility diagnostics stay on your device unless you copy and share them.

Read the full [privacy policy](PRIVACY.md).

## Development and Documentation

Requires Node.js 22 or newer and npm. From the repository root:

```sh
npm ci
npm run build
```

Load `dist/chromium` in Chrome/Edge, or `dist/firefox/manifest.json` as a temporary Firefox add-on.

- [Detailed user guide](docs/user-guide.md): settings, subtitle navigation, permissions, and privacy details.
- [Development guide](docs/development.md): HMR, scripts, architecture, and testing.
- [Release guide](docs/release.md): version tags, packaging, checksums, and Firefox submission.
- [Troubleshooting](docs/troubleshooting.md): shortcut, website access, and development issues.
- [Behavior specification](docs/behavior-spec.md) · [Chrome browser tests](docs/chrome-real-browser-test.md) · [Firefox browser tests](docs/firefox-real-browser-test.md)

## Bug Reports

Open a [GitHub issue](https://github.com/chenghsj/netflix-shortcut-override/issues/new/choose) with your browser and extension versions, the failing action, and compatibility diagnostics copied from the toolbar popup when available.

## License

[MIT](LICENSE).
