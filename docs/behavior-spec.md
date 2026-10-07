# Behavior specification — Netflix Shortcut Override

Status: Active
Date: 2026-10-04

This document defines observable product behavior. Domain terms have the meanings established in [`CONTEXT.md`](../CONTEXT.md); implementation structure and historical design decisions are outside this specification.

## Shortcut key conflicts

- Conflict checks are scoped to each table and compare physical key codes plus modifiers. Individually disabled rows retain their saved keys but release them for reuse within the table. Individually enabled rows reserve their keys even while the global or subtitle master is off. Unsupported Firefox Picture-in-Picture does not reserve a key.
- Enabling a row or restoring its default key must not silently create an enabled duplicate. If the proposed key belongs to enabled peers, show a popover anchored to the row switch and leave all settings unchanged. Identify the key and every affected action, and explain that transferring disables those actions.
- **Change key** opens the existing recorder. A valid, conflict-free save sets the key and enables the requesting row; cancellation preserves settings. **Use for [action]** enables the requesting row and disables all enabled peers using that key in one settings update, preserving their saved keys and the other table.
- Escape or clicking outside dismisses the popover without saving. Keyboard focus returns to the row switch on dismissal and after closing the recorder opened from it, provided the switch is still available. External settings changes dismiss a pending conflict so old choices cannot reappear.
- Section resets restore unique defaults within their own table. Cross-table overlaps retain subtitle navigation priority; the popover does not transfer keys across tables.

## Compatibility session

- A tab whose load status is `loading` remains in the checking state and does not publish compatibility diagnostics.
- After ten seconds of continuous loading, the popup explains that compatibility will be checked automatically when loading finishes. The extension never reloads the page automatically.
- Each `loading` or `complete` transition starts a new diagnostics generation. A response from an older generation cannot overwrite the current state.
- Missing content-script receivers may be retried according to the shared readiness policy. Stable results and reload-required results stop automatic retries.

## New feature announcement

Implementation reuse is described in [Reusing feature announcements](feature-announcements.md).

- Subtitle navigation remains opt-in. Only an extension update from a version before `0.6.2` to `0.6.2` or later creates its announcement, including skipped releases. First installation, reinstallation, browser updates, and same-version development reloads do not create it. An unread eligible announcement shows `NEW` on the extension icon and in the popup introduction. Once the loaded, visible popup renders that introduction, it records the announcement as seen and clears `NEW` without enabling the feature. A loading or hidden popup does not count as viewing. The current visit keeps the introduction readable until dismissed, navigated away from, or activated; subsequent popup visits hide the seen introduction. The inactive subtitle navigation summary retains a **Go to enable** action.
- **Go to enable** on the introduction retires the announcement and opens the settings page, scrolls to the subtitle navigation section, and moves keyboard focus there. The inactive summary opens the same destination. While subtitle navigation is off, a popover anchored to the master switch shows a brief activation guide and website-access explanation. The switch's visible label is **Enable**. With the global override off, the popover explains that prerequisite first. Clicking the switch does not dismiss the popover while permission is pending or denied. Clicking elsewhere, pressing Escape, or successful activation closes it. Normal settings-page visits do not open it; the existing help tooltip provides feature details. Navigation does not enable the feature or request permissions.
- Successful persisted activation or explicit dismissal clears both the announcement and badge. Denied permissions or failed settings saves do not restore a viewed introduction or badge; retry remains available in Options. A failed dismissal shows a retryable error. If recording a view fails, the badge remains unread and viewing the introduction again retries.
- Local eligibility, seen state, and acknowledgement keyed by feature ID survive browser restarts and extension updates. An unread announcement remains available through later updates, but those updates never recreate a viewed badge or dismissed announcement. Disabling an activated feature does not show the same announcement again. Announcement state is separate from synced settings and settings backups and is cleared by uninstalling.
- Updates never automatically open a tab or show an operating-system notification for this announcement.

## Playback focus restoration

- Passive popup dismissal delegates focus restoration to the background service worker.
- A request remains pending for at most 30 seconds while the same active, visible playback context finishes loading and reports fresh readiness.
- Changing tab or window, closing the tab, or leaving the playback context cancels the request.
- Once eligible, the page receives at most three `window.focus()` attempts, 100 milliseconds apart, and reports whether focus was acquired.
- The extension does not focus the HTML video element, Netflix player element, or document body.
- Restart-safe pending state contains only the tab ID, window ID, an opaque request ID, and a deadline.

## PiP session and video selection

- A PiP session uses Document Picture-in-Picture and retains only one Netflix playback session. The adopted video mirrors that session's visuals and events without creating another session.
- Initial entry considers every attached video in the current playback context. Recoverable replacement considers every attached video in its connected current or remembered Netflix player roots, excluding the adopted video while it remains in PiP.
- The complete candidate set is ranked globally, in this order: a current frame, active playback, valid intrinsic dimensions, then larger rendered area.
- Player-root preference may break a tie, but it cannot allow a lower-ranked candidate in an old root to beat a higher-ranked candidate in another eligible root.
- The user may resize the browser-owned PiP window. The video preserves its aspect ratio and uses black bars rather than stretching when the window ratio differs.
- The preferred initial width is 640 CSS pixels; initial height follows the adopted video's intrinsic or rendered aspect ratio.
- Netflix layout or style changes must not dislodge the adopted video from the PiP viewport. Restoring the video must also restore its original source placement and inline presentation.

## PiP timeline and transport controls

- The PiP timeline reads media state for display and submits seek requests through the Netflix playback session. It never assigns native `video.currentTime`.
- A timeline click submits an immediate absolute position. Keyboard seeking submits a relative movement from the current position.
- During a drag, the timeline previews locally and submits one seek when the pointer is released.
- After submission, the requested position remains visible while stale media events are ignored. Normal updates resume when Netflix reports the requested position.
- A rejected request or a three-second confirmation timeout restores the latest reported media position.
- Releasing or cancelling a timeline interaction returns focus to the PiP document so the next configured shortcut can be handled.
- Playback-control state follows reported Netflix playback events; it does not assume a requested command succeeded.
- The first primary click on the PiP video requests play or pause while allowing the browser to focus the PiP window. Timeline clicks do not trigger this video-click action.
- Controls overlay the video and hide after three seconds of pointer inactivity. Shortcut feedback remains a separate transient overlay.

## Shortcut feedback

- A handled shortcut may show transient visual feedback without taking focus or blocking playback interaction.
- Repeated volume or speed actions update the visible feedback in place. Repeated seeks in the same direction accumulate during the feedback window; changing direction starts new feedback.
- Play / Pause hold feedback remains visible while hold speed is active and disappears after release.
- Using Increase Speed, Decrease Speed, Preferred Speed, or Reset Speed while hold speed is active ends the hold interaction immediately. Its hint disappears, the explicit speed command becomes the new persistent speed, and releasing Play / Pause does not restore the pre-hold speed or toggle playback.
- Feedback shown in the PiP window scales with the window, stays within the video viewport, and remains visually separate from mirrored subtitles and transport controls.

## Netflix subtitles

- The configurable subtitle shortcut toggles the active Netflix playback session's native subtitle track.
- Turning subtitles off remembers the selected track. Turning them on restores the same track when it remains available, otherwise it selects the first available non-off track.
- A successful shortcut shows the same subtitle-settings icon used by PiP controls in the standard circular, text-free transient hint. The icon is white when subtitles are enabled and dimmed when they are disabled. If the Netflix subtitle API is unavailable, it reports failure without guessing from transient subtitle DOM content.
- When PiP opens, it reads the active Netflix playback session's native subtitle state and uses that state to initialize the subtitle switch and mirrored-subtitle visibility. The extension's last stored PiP subtitle-visibility value is only a fallback when the Netflix API state is unavailable.
- In PiP, the subtitle switch toggles Netflix's native subtitle track and updates mirrored-subtitle visibility from the API's resulting state. Using the subtitle shortcut inside PiP updates the same switch and stored fallback value. Once a subtitle action is issued from PiP, a successful API result updates the stored fallback even if PiP closes before the result arrives.

## Settings backup and restore

- Export produces a versioned JSON backup containing the complete normalized settings state and source metadata.
- Import validates the backup format, metadata, supported settings version, and every required field for the current settings schema before previewing or writing anything.
- Older supported settings versions may be migrated through the same normalization rules used for synced settings. A newer or malformed settings version is rejected.
- Import shows a summary and requires explicit confirmation before replacing current settings. A validation or storage failure leaves the current settings unchanged and reports the failure.
- The import summary separates general shortcut counts from subtitle navigation and shows the subtitle navigation master switch, enabled-key count, and all four configured bindings with their individual enabled states. Export and restore include these settings even when the master switch is off.

## Recoverable video replacement and episode transitions

- Detachment, `error`, `ended`, or `emptied` starts bounded replacement handling. While replacement handling is pending, PiP video clicks are consumed without sending playback commands.
- A different HTML video element is not, by itself, evidence of an episode transition.
- After `ended` or `emptied`, a replacement element confirms an episode transition only when it was not observed in the candidate set before the boundary. A sibling video observed before the boundary cannot confirm a transition, but it may remain eligible as a recoverable replacement.
- Reuse of the adopted video confirms an episode transition only when playback previously advanced beyond 30 seconds, restarts at or before 30 seconds after the boundary, and the restart was not caused by an observed user seek.
- An `emptied` event starts a new media-resource boundary and supersedes seek evidence recorded before that event. A seek observed after the boundary still prevents a playback reset from being classified as an automatic episode transition.
- A confirmed episode transition closes PiP without activating or focusing the Netflix playback context. The extension does not pause, resume, or otherwise override the next episode's playback state; autoplay follows Netflix and the active profile setting consistently in Chrome and Edge. If a distinct next-episode video already owns the source playback context, the obsolete adopted video is released with the PiP window instead of being restored beside it; if Netflix reuses the adopted video for the next episode, that video is restored normally.
- After PiP closes, the source page must show the next title and expose working playback, seek, volume, episode, audio/subtitle, and fullscreen controls regardless of whether Netflix leaves the episode playing or paused.
- A replacement without sufficient episode-transition evidence is recoverable. The PiP session adopts the best presentation-ready candidate and keeps the same PiP window open.
- The PiP session remembers the last valid intrinsic dimensions across a recoverable replacement. A candidate without metadata temporarily uses that aspect ratio until valid replacement dimensions arrive.

## Recovery limits and cleanup

- If no usable presentation-ready candidate appears within eight seconds, the PiP session closes instead of leaving a permanent black window.
- A recovery cycle starts when the adopted video is detached, fails, or is replaced, and completes when that video recovers or another video is adopted.
- Three recovery cycles started within a rolling five-second window are considered unstable, even if every cycle completes successfully. The PiP session closes on the third cycle; after five continuous seconds without another cycle, earlier cycles no longer count.
- Normal click controls resume when the adopted video recovers without an episode transition.
- Explicit exit, PiP-window `pagehide`, destruction, leaving the playback context, or manually changing the source tab to a different `/watch/<id>` restores the currently adopted video and closes PiP. Manual episode selection does not pause playback in the source tab. Query-string changes for the same watch ID do not end the PiP session.
- Cleanup is idempotent. Late events from an old video or closed PiP session cannot change current bindings or visible state.

## Validation boundary

Automated tests verify extension behavior against controlled browser and Netflix-player substitutes. They do not prove production Netflix element identity, player-session ordering, event timing, or episode-navigation behavior; those remain real-browser acceptance checks.

## Subtitle navigation shortcuts

- Subtitle navigation has a master switch, off by default, plus independently enabled and editable bindings. Default keys are A (previous), D (next), S (replay once), and W (play/pause).
- Turning on the subtitle master in either build calls the browser permissions API directly from the user gesture for the existing Netflix and subtitle CDN hosts. Already-granted access proceeds without another prompt. The master remains off and disabled while awaiting approval; denial or failure leaves settings unchanged, displays localized retry guidance, and permits another attempt. Turning the global override off or closing Options invalidates a pending approval so it cannot later enable the master. Turning the subtitle master off neither requests nor revokes host access.
- Turning off the global shortcut override disables the subtitle navigation controls while retaining their configured master and row states. Its help tooltip remains available and explains the dependency.
- The section reset restores all four default bindings and their enabled states while preserving its master switch and other settings. Individual row resets remain available while the global override is enabled. With only the subtitle navigation master off, keys can still be edited and reset, but row switches are disabled. The ordinary shortcut reset leaves subtitle navigation unchanged. Both tables use the same column layout, and the subtitle explanation is presented in the title help tooltip.
- Enabled subtitle navigation bindings take priority over ordinary bindings. A disabled master or row releases its subtitle navigation binding. Ordinary configured shortcuts may still use that key. Editable fields retain their typing behavior.
- The popup shows a separate read-only subtitle navigation summary using saved bindings and row states. It collapses to its title and a localized inactive status whenever the global override or subtitle master is off. With both enabled, all four actions appear, with disabled rows labeled accordingly. Ordinary enabled shortcuts sharing a physical key and modifiers with an enabled subtitle row show a localized subtitle-priority status and identify the overriding action in its tooltip. Settings changes refresh the summary; the popup neither edits subtitle settings nor requests website access.
- A/D seek to distinct subtitle starts through the Netflix playback session and preserve playing/paused state. S seeks to the most recently started subtitle and explicitly starts playback. W toggles playback immediately without entering hold-speed mode.
- Subtitle acquisition uses the selected track identity. A selected-track reference is resolved through the track catalog before bounded internal lookup. Acquisition never changes the selected language.
- Chromium caption requests and responses cross the content-script/page boundary as JSON strings, with message identity and payload validation. Firefox retrieves metadata through the background's MAIN-world API execution path, independently of the page bridge. Both paths use the same player-session and selected-track lookup.
- Before fetching a validated subtitle URL, the background checks granted host access for that exact HTTPS origin. Missing access returns `CAPTION_PERMISSION_REQUIRED` without a CDN request, shows a localized permission hint, and allows retry after the user grants access. Acquisition never requests permissions; only the Options master-switch gesture initiates a request, and the browser owns approval.
- A video/session/track change invalidates cached timings. Playback toggles from shortcuts, PiP mouse controls, or native video play/pause events cancel pending navigation while keeping valid timings cached. The replay action does not cancel itself when starting playback.
- Caption delivery has a 12-second response deadline. Failure clears the busy state so the user can retry. Bridge, track, download, parsing, and seek failures are localized; diagnostics contain codes rather than signed URLs. A/D/S have no success or boundary hints. A subtitle download keeps a loading text label with a small spinner visible until delivery finishes, fails, or navigation is cancelled; cache hits show no loading hint. The spinner takes 1.6 seconds per revolution and respects reduced-motion preferences. Failures use the volume-value text label style without a central icon and stay visible for 5 seconds. W retains the playback icon hint.
- Disabling subtitle navigation or the pending action's row cancels its navigation intent. Re-enabling the row before delivery does not revive that intent. A late delivery response cannot seek or resume playback. Disabling a different row preserves the pending action.
- Closing the window that owns a pending subtitle action cancels it on `pagehide`. A late PiP response cannot seek or resume the restored source video; lifecycle listeners are removed when the action completes.
