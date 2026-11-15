# Netflix Shortcut Override

Canonical product terms shared by the interface and project documentation. Playback and Picture-in-Picture terms are defined in [CONTEXT.md](CONTEXT.md).

## Language

**Subtitle navigation**:
Optional keyboard actions for moving to the previous or next subtitle, replaying the current subtitle once, or toggling playback. The feature has its own master switch and requires the global shortcut override to be enabled.
_Avoid_: Subtitle practice, subtitle exercise

**Shortcut routing**:
Choosing which enabled action handles a configured key during playback. Available general shortcuts retain keys shared with subtitle navigation.
_Avoid_: Shortcut dispatch policy, key priority pipeline

**Shortcut assignment**:
A saved key and enabled state for an action, with key ownership shared across general shortcuts and subtitle navigation. Transferring a key disables its previous action, including both directions when that action belongs to a seek pair.
_Avoid_: Key ownership transaction, binding transfer pipeline

**Shortcut edit**:
A change to a shortcut assignment and its associated seek interval, preferred speed, or subtitle sizes. These values are saved together while the original entry remains current; unrelated preferences are retained.
_Avoid_: Edit transaction, binding draft pipeline

**Seek pair**:
Forward and rewind shortcuts that share one time interval and keep separate saved keys. Transferring either key disables both directions.
_Avoid_: Seek action group, two independent seek intervals

**Shortcut catalogue**:
The configured shortcuts and their relationships, including seek pairs, preferred speeds, and the hold-speed setting associated with Play / Pause.
_Avoid_: Shared row layout, rendered shortcut tree
