# Media Session event flow and regression matrix

## Input flow

`media-session-routing.ts` owns notification pairing and its observer/listener
lifetime. `playback-request-arbiter.ts` owns tentative/confirmed cancellation and
deferred transport. `index.ts` supplies settings, PiP and command/request wiring.

1. Assign each keyboard or Media Session notification a monotonic order and timestamp. Match the oldest compatible notification from the opposite source, within the original 120ms window and the same watch/document context. Keep all original candidate key names while waiting.
2. A Media Session notification without a partner registers possible effects, not a confirmed playback command. Its plain binding is only the standalone fallback. Keyboard input selects its exact key and modifiers immediately.
3. Confirm the actual effect when the key is routed or the fallback deadline expires. A custom speed/volume action removes a tentative playback effect. A successful seek, including manual Skip Intro, confirms a seek barrier. Resolve and route together before releasing blocked playback.
4. Confirmed newer opposing playback, toggles and seeks cancel older waiting playback; same-direction Play/Play and Pause/Pause remain independent. A newer unresolved input can temporarily hold playback until its own key or deadline determines whether it cancels anything. This can delay transport beyond the older input's pairing deadline, but never extends the time in which that older input accepts a keyboard partner.
5. All effects retain the first notification's order through explicit command/request parameters. The hold controller owns the initiating request for key release and activation; asynchronous caption completion carries the same origin. Input cancellation from the same or an older receipt cannot stop a newer hold. A hold waiting for classification changes neither rate nor playback; releasing/canceling it restores state only if its effect was applied. A watch transition cancels the hold, restores its temporary rate and never restores old playback into the new watch context.
6. Released native controls use their original request ID/details and Netflix's latest handler once. Native Play/Pause/Stop and relative seek controls are observed while media routing is active, including between a keyboard-first notification and its later media partner. They remain native unless pairing or supersession consumes them.
7. Global/row/binding changes, blur and teardown discard unresolved pairs and gated playback. Already-routed subtitle downloads retain their separate cancellation policy: switch/action changes, playback, session changes and closing the window. A watch transition clears pending media work and holds even when returning to the same watch ID. Video replacement, closed windows and typing invalidate deferred playback. Handled PiP-toggle receipts alone may survive the focus transition within their original window.

## Automated matrix

| Dimension | Cases | Evidence |
| --- | --- | --- |
| Action, modifiers, source order | Play, Pause, Stop, forward, rewind, previous/next track × Ctrl/Alt/Shift/Meta × keyboard-first/media-first; custom action once, standalone plain fallback afterward | `content-media-session.test.ts`: “routes exact … once” (56 cases) |
| Confirmed cancellation | Earlier Play/Pause/Toggle × newer Play/Pause/Toggle/Seek, already confirmed or confirmed later; identical timestamps with distinct receipt orders | `playback-request-arbiter.test.ts`: confirmed-effect matrix (24 cases) |
| Tentative classification | Earlier Play/Pause/Toggle × later confirmed Play/Pause/Toggle/Seek or unrelated custom action | `playback-request-arbiter.test.ts`: tentative-effect matrix (15 cases) |
| Cancellation independence | A real seek cancellation survives withdrawal of another tentative canceller; clear cannot revive queued playback | `playback-request-arbiter.test.ts` |
| Actual key overrides guessed fallback | Guessed Pause resolves to speed before or after the earlier Play deadline; guessed custom Play resolves to playback after native Stop, keyboard Pause or seek | `content-media-session.test.ts`: tentative cancellation and guessed-custom cases |
| Custom relative seeking | Forward/backward direction actions; Play → seek holds and cancels the older Play; seek → Play retains the newer Play | `content-media-session.test.ts`: custom-relative ordering cases (4 cases) |
| Delayed native partner | Unassigned native Play cannot replay after newer Stop, in either notification order; native relative seeks cancel older waiting Play; deferred native fallback rechecks typing/video; handled partners remain consumed after loading/typing changes | `content-media-session.test.ts`: “older unassigned native Play” |
| Key release and hold | Short press released during tentative cancellation; active hold while later Pause becomes custom input or confirmed Pause; original rate/state restored only after an applied hold; controller-owned request rejects cancellation from older/equal receipts | `content-media-session.test.ts`, `content-playback-hold.test.ts`, `shortcut-command-controller.test.ts` |
| Async captions and seeking | Cached/delayed subtitle acquisition, original receipt ordering, newer playback preservation, ordinary/frame/custom/PiP/automatic/manual-intro seeking | `content-media-session.test.ts`, `subtitle-navigation.test.ts`, `shortcut-command-controller.test.ts` |
| Lifecycle | Global/row disable and re-enable, binding edits, blur, watch away-and-back, video replacement, loading, typing, closed PiP and focus transitions | `content-media-session.test.ts`, PiP/controller/subtitle tests |
| Pair cardinality | Interleaved keys, repeated same-source input, equal timestamps, completed pair followed by another command, expired receipts | `content-media-session.test.ts` |
| Native bridge | Original browser details, latest site registration, reinjection, malformed events, unsupported actions, disable/abort restoration | `media-session-bridge.test.ts` |
| Settings/UI | Three-key round trips, conflicts/transfer, stale drafts, legacy backups, restore/import lifetimes; saved Markdown label; popup search focus on opening/reopening, control focus preserved on updates, Options without search autofocus | `multiple-shortcuts.test.ts`, settings/assignment/editor tests, `options-app.test.tsx`, `popup-app.test.tsx` |
| Subtitle selection/refresh | Cue ends, overlaps/gaps/boundaries, paused native refresh readiness/retries/cancellation; serialized executor | shared subtitle and `netflix-precise-seek.test.ts` tests |

## Verification

Run the complete coverage suite, lint and both browser builds after the targeted matrix passes. Review all staged, unstaged and untracked files against HEAD, covering runtime/media behavior separately from settings/UI/build standards, then deduplicate and reproduce findings before reporting.

These are simulated browser/player inputs. Installed Netflix playback, physical media-key delivery and OS/browser interception require the [installed-browser checklist](chrome-real-browser-test.md#multiple-shortcuts-and-media-track-controls); automated matrix results do not establish that acceptance.

## Final review — 2026-11-19

Reviewed the complete staged, unstaged and untracked changes against HEAD `80be7e6a8e53b1f9e062450ddcf2115ce815b42c`. The review covered media/runtime behavior, subtitle selection/refresh, settings/backup compatibility, editors/conflicts/search, reset/import lifetimes, popup/help and build integration. Independent runtime/spec and settings/standards reviews found no remaining actionable introduced issues after fixes and re-verification. A further structural/equivalence review checked extraction of media routing from the content entry point; request ordering, pairing deadlines, native acknowledgments and lifecycle behavior were preserved.

The review also reproduced and fixed deferred native fallback after typing/video replacement, unassigned native relative-seek cancellation, native Stop during an active hold, watch round trips during holds, and handled keyboard partners arriving before loading/typing changes. Custom relative directions now use the command resolver for effect classification; four regressions verify both directions and both Play/seek command orders. Already-routed caption fetching across blur is baseline behavior and was not treated as a new regression.

Playback coordination now uses one dispatcher hook. Explicit request parameters
replace the entry point's ambient context, and the hold controller owns its
initiating request through release and cancellation. The existing event matrix
and three controller-level cancellation-order cases verify this simplification.

| Final check | Result |
| --- | --- |
| Complete coverage suite | 1,692 tests in 92 files passed |
| Coverage | Lines 93.56%; branches 83.13%; enforced thresholds passed |
| TypeScript, ESLint, whitespace checks | Passed |
| Chromium and Firefox production builds + artifact verification | Passed |
| Firefox package lint | 0 errors, 0 notices, 4 warnings: two minimum-version warnings for `data_collection_permissions`, two `innerHTML` warnings in bundled React DOM code |
| Independent reproductions of final runtime fixes | Five cases passed |
| Physical media keys / installed Netflix acceptance | Not exercised in this review |

No commit, release or deployment was performed.
