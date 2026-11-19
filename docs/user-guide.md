# Detailed User Guide

[README](../README.md) · [User guide](user-guide.md) · [Development](development.md) · [Release](release.md) · [Troubleshooting](troubleshooting.md)

## Default Shortcuts

The shortcut recorder accepts letters, digits, function keys (F1–F24), arrows, navigation and editing keys when the browser delivers their keyboard events. A delivered CapsLock key can be recorded in primary or additional fields, including seek and subtitle-size shortcuts, and displays as Caps. Combine keys with Ctrl, Alt, Shift, Win (Windows) or Command (macOS).

When setting shortcuts:

- Tab moves focus and Esc closes the shortcut settings dialog. Neither key can be assigned, including in combinations.
- Ctrl, Alt and Shift must be combined with another key; they cannot be assigned alone.
- Win and Command must be combined with another key; they cannot be assigned alone. Combinations intercepted by the operating system cannot be recorded.
- Fn may be handled directly by the keyboard or operating system. Recording Fn or Fn combinations is not guaranteed.

The following named special keys can also be recorded when the browser supplies no physical key code. Their names describe the keyboard button; choose which extension action each triggers.

| Key name | Keyboard function |
| --- | --- |
| `MediaTrackNext` / `MediaTrackPrevious` | Next / previous media track |
| `MediaPlayPause` | Toggle media play / pause |
| `MediaPlay` / `MediaPause` | Separate media play / pause keys |
| `MediaStop` | Stop media |
| `MediaFastForward` / `MediaRewind` | Fast-forward / rewind media |
| `MediaRecord` | Record media |
| `AudioVolumeUp` / `AudioVolumeDown` / `AudioVolumeMute` | Volume up / down / mute |
| `BrowserBack` / `BrowserForward` | Browser back / forward |

Legacy names `MediaNextTrack`, `MediaPreviousTrack`, `VolumeUp`, `VolumeDown` and `VolumeMute` are recognized as the corresponding modern names, including in saved bindings and conflict checks. The in-app **User guide → Shortcut settings → Key restrictions when setting shortcuts** explains recording restrictions; the technical key names remain searchable without adding a code list to the guide.

Keys consumed by the operating system or browser may not reach the recorder or Netflix page, and a browser may retain its original action. Browser navigation is intercepted only for delivered, configured shortcuts. This does not add system-wide shortcuts. A key received as ordinary `F9` remains `F9`; it is not automatically mapped to `MediaTrackNext`.

Use `,` / `.` to move backward / forward by one frame. If playback is running, the extension pauses it first, then moves one frame and stays paused. Netflix's reported frame rate determines the interval; when unavailable, the extension estimates 24 FPS. Holding either key repeats the steps. `Shift + ,` / `Shift + .` still adjust playback speed. Frame stepping uses Netflix's seek API, so exact rendered-frame accuracy depends on its seek precision.

In **Playback preferences → Pause screen → Hide pause overlay**, choose whether to hide Netflix's idle title/synopsis overlay and dark backdrop during pauses from Netflix's controls, keyboard shortcuts and frame stepping. This is off by default, and changes apply immediately. The information icon opens an explanatory tooltip. Subtitles and playback controls remain available. The global extension switch also controls this behavior and retains your saved preference when turned off and on again.

Use `Shift + A` / `Shift + D` to select the previous / next available audio track, wrapping at the ends. The on-screen hint translates the language into the extension interface language and labels audio-description variants; unknown languages fall back to Netflix's track name. A single selected track stays unchanged. These shortcuts appear under **Volume and audio** in Options and the popup; frame shortcuts appear under **Seeking and navigation**. All four keys can be remapped or disabled in Options.

In Options → **Volume and audio** → **Favorite audio tracks**, select one or more languages and choose **Add (count)**. Drag the saved tracks, or focus a drag handle and press Up/Down, to set their switching order. The picker lists each language and its **Audio Description** variant as separate choices, so you can select either or both in the same batch. Both variants of a language can be saved independently, up to 20 tracks in total. If a regional favorite has no match, it can use a track in the same language without a region tag. Standard audio and Audio Description each match within their own type. The audio shortcuts cycle only through matching available favorites, skipping missing tracks. If none match, a hint appears and the current audio stays selected. An empty list cycles through all available audio tracks. Favorites affect shortcut cycling only; opening a title does not automatically change its audio.

Frame feedback shows only the directional frame icon. Audio-language feedback uses the same compact surface as subtitle-language feedback. Subtitle and audio-language labels remain visible for 1 second after the last switch.

| Action | Default key | Behavior |
| --- | --- | --- |
| Play / Pause | `Space` | Tap to play/pause; hold for temporary speed. |
| Fullscreen | `F` | Toggle fullscreen on the Netflix page; unavailable inside PiP. |
| Picture-in-Picture | `Shift + P` | Open/close subtitle-preserving PiP on Chrome/Edge 116+. |
| Previous frame | `,` | Pause, move back one frame, and remain paused. |
| Next frame | `.` | Pause, move forward one frame, and remain paused. |
| Skip intro | `S` | Click a recognized visible Netflix skip button for an intro, recap, or credits. |
| Previous episode | `Ctrl + P` | Use Netflix's episode picker to play the preceding available episode. |
| Next episode | `Ctrl + N` | Use Netflix's next-episode control or episode picker. |
| Forward | `→` | Forward 10 seconds by default; built-in interval: 1–300 seconds. |
| Rewind | `←` | Rewind by the same interval as Forward. |
| Toggle subtitles | `C` | Turn native Netflix subtitles off/on, restoring the last available track. |
| Cycle subtitle size | `Shift + C` | Cycle 80% → 100% → 125%; starts at 100%, so the first press selects 125%. |
| Next subtitle language | `Shift + X` | Select the next available subtitle/favorite; wrap at the end. |
| Previous subtitle language | `Shift + Z` | Select the previous available subtitle/favorite; wrap at the start. |
| Volume up | `↑` | Increase volume by 5 percentage points. |
| Volume down | `↓` | Decrease volume by 5 percentage points. |
| Mute | `M` | Toggle mute. |
| Previous audio language | `Shift + A` | Select the previous audio track/favorite, including Audio Description variants. |
| Next audio language | `Shift + D` | Select the next audio track/favorite, including Audio Description variants. |
| Increase speed | `Shift + .` | Increase by 0.25x by default, within the configured speed range. |
| Decrease speed | `Shift + ,` | Decrease by 0.25x by default, within the configured speed range. |
| Reset speed | `Shift + /` | Return to 1x. |
| Set preferred speed | `Shift + Quote` | Apply the configured preferred speed; default 1.5x. |

`Quote` is the physical quote key (`'` / `"` on a US keyboard), displayed as `Shift + "` in the popup. `Ctrl + P` / `Ctrl + N` use Control on macOS too; remap them if the browser reserves them.

Press `C` to turn Netflix's native subtitles off or on. The extension restores the previously selected subtitle track when it remains available; otherwise, it selects the first available subtitle track. In the extension-managed PiP window, the shortcut and subtitle switch stay synchronized.

Press `Shift + C` to cycle subtitle size through 80%, 100%, and 125%. The default is 100%, so the first press selects 125%. In **Options → Shortcuts → Subtitles**, select the pencil on **Cycle subtitle size** to edit this cycle and its shortcut. Choose whole percentages from 50% to 300%; a cycle needs 2–6 different sizes. Previously saved longer cycles are preserved and can still be edited or shortened; adding sizes stops at six. Drag the handles to arrange the cycle order, or focus a handle and use ArrowUp / ArrowDown. Drag a size label left or right to change its percentage. Saving and reopening preserves the order, and playback cycles in that order. If the current size is not in the cycle, the next press starts at its first entry. The percentages scale the video’s original subtitles: 150% means 1.5× the original size. The actual size depends on the video and player dimensions. The dialog records the key alongside the sizes. Regular playback and PiP save their current size separately. 100% restores Netflix’s original appearance. This scales rendered captions locally without changing Netflix account preferences.

Press `Shift + X` for the next subtitle track or `Shift + Z` for the previous one. In **Favorite subtitles**, check the languages you want, then choose **Add (count)** to add them together. Search using a name in any of the five interface languages, a native name, or a language code: for example, `Japanese`, `日文`, `日语`, `日本語`, `일본어`, and `ja` all find Japanese. They are appended in the order you selected them; drag the saved list to change the switching order. Languages already in the list stay checked and disabled in the picker. The shortcuts skip languages without an available subtitle track. An empty list cycles through all available subtitle tracks. When subtitles are off, the next shortcut starts at the first track and the previous shortcut starts at the last track. If no matching subtitle track exists, a hint appears and the current selection stays in place.

Choose **English** for any English variant. A regional favorite such as **American English** can use an unclaimed English subtitle track with no region tag when a US track is unavailable.


Rapid subtitle-track presses run in order. Commands still waiting in the queue are discarded if you disable the extension or that shortcut, change the original video or episode, or close its window; they do not apply to a later playback session.

Common language aliases also work in every interface language: for example, `日語`, `にほんご`, and `일어` find Japanese; `韓語`, `韩文`, and `한국말` find Korean; `仏語` and `불어` find French; and `Farsi` finds Persian. `繁中`, `繁体字`, and `번체자` find Traditional Chinese, while `简中`, `簡体字`, and `간체자` find Simplified Chinese. `英語` also finds regional English variants; `US English`, `美式英語`, `米語`, and `미국영어` find only American English, while `UK English`, `英国英語`, and `영국영어` find only British English. Search also retains partial-name matching, so short aliases can return other names containing the same text.

The configured Play / Pause shortcut has two behaviors when hold speed is enabled:

- Tap the key to play or pause.
- Hold it for roughly 250 ms to temporarily switch to the configured hold speed. The default hold speed is `2x`.

## Subtitle Navigation

Subtitle navigation is **off by default**. In Options, turn on **Enable extension**, open **Shortcuts → Subtitles → Sentence jumps and replay**, and turn on **Enable**. Allow Netflix subtitle website access if the browser asks, then select a Netflix subtitle track. If access is already granted, the switch enables without another permission prompt. Denying access leaves it off; turn the switch on again to retry.

| Action | Default key | Behavior |
| --- | --- | --- |
| Previous subtitle | `A` | Jump to the preceding subtitle start. |
| Next subtitle | `D` | Jump to the next subtitle start. |
| Replay current subtitle | Not set (disabled) | Seek to the most recently started subtitle and begin playback once; it does not loop or stop automatically at the subtitle end. Before the first subtitle, replay starts at the first subtitle. |
| Play / Pause | `W` | Toggle playback immediately, without hold-speed behavior. |

A/D preserve the current playing or paused state. These keys can also be used in the extension-managed PiP window on Chrome and Edge. Subtitle navigation does not override ordinary shortcuts. An enabled ordinary shortcut keeps its key; choose another key for subtitle navigation or explicitly transfer it in the conflict dialog. Existing duplicate settings keep the ordinary action active, so `S` continues skipping the intro until reassigned. Typing fields are excluded. The ordinary Play / Pause shortcut keeps its existing tap/hold behavior.

The section has the same Function / Key / Enabled / Actions columns as the ordinary shortcut table. Each row supports enabling, key editing, and reset. The section **Reset** restores default subtitle keys, keeping any occupied by enabled general shortcuts disabled and preserving its master switch and other settings; the ordinary shortcut section's Reset does not reset subtitle navigation.

Turning off the global shortcut override disables the subtitle navigation controls without clearing their values. Turning it back on restores access to those saved values. When only the subtitle navigation master is off, key editing and reset remain available, while the row switches are disabled.

Within either shortcut table, individually disabled rows keep their saved keys but allow other rows to reuse them. Enabled rows reserve their keys across both shortcut groups, even while a master switch is off. Enabling or resetting a row whose key is already reserved opens a popover without changing settings: choose **Change key** to record a different key and enable the row, or **Use this key** to disable the current owner and transfer the key. Clicking outside or pressing Escape cancels; cancelling the key editor also leaves settings unchanged. For existing duplicate settings, available general shortcuts keep playback ownership of the key.

The popup opens directly on shortcut reference. Select **Subtitles** in its category selector and find **Sentence jumps and replay** beneath **Subtitle language and size** to view configured keys and individual disabled states. The keys remain available for reference while either master is off. Subtitle-navigation rows that overlap an enabled general shortcut display **Shortcut priority**, identifying the general action in their accessible description. Use **Open settings** to enable subtitle navigation, edit keys, or reset them in Options.

Options contains all preferences: language, interface style, brightness, playback automation, subtitle navigation, and playback-speed settings. Use its sidebar to select a settings page or shortcut category.

In **Backup and restore → Restore defaults**, confirm to restore all settings to their defaults. This also removes custom shortcuts and favorite subtitle/audio languages, restores hidden features, and resets language, theme and interface style. Export a backup first if you want to keep your current settings. Cancelling leaves settings unchanged.

The **Report an issue** icon in the popup footer and Options header opens GitHub's issue form chooser. Sign in to GitHub, then choose **Bug report** or **Feature request**. Reports are public; remove private account information before submitting. For a bug, you can include compatibility diagnostics copied from the extension popup.

Choose **Classic** or **Neobrutalism** as the interface style independently of light or dark brightness. Existing or imported **Markdown** settings remain active and correctly labeled; after selecting another style, Markdown is hidden from the choices. Existing installations without an appearance choice and backups from older versions use Classic. Explicit appearance choices are preserved. Fresh installations start with Neobrutalism.

Subtitle timings are loaded on demand and cached in memory for the selected video/player session/track. During a download, a compact text hint and spinner remain visible until loading completes, fails, or the operation is cancelled. The spinner takes 1.6 seconds per revolution and respects reduced-motion preferences. Cache hits, successful jumps, and subtitle boundaries show no navigation hint. Failures use the volume-value text hint style for five seconds; `W` keeps the play/pause icon hint.

Playback toggles, disabling the pending action, and closing its PiP window cancel pending navigation. Re-enabling a disabled action does not revive the cancelled request. A late response cannot seek or start playback after cancellation.

This feature uses undocumented Netflix subtitle metadata and HTTPS subtitle delivery documents, so availability can vary by Netflix player build or selected track. It uses the currently selected track without changing its language. See [Permissions](#permissions) and [Privacy](#privacy) for subtitle CDN access.

## Finding and editing shortcuts

Choose **User guide** below Backup and restore in the Options sidebar or in the popup footer to open the built-in guide at `options.html#help`. The concise guide keeps essential setup, shortcut editing, backup/recovery, permissions and privacy in four categories and all five interface languages. Feature-specific reminders appear beside their controls: hold-speed and frame-step tooltips, favorite-language descriptions, the replay row, and activation guidance for PiP and subtitle access. This document retains the detailed reference. Guide categories start collapsed and support the Expand all / Collapse all toggle, keyboard navigation and reduced-motion preferences. Search matches retained instructions and translated terms, opens matching categories, and restores previous collapse choices when cleared. Topics link back to their settings; only search results show a total count. `⌘ / Ctrl + K` focuses guide search; Escape clears it, and `⌘ / Ctrl + 9` opens the guide.

Options shows one page at a time. The sidebar contains five shortcut pages: Playback, Seeking and navigation, Subtitles, Volume and audio, and Playback speed. Previous and next episode are on Playback. Fullscreen and Picture-in-Picture are under Display on the same page. Sentence jumps and replay are on Subtitles, where the separate Play / Pause binding is marked Sentence mode. General settings, Playback preferences, and Backup and restore are under Settings. Use the navigation toggle to open the drawer in a narrow window; selecting a page closes it and updates the URL so refreshing keeps that page selected. The global enable switch stays at the top of the desktop sidebar and above content in narrow windows.

Search by action name or key (for example, `Space`, `Ctrl+P`, or `ArrowLeft`) to find shortcuts across all categories, including subtitle-navigation shortcuts and custom entries. Both Options and the popup accept action and category names in English, Traditional Chinese, Simplified Chinese, Japanese, and Korean, regardless of your interface language. For example, search `字幕` or `자막` in the English interface to find subtitle shortcuts. You can also combine a translated name with a key, such as `音軌 Shift+KeyD`. Clear search or press Escape to return to your selected category. Click its pencil button in Actions to edit it. Use the Manage page features icon at the top right of each shortcut section to open its checklist. Uncheck a feature to preview hiding its settings row. Apply saves the hidden and disabled states; Cancel restores the rows. Closing the checklist also discards the preview. Hidden features retain their keys and parameters. Check an entry again to show it; it is enabled if its keys are free, or shown as disabled if a key is already in use. Existing shortcuts keep their keys. A seek pair remains disabled if either direction conflicts. You can change its keys or use the row switch to resolve conflicts later. Each custom combination can be managed separately; a seek pair switches both directions together. Hidden features are omitted from Options and the popup, including search. In the editor, use Clear shortcut (×) and Save to leave a key unassigned. Unassigned keys appear as Not set and do not intercept keys, including the action's former Netflix shortcut. Either or both directions of a seek pair can be left blank. Cancel discards the draft, and Restore brings back the saved key. Empty keys survive reopening Options and backup export/import. Favorite subtitles and Favorite audio tracks start expanded; their headings show the list titles without saved counts.

Options also searches settings sections and field labels across all five languages. Try `常用字幕`, `Range and step`, `Theme`, or `匯出設定`; matching settings appear directly in the results and can be edited there. Favorite subtitles and Favorite audio tracks can also be found by a saved language's name or alias. Search `進度跳轉` to add a percentage shortcut even when none exist yet.

Both searches also share common function and language aliases. Try `resume` for Play / Pause or `floating player` / `畫中畫` for Picture-in-Picture. Language names such as `日語`, `일어`, `US English`, and `불어` find the shortcuts for switching subtitle and audio languages. You can narrow them by key, such as `日語 Shift+KeyD`. These results find the shortcut controls; they do not choose a language for the video.

## Interface keyboard navigation

The toolbar popup focuses search when it opens, so you can type immediately. It does not refocus search after changing a control or receiving settings updates. Options keeps its normal page/section focus when opened, including links to a specific setting. Use `⌘ + K` on macOS or `Ctrl + K` on Windows/Linux to focus search in either view. In Options, `⌘ + 1`–`⌘ + 9` or `Ctrl + 1`–`Ctrl + 9` select Playback, Seeking and navigation, Subtitles, Volume and audio, Playback speed, General settings, Playback preferences, Backup and restore, and User guide in sidebar order. Hold the platform modifier for about 300 ms to show the number hints. Selecting a page clears search; Escape also clears search. Page-switching shortcuts are inactive in editing dialogs and while recording a key. These interface shortcuts are separate from configurable Netflix playback bindings.

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
| Highest speed | `3x` | `1.0x` to `5.0x` |
| Speed change | `0.25x` | `0.05x` to `5.0x` |
| Preferred speed | `1.5x` | `0.25x` to `5.0x` |
| Play / Pause hold speed | `2x` | `0.25x` to `5.0x`; follows the configured Play / Pause shortcut |

Values are normalized to `0.05x` increments.

To use Increase speed up to `5x`, open **Playback speed → Range and step**, set **Highest speed** to `5`, and blur the field or press Enter to save. To apply `5x` directly, edit **Set preferred speed**, or choose **Add preferred speed**, set the value to `5`, assign a key, and select **Save**. Preferred speeds apply independently of the speed-up/down range. Export/import retains both built-in and added `5x` preferences.

## Seek Settings

Drag an editor's numeric label horizontally to adjust its draft: each eight pixels changes seconds by 1 or video progress by 5 percentage points. You can still type any whole percentage from 0 to 100. Save applies the value and keys together; Cancel discards them.

On the options page, edit the original **Forward / Rewind** row under **Shortcuts → Seeking and navigation** to change its seek interval:

| Setting | Default | Range |
| --- | ---: | --- |
| Seconds per seek | `10s` | `1s` to `300s` |

The same 1–300 whole-second limit applies to added seek pairs. Use **Add seek pair** to save an interval and its forward/rewind keys together. Seconds above 300 cannot be saved in an editor. Upgrading older settings or importing a supported older backup reduces larger saved intervals to 300 seconds while retaining keys and enabled states. Percentage jumps use their own 0–100% range. See [settings upgrade checks](settings-upgrade.md#current-numeric-ranges) for migration and backup behavior.

## Multiple shortcuts for one action

Open an action’s editor and choose **Add shortcut** to record another key without replacing the existing one. Each action supports up to three shortcuts. Use the remove button beside a row to remove that key; **Clear shortcut** empties only its recording field. Saving discards empty fields and promotes the first remaining key. Clear or remove every key to leave the action unassigned. Save applies the full list, Cancel discards it, and Restore follows the editor’s existing restore scope. Enabled keys must be unique across all actions; disabled rows retain their complete lists.

For example, edit **Next episode**, choose **Add shortcut**, press your keyboard’s next-track key, and save. If the browser delivers `MediaTrackNext` to the recorder, both it and `Ctrl+N` can switch to the next episode. You can record `MediaTrackPrevious` alongside `Ctrl+P` the same way. During playback, assigned track keys also work through browser Media Session controls. Existing single-key settings and supported backups keep their keys when upgraded, and new backups retain the full lists.

Media keys can also use Ctrl, Alt, Shift or Command/Win. `Ctrl+MediaTrackNext` and plain `MediaTrackNext` are separate shortcuts and may own different actions. Recording and using the combination requires the browser to deliver its complete keyboard event. Within the 120ms pairing window, that event's exact modifiers select the action in either notification order; the extra media notification does not execute the plain-key action too. An unassigned combination does not borrow the plain-key assignment.

Browser media controls do not report modifiers. Every control routed by the extension without an already matched keyboard event waits up to 120ms, then uses the plain-key assignment. This also applies when only one plain key is configured, so an unassigned combination cannot accidentally execute it. Keyboard input selects its exact assignment immediately; an older playback operation may wait while a newer media notification is being classified. If only modifier bindings exist, the original standalone control goes to Netflix instead. No modifier combination is inferred from a browser-only control. Pairing keeps all original candidate key names: for example, if only MediaPlayPause is assigned, a delivered unassigned MediaPlay key still takes precedence and releases its media notification to Netflix. Volume keys still use keyboard events, and ordinary combinations such as Ctrl+K keep their existing routing.

Assigned MediaPlay/MediaPause keys, or a combined MediaPlayPause key, also work through browser play/pause controls. If both kinds are assigned, a delivered keyboard event determines which key's action runs. A browser-only control waits up to 120ms for that event, then uses the separate key's assignment if no keyboard event arrives. The same short wait applies when needed to preserve a physical key's hold-speed interaction. MediaStop, MediaFastForward and MediaRewind use their corresponding browser controls. These notifications run the user's assigned action; when that action is Play / Pause (including subtitle-navigation playback), Play resumes and Pause or Stop pauses without starting hold speed or resetting the position. A combined keyboard MediaPlayPause press retains normal tap/hold behavior in either notification order.

Confirmed newer pause, playback-toggle or seek commands cancel older waiting playback. A browser notification is only tentative until its keyboard partner or 120ms deadline identifies the action. If it turns out to be a custom speed/volume function, it does not cancel playback. An older playback operation may wait for that newer notification to settle; its own pairing window stays 120ms. This prevents both lost playback and an old Play restarting after a newer Stop. Paired commands keep the first notification's order through key release, held-speed activation and delayed captions. Custom forward/rewind intervals in either direction and manual Skip Intro also cancel older waiting playback.

Assigned media keys can also control PiP where supported, including closing an existing PiP window. One press opens or closes PiP once even if its notifications arrive on opposite sides of the focus change. Unassigned controls stay with Netflix; volume keys still require keyboard events. If the recorder receives no keyboard event, browser media-control support during playback cannot record a key for it.

For supported Netflix shortcuts such as Play / Pause, retaining the original key anywhere in the list keeps it assigned. The extension suppresses that original Netflix key only while the action is enabled, has an assigned key, and its list no longer includes the original key. Disabling the action, clearing all its keys or turning off the extension releases that suppression.

## Auto Skip

Open **Playback preferences → Playback automation** in Options to turn on **Intro** or **Recap**. Both are off by default and can be enabled independently. While the extension is enabled, it clicks the matching button when Netflix shows it. Rewinding lets the extension skip the segment again when the button reappears.

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
- The Skip intro shortcut clicks a recognized visible Netflix skip button, including intro, recap, or credits. Intro and Recap automation use their own independent preferences.
- Seeking and subtitle toggling use Netflix's internal player API. If Netflix changes that API, these actions may need an extension update.
- Browser extension pages and content scripts may need a manual reload after manifest, service worker, or content script changes.

See the [behavior specification](behavior-spec.md) for complete shortcut, compatibility, and Picture-in-Picture behavior.
