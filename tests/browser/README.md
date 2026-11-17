# User guide animation regression

Run the development server with `npm run dev`, open `/tests/browser/help-animation.html` on its local URL, and select **Run animation check**. An agent can wait for `#result[data-state="passed"]` or `#result[data-state="failed"]` and assert the output's `pass` value.

The fixture renders the real Options app and samples content height on every animation frame. With reduced motion off, a passing result requires at least two intermediate heights during both opening and closing, zero height when closed, and no clipped content when open. Repeat at a narrow viewport. Add `?all=1` to check the single Expand all / Collapse all button. Frame measurements remain available in the details section.

Keep the grid transition on the child of Radix AccordionContent: its underlying Collapsible primitive temporarily sets its own content node's transition duration to zero while measuring. A transition on that same node skips both animations even though its computed duration later reads 200 ms.

This fixture is excluded from extension builds and does not edit saved settings. It checks the settings interface; it does not establish real Netflix playback behavior.

## Media key recording regression

Open `/tests/browser/media-keys.html` on the development server and select **Run simulated media key checks**. Wait for `#result[data-state="passed"]`; the JSON output must report `pass: true` and `count: 57`. The fixture uses the real Options recorder to save 14 media/volume/browser key names plus five legacy aliases with empty, `Unidentified`, and normal `code` values, reloads each binding through settings normalization, and checks playback shortcut routing for all three event forms. It restores the prior development-page settings when finished and is excluded from extension builds.

The fixture opens Seeking directly so the same checks run with the sidebar hidden on narrow screens. The result stays compact; per-case output is available under **Detailed simulated results**. A physical Mac media key is not guaranteed to reach the Codex in-app browser; repeat hardware diagnosis in the supported Chrome/Edge extension recorder before drawing conclusions about extension behavior.

For hardware diagnosis, open a recorder in the same page, focus its recording area, and press the physical media key. The **Recent keyboard events** panel shows raw `key`/`code`, `isTrusted`, modifiers, and the normalized binding. Synthetic matrix events have `trusted: false`; passing them does not establish Windows/Edge hardware delivery or actual Netflix episode navigation. If the OS/browser consumes a key without delivering a keyboard event, it will not appear in the log.

Validated on 2026-11-16: all 57 browser matrix cases passed at a 480px viewport. Chrome DevTools keyboard input also delivered trusted events for next/previous track, play/pause, stop, and volume up/down/mute, with Save enabled for each. Before the fix, a code-less next-track event reproduced the visible key label and “No conflict detected” message with Save disabled; the same failure was captured for all seven common media/volume keys in the Options regression tests. These browser automation checks do not substitute for a physical Windows/Edge test.

Automated regression command: `npm test -- src/shared/shortcut-bindings.test.ts src/shared/shortcut-assignment.test.ts src/options/options-app.test.tsx src/content/shortcuts/content-shortcuts.test.ts src/content/shortcuts/content-playback-hold.test.ts src/shared/shortcut-routing.test.ts`. This covers saving and reopening bindings, distinct-key conflicts, next/previous episode commands against a player DOM fixture, repeat/disabled/typing behavior, and matching the correct Play / Pause key release. The supported named media/audio keys follow the [W3C keyboard key definitions](https://www.w3.org/TR/uievents-key/#keys-multimedia).

BrowserBack/BrowserForward recording, routing, cancellation and repeat/disabled/typing checks use simulated keyboard events. The Chrome DevTools input tool does not offer trusted BrowserBack/BrowserForward input, so physical browser-navigation keys and OS-level interception remain unverified. The supported-key guide was checked at 480px: searching MediaNextTrack shows all 14 canonical names and five aliases without horizontal overflow.
