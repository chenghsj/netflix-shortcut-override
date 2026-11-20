# Changelog

## v0.7.1

- Added Spanish, Brazilian Portuguese, French, German and Indonesian. The extension now has ten interface languages across Settings, the toolbar popup, the user guide and playback controls. Use automatic browser language detection or choose a language in Settings.
- Find settings, shortcuts and help in all ten languages. Search also matches words typed without Latin accents.
- Fixed shortcut labels for characters recorded on other keyboard layouts, including `;` on French AZERTY and `ß` on German QWERTZ. Shortcuts continue to use the recorded physical key position.

## v0.7.0

### Shortcuts

- Assign up to three keys per action. Options checks each key for conflicts. The popup, search, sync and backups include every saved key.
- Assign media track keys alongside regular episode shortcuts. Record supported media, volume, browser navigation and Caps Lock keys when the browser delivers them. Browser Media Session controls support configured play, pause, stop, seek and track actions. A physical press that arrives through both paths runs once.
- Step frames, change episodes, cycle subtitle sizes or languages, and switch audio tracks. Add custom forward and rewind pairs, percentage jumps and preferred-speed shortcuts. The episode picker waits briefly for Netflix to make its controls available.
- Set built-in and custom seek intervals from 1 to 300 seconds. Playback speed limits, preferred speeds, speed adjustments and hold speed can reach `5x`.

### Playback and settings

- Cycle through your favorite subtitle languages and audio tracks. Regional favorites can match a track with the same language and no region tag. Standard audio and Audio Description have separate favorites.
- Jump to the adjacent subtitle while paused. Previous-subtitle navigation handles gaps between cues and refreshes Netflix's subtitle display after seeking. On Chrome and Edge, Picture-in-Picture keeps separate lines of subtitles readable above its controls.
- Choose whether to skip intros or recaps, advance automatically to the next episode, or hide Netflix's pause overlay. Find these controls in Playback preferences.
- Browse the searchable Options guide in all five interface languages, including a list of supported special keys. The toolbar popup opens with search focused. Options and the popup include a Report an issue link. Backup and restore has a confirmed Restore defaults action.

### Upgrading from v0.6.8

- The new defaults are `Shift+P` for Previous episode, `Shift+N` for Next episode and `P` for Picture-in-Picture. Upgrades preserve saved keys. If an enabled Picture-in-Picture shortcut already uses `Shift+P`, choose a different key for Previous episode or reassign the key in Options.
- Older saved seek intervals above 300 seconds become 300 seconds. They keep their assigned keys and enabled state. Settings schema v33 adds multiple keys per action and can recover additional keys when an older beta syncs settings.
- This release requires Chrome 111+, Edge 111+ or Firefox Desktop 128+. Picture-in-Picture with subtitles requires Chrome or Edge 116+.

## Release notes

The release workflow publishes these notes with commits since the previous stable release. Prereleases use the previous version tag.

Use `npm run changelog -- --tag v0.1.0 --output release-notes.md` to preview release notes locally after the repository has tags.
