# Detailed User Guide

[README](../README.md) · [User guide](user-guide.md) · [Development](development.md) · [Release](release.md) · [Troubleshooting](troubleshooting.md)

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

## Permissions

The extension requests:

| Permission | Why it is needed |
| --- | --- |
| `storage` | Save ordinary and subtitle navigation shortcuts, language, playback speed, seek, and hold-speed settings. |
| `scripting` | Execute Netflix player API operations and restore focus to the visible playback context after the popup closes. |
| `activeTab` | Check the active Netflix tab, request local compatibility status, restore playback focus, and reload that tab when the user selects the recovery action. |
| `*://*.netflix.com/*` | Run content scripts on Netflix pages and retrieve selected subtitles delivered from Netflix hosts. |
| `https://*.nflxvideo.net/*` (optional) | Retrieve Netflix subtitle documents when subtitle navigation is requested. Access is requested when the user enables subtitle navigation. No content scripts run on this CDN host. |

Both builds require Netflix page access and declare `nflxvideo.net` as optional host access. Turning on the Subtitle navigation master requests these two hosts directly from that click, including Netflix access in case it was withheld. The browser only prompts when approval is needed. The feature remains off while awaiting approval and after a denial or request failure. Turning it off does not revoke website access used by the extension.

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
- See the full privacy policy in [PRIVACY.md](../PRIVACY.md).

## Known Limitations

- Shortcuts only run in Netflix playback contexts: watch pages or pages with a visible Netflix player.
- Shortcut handling is skipped while typing in inputs, textareas, or editable content.
- Skip intro only works when Netflix renders a visible skip intro button.
- Seeking and subtitle toggling use Netflix's internal player API. If Netflix changes that API, these actions may need an extension update.
- Browser extension pages and content scripts may need a manual reload after manifest, service worker, or content script changes.

See the [behavior specification](behavior-spec.md) for complete shortcut, compatibility, and Picture-in-Picture behavior.
