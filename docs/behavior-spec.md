# Behavior specification — Netflix Shortcut Override

Status: Active
Date: 2026-07-26

This document defines observable product behavior. Domain terms have the meanings established in [`CONTEXT.md`](../CONTEXT.md); implementation structure and historical design decisions are outside this specification.

## Compatibility session

- A tab whose load status is `loading` remains in the checking state and does not publish compatibility diagnostics.
- After ten seconds of continuous loading, the popup explains that compatibility will be checked automatically when loading finishes. The extension never reloads the page automatically.
- Each `loading` or `complete` transition starts a new diagnostics generation. A response from an older generation cannot overwrite the current state.
- Missing content-script receivers may be retried according to the shared readiness policy. Stable results and reload-required results stop automatic retries.

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

## Recoverable video replacement and episode transitions

- Detachment, `error`, `ended`, or `emptied` starts bounded replacement handling. While replacement handling is pending, PiP video clicks are consumed without sending playback commands.
- A different HTML video element is not, by itself, evidence of an episode transition.
- After `ended` or `emptied`, a replacement element confirms an episode transition only when it was not observed in the candidate set before the boundary. A sibling video observed before the boundary cannot confirm a transition, but it may remain eligible as a recoverable replacement.
- Reuse of the adopted video confirms an episode transition only when playback previously advanced beyond 30 seconds, restarts at or before 30 seconds after the boundary, and the restart was not caused by an observed user seek.
- An `emptied` event starts a new media-resource boundary and supersedes seek evidence recorded before that event. A seek observed after the boundary still prevents a playback reset from being classified as an automatic episode transition.
- A confirmed automatic episode transition closes PiP without activating or focusing the Netflix playback context. If a distinct next-episode video already owns the source playback context, the obsolete adopted video is released with the PiP window instead of being restored beside it; if Netflix reuses the adopted video for the next episode, that video is restored normally. The confirmed video and replacements in its player root remain eligible for the pause guard. If Netflix replaces that root, the guard may follow the replacement after the old root disconnects; if Netflix keeps the old root mounted, a different-root video becomes eligible only after the watch ID or title advances and it is the presentation-ready video.
- Each eligible next-episode `playing` attempt is paused after Netflix's handlers for that event complete and before the next browser rendering opportunity. This lets Netflix bind the new playback session, title, and controls without intentionally presenting advancing playback. Unrelated player roots without next-episode identity evidence are not affected.
- The Netflix playback session is synchronized to paused as soon as the next title is bound, with a fixed fallback deadline two seconds after the first guarded playback attempt when metadata never appears. After PiP closes, the source page must show the next title, remain paused, and expose working playback, seek, volume, episode, audio/subtitle, and fullscreen controls.
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
