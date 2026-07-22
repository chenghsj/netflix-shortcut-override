# Netflix Shortcut Override

This context describes how the extension recognizes Netflix playback readiness and coordinates shortcut behavior.

## Language

**Compatibility session**:
The period in which the extension observes one active Netflix watch tab and determines whether shortcut playback capabilities are ready or require a page reload.
_Avoid_: Diagnostics flow, compatibility check

- A tab whose load status is `loading` remains in the checking state and does not publish diagnostics.
- After ten seconds of continuous loading, the popup explains that compatibility will be checked automatically when loading finishes; it never reloads the page automatically.
- Each `loading`/`complete` transition starts a new diagnostics generation so an older response cannot overwrite the current state.

**Playback focus restoration**:
A best-effort handoff of keyboard focus from a dismissed toolbar popup to the still-visible Netflix watch page.
_Avoid_: Tab activation, video focus

- The popup delegates the handoff to the background service worker when it is passively dismissed.
- The request remains pending for at most 30 seconds while the same active, visible watch tab finishes loading and reports fresh playback readiness.
- The request is cancelled when the user changes tab or window, closes the tab, or leaves the watch page.
- Once eligible, the page receives up to three `window.focus()` attempts, 100 ms apart, and reports whether focus was acquired. The extension does not focus Netflix's video, player, or document body.
- Pending state in `chrome.storage.session` contains only the tab ID, window ID, an opaque request ID, and deadline so a restarted service worker can continue the same handoff.
