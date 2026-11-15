# Detailed User Guide

[README](../README.md) · [User guide](user-guide.md) · [Development](development.md) · [Release](release.md) · [Troubleshooting](troubleshooting.md)

## Default Shortcuts

Use `,` / `.` to move backward / forward by one frame. If playback is running, the extension pauses it first, then moves one frame and stays paused. Netflix's reported frame rate determines the interval; when unavailable, the extension estimates 24 FPS. Holding either key repeats the steps. `Shift + ,` / `Shift + .` still adjust playback speed. Frame stepping uses Netflix's seek API, so exact rendered-frame accuracy depends on its seek precision.

In **General settings → Hide pause overlay**, choose whether to hide Netflix's idle title/synopsis overlay and dark backdrop during pauses from Netflix's controls, keyboard shortcuts and frame stepping. This is off by default, and changes apply immediately. The information icon opens an explanatory tooltip. Subtitles and playback controls remain available. The global extension switch also controls this behavior and retains your saved preference when turned off and on again.

Use `Shift + A` / `Shift + D` to select the previous / next available audio track, wrapping at the ends. The on-screen label keeps Netflix's track name, including audio-description variants. A single selected track stays unchanged. These shortcuts appear under **Volume and audio** in Options and the popup; frame shortcuts appear under **Playback**. All four keys can be remapped or disabled in Options.

In Options → **Volume and audio** → **Favorite audio tracks**, select one or more languages and choose **Add (count)**. Drag the saved tracks, or focus a drag handle and press Up/Down, to set their switching order. The picker lists each language and its **Audio Description** variant as separate choices, so you can select either or both in the same batch. Both variants of a language can be saved independently, up to 20 tracks in total. The audio shortcuts cycle only through matching available favorites, skipping missing tracks. If none match, a hint appears and the current audio stays selected. An empty list cycles through all available audio tracks. Favorites affect shortcut cycling only; opening a title does not automatically change its audio.

Frame feedback shows only the directional frame icon. Audio-language feedback uses the same compact surface as subtitle-language feedback. Subtitle and audio-language labels remain visible for 1 second after the last switch.

| Action | Default key |
| --- | --- |
| Play / Pause | `Space` |
| Rewind | `Left` |
| Forward | `Right` |
| Previous / next frame (pauses playback) | `,` / `.` |
| Previous / next audio language | `Shift + A` / `Shift + D` |
| Volume up | `Up` |
| Volume down | `Down` |
| Mute | `M` |
| Toggle Netflix subtitles | `C` |
| Next Netflix subtitle track | `Shift + C` |
| Previous Netflix subtitle track | `Shift + X` |
| Cycle subtitle size (small → medium → large) | `Shift + V` |
| Fullscreen | `F` |
| Picture-in-Picture | `Shift + P` |
| Skip intro | `S` |
| Increase playback speed | `Shift + .` |
| Decrease playback speed | `Shift + ,` |
| Set preferred playback speed | `Shift + "` |
| Reset playback speed | `Shift + /` |

Press `C` to turn Netflix's native subtitles off or on. The extension restores the previously selected subtitle track when it remains available; otherwise, it selects the first available subtitle track. In the extension-managed PiP window, the shortcut and subtitle switch stay synchronized.

Press `Shift + V` to cycle subtitle size through 80%, 100%, and 125%. The default is 100%, so the first press selects 125%. In **Options → Shortcuts → Subtitles**, select the pencil on **Cycle subtitle size** to edit this cycle and its shortcut. Choose whole percentages from 50% to 300%; a cycle needs 2–6 different sizes. Previously saved longer cycles are preserved and can still be edited or shortened; adding sizes stops at six. Drag the handles to arrange the cycle order, or focus a handle and use ArrowUp / ArrowDown. Drag a size label left or right to change its percentage. Saving and reopening preserves the order, and playback cycles in that order. If the current size is not in the cycle, the next press starts at its first entry. The percentages scale the video’s original subtitles: 150% means 1.5× the original size. The actual size depends on the video and player dimensions. The dialog records the key alongside the sizes. Regular playback and PiP save their current size separately. 100% restores Netflix’s original appearance. This scales rendered captions locally without changing Netflix account preferences.

Press `Shift + C` for the next subtitle track or `Shift + X` for the previous one. In **Favorite subtitles**, check the languages you want, then choose **Add (count)** to add them together. Search using a name in any of the five interface languages, a native name, or a language code: for example, `Japanese`, `日文`, `日语`, `日本語`, `일본어`, and `ja` all find Japanese. They are appended in the order you selected them; drag the saved list to change the switching order. Languages already in the list stay checked and disabled in the picker. The shortcuts skip languages without an available subtitle track. An empty list cycles through all available subtitle tracks. When subtitles are off, the next shortcut starts at the first track and the previous shortcut starts at the last track. If no matching subtitle track exists, a hint appears and the current selection stays in place.


Rapid subtitle-track presses run in order. Commands still waiting in the queue are discarded if you disable the extension or that shortcut, change the original video or episode, or close its window; they do not apply to a later playback session.

Common language aliases also work in every interface language: for example, `日語`, `にほんご`, and `일어` find Japanese; `韓語`, `韩文`, and `한국말` find Korean; `仏語` and `불어` find French; and `Farsi` finds Persian. `繁中`, `繁体字`, and `번체자` find Traditional Chinese, while `简中`, `簡体字`, and `간체자` find Simplified Chinese. `英語` also finds regional English variants; `US English`, `美式英語`, `米語`, and `미국영어` find only American English, while `UK English`, `英国英語`, and `영국영어` find only British English. Search also retains partial-name matching, so short aliases can return other names containing the same text.

The configured Play / Pause shortcut has two behaviors when hold speed is enabled:

- Tap the key to play or pause.
- Hold it for roughly 250 ms to temporarily switch to the configured hold speed. The default hold speed is `2x`.

## Subtitle Navigation

Subtitle navigation is **off by default**. In Options, turn on **Enable extension** and the **Subtitle navigation** master switch. Allow Netflix subtitle website access if the browser asks, then select a Netflix subtitle track. If access is already granted, the switch enables without another permission prompt. Denying access leaves it off; turn the switch on again to retry.

| Action | Default key | Behavior |
| --- | --- | --- |
| Previous subtitle | `A` | Jump to the preceding subtitle start. |
| Next subtitle | `D` | Jump to the next subtitle start. |
| Replay current subtitle | Not set (disabled) | Seek to the most recently started subtitle and begin playback once; it does not loop or stop automatically at the subtitle end. Before the first subtitle, replay starts at the first subtitle. |
| Play / Pause | `W` | Toggle playback immediately, without hold-speed behavior. |

A/D preserve the current playing or paused state. These keys can also be used in the extension-managed PiP window on Chrome and Edge. Subtitle navigation does not override ordinary shortcuts. An enabled ordinary shortcut keeps its key; choose another key for subtitle navigation or explicitly transfer it in the conflict dialog. Existing duplicate settings keep the ordinary action active, so `S` continues skipping the intro until reassigned. Typing fields are excluded. The ordinary Play / Pause shortcut keeps its existing tap/hold behavior.

The section has the same Function / Key / Enabled / Actions columns as the ordinary shortcut table. Each row supports enabling, key editing, and reset. The section **Reset** restores default subtitle keys, keeping any occupied by enabled general shortcuts disabled and preserving its master switch and other settings; the ordinary shortcut section's Reset does not reset subtitle navigation.

Turning off the global shortcut override disables the subtitle navigation controls without clearing their values. Turning it back on restores access to those saved values. When only the subtitle navigation master is off, key editing and reset remain available, while the row switches are disabled.

Within either shortcut table, individually disabled rows keep their saved keys but allow other rows to reuse them. Enabled rows reserve their keys across both shortcut groups, even while a master switch is off. Enabling or resetting a row whose key is already reserved opens a popover without changing settings: choose **Change key** to record a different key and enable the row, or **Use for [action]** to disable the current owner and transfer the key. Clicking outside or pressing Escape cancels; cancelling the key editor also leaves settings unchanged. For existing duplicate settings, available general shortcuts keep playback ownership of the key.

The popup opens directly on shortcut reference. Select **Subtitle navigation** in its category selector to view configured keys and individual disabled states. The keys remain available for reference while either master is off. Subtitle-navigation rows that overlap an enabled general shortcut display **Shortcut priority**, identifying the general action in their accessible description. Use **Open settings** to enable subtitle navigation, edit keys, or reset them in Options.

Options contains all preferences: language, interface style, brightness, playback automation, subtitle navigation, and playback-speed settings. Use its sidebar to select a settings page or shortcut category.

Choose **Classic**, **Neobrutalism**, or **Markdown** as the interface style independently of light or dark brightness. Existing installations without an appearance choice and backups from older versions use Classic. Explicit appearance choices are preserved. Fresh installations start with Neobrutalism.

Subtitle timings are loaded on demand and cached in memory for the selected video/player session/track. During a download, a compact text hint and spinner remain visible until loading completes, fails, or the operation is cancelled. The spinner takes 1.6 seconds per revolution and respects reduced-motion preferences. Cache hits, successful jumps, and subtitle boundaries show no navigation hint. Failures use the volume-value text hint style for five seconds; `W` keeps the play/pause icon hint.

Playback toggles, disabling the pending action, and closing its PiP window cancel pending navigation. Re-enabling a disabled action does not revive the cancelled request. A late response cannot seek or start playback after cancellation.

This feature uses undocumented Netflix subtitle metadata and HTTPS subtitle delivery documents, so availability can vary by Netflix player build or selected track. It uses the currently selected track without changing its language. See [Permissions](#permissions) and [Privacy](#privacy) for subtitle CDN access.

## Finding and editing shortcuts

Options shows one page at a time. The sidebar contains Playback, Seeking and jumps, Subtitles, Subtitle navigation, Volume and audio, and Display and Playback speed under Shortcuts. General settings, Playback automation, and Backup and restore are under Settings. Use the navigation toggle to open the drawer in a narrow window; selecting a page closes it and updates the URL so refreshing keeps that page selected. The global enable switch stays at the top of the desktop sidebar and above content in narrow windows.

Search by action name or key (for example, `Space`, `Ctrl+P`, or `ArrowLeft`) to find shortcuts across all categories, including subtitle-navigation shortcuts and custom entries. Both Options and the popup accept action and category names in English, Traditional Chinese, Simplified Chinese, Japanese, and Korean, regardless of your interface language. For example, search `字幕` or `자막` in the English interface to find subtitle shortcuts. You can also combine a translated name with a key, such as `音軌 Shift+KeyD`. Clear search or press Escape to return to your selected category. Click its pencil button in Actions to edit it. Use the Manage page features icon at the top right of each shortcut section to open its checklist. Uncheck a feature to preview hiding its settings row. Apply saves the hidden and disabled states; Cancel restores the rows. Closing the checklist also discards the preview. Hidden features retain their keys and parameters. Check an entry again to show it; it is enabled if its keys are free, or shown as disabled if a key is already in use. Existing shortcuts keep their keys. A seek pair remains disabled if either direction conflicts. You can change its keys or use the row switch to resolve conflicts later. Each custom combination can be managed separately; a seek pair switches both directions together. Hidden features are omitted from Options and the popup, including search. In the editor, use Clear shortcut (×) and Save to leave a key unassigned. Unassigned keys appear as Not set and do not intercept keys, including the action's former Netflix shortcut. Either or both directions of a seek pair can be left blank. Cancel discards the draft, and Restore brings back the saved key. Empty keys survive reopening Options and backup export/import. Favorite subtitles and Favorite audio tracks start expanded; their headings show the list titles without saved counts.

Options also searches settings sections and field labels across all five languages. Try `常用字幕`, `Range and step`, `Theme`, or `匯出設定`; matching settings appear directly in the results and can be edited there. Favorite subtitles and Favorite audio tracks can also be found by a saved language's name or alias. Search `進度跳轉` to add a percentage shortcut even when none exist yet.

Both searches also share common function and language aliases. Try `resume` for Play / Pause or `floating player` / `畫中畫` for Picture-in-Picture. Language names such as `日語`, `일어`, `US English`, and `불어` find the shortcuts for switching subtitle and audio languages. You can narrow them by key, such as `日語 Shift+KeyD`. These results find the shortcut controls; they do not choose a language for the video.

## Speed Settings

Playback speed preferences are next to their shortcuts in Options:

- **Shortcuts → Playback speed** shows the shared lowest/highest speed and adjustment amount in a separate **Range and step** card below the shortcut card. These fields save automatically. Reset affects these three values only.
- Edit **Set preferred speed** to change its speed and key together. Save applies both; Cancel discards both drafts. The row shows the saved speed, and its reset restores both the speed and key.
- Expand the **Preferred speed** nested table on the Playback speed page and use **Add preferred speed** for additional groups. Each group has its own speed, optional shortcut, and enable switch. Edit or delete each group independently; resetting all shortcuts removes the additional groups.
- **Hold** immediately below Play / Pause is a nested table with Speed, Enabled, Hint, and Action columns. The hint switch saves automatically. Edit opens the speed setting; Save applies the speed and Cancel discards its draft. It uses the configured Play / Pause key. Hold settings remain visible when disabled. The hint and speed controls become unavailable while hold speed is off; its enable control also becomes unavailable while Play / Pause is disabled, preserving the saved preference. This section starts expanded.

The popup opens directly on shortcut reference, with search across all categories and a selector for viewing one category at a time. **Open settings**, marked with an external-link icon, opens the corresponding page in Options to edit its shortcuts. All preferences, including playback automation, subtitle navigation, hold speed, and preferred speed, are edited in Options. The global enable switch and top-right **Open options** button stay visible. GitHub, rating, and the other-products Store menu are in the fixed footer.

| Setting | Default | Range |
| --- | ---: | --- |
| Lowest speed | `0.25x` | `0.25x` to `1.0x` |
| Highest speed | `3x` | `1.0x` to `4.0x` |
| Speed change | `0.25x` | `0.05x` to `4.0x` |
| Preferred speed | `1.5x` | `0.25x` to `4.0x` |
| Play / Pause hold speed | `2x` | `0.25x` to `4.0x`; follows the configured Play / Pause shortcut |

Values are normalized to `0.05x` increments.

## Seek Settings

Drag an editor's numeric label horizontally to adjust its draft: each eight pixels changes seconds by 1 or video progress by 5 percentage points. You can still type any whole percentage from 0 to 100. Save applies the value and keys together; Cancel discards them.

On the options page, edit the original **Forward / Rewind** row under **Shortcuts → Seeking and jumps** to change its seek interval:

| Setting | Default | Range |
| --- | ---: | --- |
| Seconds per seek | `10s` | `1s` to `60s` |

## Auto Skip

Open **Playback automation** in Options to turn on **Intro** or **Recap**. Both are off by default and can be enabled independently. While the extension is enabled, it clicks the matching button when Netflix shows it. Rewinding lets the extension skip the segment again when the button reappears.

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
