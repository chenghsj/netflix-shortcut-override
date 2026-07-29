# Netflix Shortcut Override

This context defines the language used to describe Netflix playback readiness, shortcut routing, and the extension-managed Picture-in-Picture experience. Product behavior and timing requirements live in [docs/behavior-spec.md](docs/behavior-spec.md).

## Language

**Playback context**:
A Netflix watch experience in which the extension can route configured playback shortcuts to the active Netflix player.
_Avoid_: Watch page state, player page

**Compatibility session**:
The period in which the extension observes one active Netflix watch tab and determines whether its playback context is ready for shortcut handling.
_Avoid_: Diagnostics flow, compatibility check

**Playback focus restoration**:
A best-effort handoff of keyboard focus from a dismissed toolbar popup to the same still-visible Netflix playback context.
_Avoid_: Tab activation, video focus

**Netflix playback session**:
The active Netflix player state that owns playback position and transport actions for one watch experience.
_Avoid_: HTML video session, PiP player

**PiP session**:
The interaction lifecycle that presents one Netflix playback session in an extension-managed Picture-in-Picture window until it exits or is closed.
_Avoid_: Native Video PiP, second playback session

**Adopted video**:
The HTML video element currently presented by the PiP session as the visual mirror of its Netflix playback session.
_Avoid_: PiP player, playback owner

**Presentation-ready video**:
The video element in the current playback context most likely to provide a current, visible frame for shortcut handling or PiP presentation.
_Avoid_: First video, active session

**Recoverable video replacement**:
A change to the adopted video that does not provide sufficient evidence that the Netflix playback session moved to another episode.
_Avoid_: Episode transition, video reload

**Episode transition**:
A confirmed change from the current episode's Netflix playback session to the next episode's playback session.
_Avoid_: Video replacement, ended event

**PiP timeline**:
The playback-position control that displays the Netflix playback session's position and submits seek intent without becoming a separate source of playback truth.
_Avoid_: Native video timeline, playback clock

**PiP transport controls**:
The extension-managed playback, seek, volume, and subtitle controls presented within a PiP session.
_Avoid_: Netflix controls, native video controls
