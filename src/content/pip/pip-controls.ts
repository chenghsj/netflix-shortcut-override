import type { PlaybackCommandResult } from '@/content/netflix-playback-session'
import { mediaHintIcons } from '@/content/hints/hint-definitions'
import { EN_PIP_CONTROLS_COPY, type PipControlsCopy } from '@/shared/i18n'
import type { PipSettings } from '@/shared/shortcut-types'
import { createPipSubtitleMenu } from './pip-subtitle-menu'
import { createPipTimelineController } from './pip-timeline-controller'

const PIP_CONTROLS_MARKER = 'shortcutOverridePipControls'
const PIP_CONTROL_MARKER = 'shortcutOverridePipControl'
const PIP_CONTROLS_STYLE_MARKER = 'shortcutOverridePipControlsStyle'
const IDLE_HIDE_DELAY_MS = 3_000

type PipControlAction = 'playPause' | 'seekBackward' | 'seekForward' | 'mute'

export type PipControlsSettings = {
  seekSeconds: number
  pip: PipSettings
  copy: PipControlsCopy
}

const DEFAULT_CONTROLS_SETTINGS: PipControlsSettings = {
  seekSeconds: 10,
  pip: {
    subtitlesEnabled: true,
    subtitleSize: 'medium',
    subtitleBackground: 'translucent',
  },
  copy: EN_PIP_CONTROLS_COPY,
}

const withSeconds = (template: string, seconds: number): string =>
  template.replace('{seconds}', Math.round(seconds).toString())

const seekIcon = (direction: -1 | 1): string =>
  direction === -1 ? mediaHintIcons.rewindDirection : mediaHintIcons.forwardDirection

const volumeIcon = (muted: boolean): string =>
  muted ? mediaHintIcons.mute : mediaHintIcons.volume

const playbackIcon = (paused: boolean): string =>
  (paused ? mediaHintIcons.playbackPlay : mediaHintIcons.playbackPause).replace(
    '<svg ',
    '<svg aria-hidden="true" '
  )

const subtitleIcon = (): string =>
  '<svg data-pip-icon="subtitles" viewBox="0 0 26 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect data-pip-icon-part="subtitle-frame" x="2" y="3" width="22" height="18" rx="3"/><path data-pip-icon-part="subtitle-lines" d="M6 11.5h7.5M16 11.5h4M6 16.5h3.5M12.5 16.5H20"/></svg>'

export type PipControlsOptions = {
  pipWindow: Window
  video: HTMLVideoElement
  videoArea: HTMLElement
  seekTo: (milliseconds: number) => Promise<PlaybackCommandResult>
  resumeAfterSeek?: () => Promise<PlaybackCommandResult>
  onVisibilityChange?: (visible: boolean) => void
  settings?: PipControlsSettings
  onAction?: (action: PipControlAction) => void
  onVolumeChange?: (volume: number) => void
  onPipSettingsChange?: (settings: PipSettings) => void
}

const STYLE_TEXT = `
[data-shortcut-override-pip-controls] {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  flex-direction: column;
  box-sizing: border-box;
  padding: 0 16px 10px;
  color: #fff;
  font-family: Arial, sans-serif;
  background: linear-gradient(to top, rgba(0, 0, 0, .82) 0%, rgba(0, 0, 0, .46) 7%, rgba(0, 0, 0, .18) 13%, rgba(0, 0, 0, 0) 20%);
  opacity: 1;
  transition: opacity 160ms ease;
  pointer-events: none;
}

[data-shortcut-override-pip-controls][data-visible="false"] { opacity: 0; }

[data-shortcut-override-pip-controls] [data-shortcut-override-pip-control] { pointer-events: auto; }
[data-shortcut-override-pip-controls] button:not(:disabled),
[data-shortcut-override-pip-controls] input:not(:disabled),
[data-shortcut-override-pip-controls] [data-pip-control="subtitle-option"] { cursor: pointer; }
[data-shortcut-override-pip-controls] button:disabled,
[data-shortcut-override-pip-controls] input:disabled { cursor: not-allowed; }

[data-pip-control="timeline-shell"] {
  width: 100%;
  height: 12px;
  margin-bottom: 2px;
}

[data-pip-control="timeline"] {
  --pip-progress: 0%;
  --pip-track-height: 3px;
  display: block;
  width: 100%;
  height: 12px;
  margin: 0;
  appearance: none;
  border-radius: calc(var(--pip-track-height) / 2);
  outline: none;
  background: transparent;
  cursor: pointer;
}

[data-pip-control="timeline"]:hover,
[data-pip-control="timeline"]:focus-visible,
[data-pip-control="timeline"][data-dragging="true"] { --pip-track-height: 5px; }

[data-pip-control="timeline"]:focus-visible,
[data-pip-control="volume"]:focus-visible,
[data-pip-control="subtitle-switch"]:focus-visible,
[data-pip-control="subtitle-size-option"] input:focus-visible {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, .88);
}

[data-pip-control="timeline"]::-webkit-slider-runnable-track {
  height: var(--pip-track-height);
  border-radius: calc(var(--pip-track-height) / 2);
  background: linear-gradient(to right, #e50914 0%, #e50914 var(--pip-progress), rgba(255, 255, 255, .78) var(--pip-progress), rgba(255, 255, 255, .78) 100%);
}

[data-pip-control="timeline"]::-webkit-slider-thumb {
  width: 12px;
  height: 12px;
  margin-top: calc((var(--pip-track-height) - 12px) / 2);
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: #e50914;
}

[data-pip-control="timeline"]::-moz-range-track {
  height: var(--pip-track-height);
  border-radius: calc(var(--pip-track-height) / 2);
  background: rgba(255, 255, 255, .78);
}

[data-pip-control="timeline"]::-moz-range-progress {
  height: var(--pip-track-height);
  border-radius: calc(var(--pip-track-height) / 2);
  background: #e50914;
}

[data-pip-control="timeline"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: #e50914;
}

[data-pip-control="bottom-row"] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  min-height: 30px;
  gap: 8px;
}

[data-pip-control="time"] {
  justify-self: start;
  color: rgba(255, 255, 255, .96);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

[data-pip-control="transport"],
[data-pip-control="actions"] {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
}

[data-pip-control="transport"] { justify-self: center; }
[data-pip-control="actions"] { justify-self: end; }

[data-pip-control][data-action] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 3px;
  border: 0;
  border-radius: 5px;
  color: rgba(255, 255, 255, .94);
  background: transparent;
  cursor: pointer;
}

[data-pip-control][data-action]:hover,
[data-pip-control][data-action]:focus-visible,
[data-pip-control][data-action][aria-expanded="true"] { background: rgba(255, 255, 255, .18); }

[data-pip-control][data-action]:focus-visible {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, .88);
}

[data-pip-control][data-action] svg { width: 22px; height: 22px; }
[data-pip-control="seek-backward"] svg,
[data-pip-control="seek-forward"] svg { width: 25px; height: 25px; }
[data-pip-control="subtitles-button"] svg { width: 21px; height: 21px; }
[data-pip-control="seek-backward"],
[data-pip-control="seek-forward"] { padding: 1px; }
[data-pip-control="mute"] svg { width: 23px; height: 23px; }

[data-pip-control="volume"] {
  width: 70px;
  height: 16px;
  margin: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

[data-pip-control="volume"]::-webkit-slider-runnable-track {
  height: 2px;
  border-radius: 1px;
  background: rgba(255, 255, 255, .76);
}

[data-pip-control="volume"]::-webkit-slider-thumb {
  width: 8px;
  height: 8px;
  margin-top: -3px;
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: #fff;
}

[data-pip-control="volume"]::-moz-range-track {
  height: 2px;
  border-radius: 1px;
  background: rgba(255, 255, 255, .76);
}

[data-pip-control="volume"]::-moz-range-progress {
  height: 2px;
  border-radius: 1px;
  background: #fff;
}

[data-pip-control="volume"]::-moz-range-thumb {
  width: 8px;
  height: 8px;
  border: 0;
  border-radius: 50%;
  background: #fff;
}

[data-pip-control="subtitles-button"][data-enabled="false"] { color: rgba(255, 255, 255, .52); }

[data-pip-control="subtitle-menu"] {
  position: absolute;
  right: 16px;
  bottom: 50px;
  width: 190px;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 8px;
  color: #fff;
  background: rgba(31, 31, 38, .97);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .38);
  font-size: 13px;
  font-weight: 700;
}

[data-pip-control="subtitle-menu"][data-open="false"] { display: none; }
[data-pip-control="subtitle-menu"] button { font: inherit; }

[data-pip-control="subtitle-heading-row"],
[data-pip-control="subtitle-panel-heading"] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, .22);
  font-size: 14px;
  font-weight: 700;
}
[data-pip-control="subtitle-heading-row"] { padding-left: 4px; }

[data-pip-subtitle-panel][data-active="false"] { display: none; }

[data-pip-control="subtitle-nav-list"],
[data-pip-control="subtitle-options"] {
  display: grid;
  gap: 4px;
  padding-top: 8px;
}

[data-pip-subtitle-nav],
[data-pip-control="subtitle-back"] {
  border: 0;
  color: #fff;
  background: transparent;
  cursor: pointer;
}

[data-pip-subtitle-nav] {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 4px;
  text-align: left;
}

[data-pip-subtitle-nav-value] { color: rgba(255, 255, 255, .72); }
[data-pip-subtitle-nav]::after {
  content: '';
  width: 6px;
  height: 6px;
  box-sizing: border-box;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  justify-self: center;
  transform: rotate(45deg);
}

[data-pip-control="subtitle-panel-heading"] {
  justify-content: flex-start;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
}
[data-pip-control="subtitle-back"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 22px;
  padding: 0;
  line-height: 1;
}
[data-pip-control="subtitle-back"]::before {
  content: '';
  width: 6px;
  height: 6px;
  box-sizing: border-box;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  transform: translateX(5px) rotate(-135deg);
}
[data-pip-control="subtitle-panel-title"] { font-size: 14px; font-weight: 700; }

[data-pip-control="subtitle-switch"] {
  position: relative;
  width: 32px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, .28);
  cursor: pointer;
  transition: background-color 150ms ease;
}

[data-pip-control="subtitle-switch"]::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 1px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 150ms ease;
}

[data-pip-control="subtitle-switch"][aria-checked="true"] { background: #e50914; }
[data-pip-control="subtitle-switch"][aria-checked="true"]::after { transform: translateX(14px); }
[data-pip-control="subtitle-switch"]:focus-visible {
  outline: 2px solid rgba(229, 9, 20, .5);
  outline-offset: 2px;
}

[data-pip-control="subtitle-option"] {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px;
  cursor: pointer;
}
[data-pip-control="subtitle-option"] input {
  appearance: none;
  display: grid;
  place-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin: 0;
  border: 1.5px solid rgba(255, 255, 255, .42);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: border-color 120ms ease, border-width 120ms ease;
}
[data-pip-control="subtitle-option"] input:checked { border: 4px solid #e50914; }
[data-pip-control="subtitle-option"] input:focus-visible {
  outline: 2px solid rgba(229, 9, 20, .5);
  outline-offset: 2px;
}

[data-pip-control="error"] {
  position: absolute;
  right: 16px;
  bottom: 54px;
  max-width: calc(100% - 32px);
  padding: 5px 8px;
  color: #fff;
  border-radius: 3px;
  background: rgba(80, 0, 0, .9);
  font-size: 12px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}

[data-pip-control="error"][data-visible="true"] { opacity: 1; }

@media (max-width: 420px), (max-height: 230px) {
  [data-shortcut-override-pip-controls] { padding: 0 8px 6px; }
  [data-pip-control="bottom-row"] { gap: 3px; }
  [data-pip-control="transport"],
  [data-pip-control="actions"] { gap: 1px; }
  [data-pip-control][data-action] { width: 25px; height: 25px; padding: 3px; }
  [data-pip-control="seek-backward"],
  [data-pip-control="seek-forward"] { padding: 0; }
  [data-pip-control="volume"] { width: 46px; }
  [data-pip-control="time"] { font-size: 10px; }
  [data-pip-control="subtitle-menu"] { right: 8px; bottom: 42px; }
}
`

export class PipControls {
  private readonly pipWindow: Window
  private readonly video: HTMLVideoElement
  private readonly videoArea: HTMLElement
  private readonly seekTo: PipControlsOptions['seekTo']
  private readonly resumeAfterSeek: PipControlsOptions['resumeAfterSeek']
  private readonly onVisibilityChange: PipControlsOptions['onVisibilityChange']
  private readonly onAction: PipControlsOptions['onAction']
  private readonly onVolumeChange: PipControlsOptions['onVolumeChange']
  private readonly onPipSettingsChange: PipControlsOptions['onPipSettingsChange']
  private settings: PipControlsSettings
  private root: HTMLElement | null = null
  private timelineController: ReturnType<typeof createPipTimelineController> | null = null
  private rewindButton: HTMLButtonElement | null = null
  private playbackButton: HTMLButtonElement | null = null
  private forwardButton: HTMLButtonElement | null = null
  private muteButton: HTMLButtonElement | null = null
  private volumeSlider: HTMLInputElement | null = null
  private subtitleMenu: ReturnType<typeof createPipSubtitleMenu> | null = null
  private errorLabel: HTMLElement | null = null
  private styleElement: HTMLStyleElement | null = null
  private idleTimer: number | null = null
  private errorTimer: number | null = null
  private volumeFrameId: number | null = null
  private pendingVolume: number | null = null
  private started = false
  private focused = false
  private readonly cleanups: Array<() => void> = []

  constructor(options: PipControlsOptions) {
    this.pipWindow = options.pipWindow
    this.video = options.video
    this.videoArea = options.videoArea
    this.seekTo = options.seekTo
    this.resumeAfterSeek = options.resumeAfterSeek
    this.onVisibilityChange = options.onVisibilityChange
    this.onAction = options.onAction
    this.onVolumeChange = options.onVolumeChange
    this.onPipSettingsChange = options.onPipSettingsChange
    this.settings = options.settings ?? DEFAULT_CONTROLS_SETTINGS
  }

  start(): void {
    if (this.started) return
    this.started = true

    const doc = this.pipWindow.document
    this.styleElement = doc.createElement('style')
    this.styleElement.dataset[PIP_CONTROLS_STYLE_MARKER] = 'true'
    this.styleElement.textContent = STYLE_TEXT
    doc.head.appendChild(this.styleElement)

    const root = doc.createElement('div')
    root.dataset[PIP_CONTROLS_MARKER] = 'true'
    root.dataset.visible = 'true'

    const timelineShell = doc.createElement('div')
    timelineShell.dataset.pipControl = 'timeline-shell'
    timelineShell.dataset[PIP_CONTROL_MARKER] = 'true'
    const timeline = doc.createElement('input')
    timeline.type = 'range'
    timeline.min = '0'
    timeline.step = '0.1'
    timeline.dataset.pipControl = 'timeline'
    timeline.dataset[PIP_CONTROL_MARKER] = 'true'
    timelineShell.appendChild(timeline)

    const bottomRow = doc.createElement('div')
    bottomRow.dataset.pipControl = 'bottom-row'
    bottomRow.dataset[PIP_CONTROL_MARKER] = 'true'

    const time = doc.createElement('span')
    time.dataset.pipControl = 'time'
    const currentTimeLabel = doc.createElement('span')
    currentTimeLabel.dataset.pipControl = 'current-time'
    const durationLabel = doc.createElement('span')
    durationLabel.dataset.pipControl = 'duration'
    time.append(currentTimeLabel, doc.createTextNode(' / '), durationLabel)

    const transport = doc.createElement('div')
    transport.dataset.pipControl = 'transport'
    const rewindButton = this.createButton('seek-backward')
    const playbackButton = this.createButton('playback')
    const forwardButton = this.createButton('seek-forward')

    const actions = doc.createElement('div')
    actions.dataset.pipControl = 'actions'
    const muteButton = this.createButton('mute')

    const volumeSlider = doc.createElement('input')
    volumeSlider.type = 'range'
    volumeSlider.min = '0'
    volumeSlider.max = '100'
    volumeSlider.step = '1'
    volumeSlider.dataset.pipControl = 'volume'
    volumeSlider.dataset[PIP_CONTROL_MARKER] = 'true'

    const subtitlesButton = this.createButton('subtitles-button')
    subtitlesButton.innerHTML = subtitleIcon()
    subtitlesButton.setAttribute('aria-haspopup', 'dialog')
    subtitlesButton.setAttribute('aria-expanded', 'false')

    transport.append(rewindButton, playbackButton, forwardButton)
    actions.append(muteButton, volumeSlider, subtitlesButton)
    bottomRow.append(time, transport, actions)

    const subtitleMenu = createPipSubtitleMenu({
      pipWindow: this.pipWindow,
      button: subtitlesButton,
      settings: this.settings.pip,
      copy: this.settings.copy,
      onSettingsChange: pip => {
        this.settings = { ...this.settings, pip }
        this.onPipSettingsChange?.(pip)
      },
      onOpenChange: (open, restoreFocus) => {
        if (open) {
          if (this.idleTimer !== null) this.pipWindow.clearTimeout(this.idleTimer)
          this.idleTimer = null
          this.revealControls()
          return
        }
        if (restoreFocus) this.restoreDocumentFocus()
        this.scheduleHide()
      },
      onWindowBlur: () => {
        this.focused = false
      },
    })

    const errorLabel = doc.createElement('div')
    errorLabel.dataset.pipControl = 'error'
    errorLabel.dataset[PIP_CONTROL_MARKER] = 'true'
    errorLabel.dataset.visible = 'false'
    errorLabel.setAttribute('role', 'status')
    errorLabel.setAttribute('aria-live', 'polite')

    root.append(timelineShell, bottomRow, subtitleMenu.element, errorLabel)
    this.videoArea.appendChild(root)

    this.root = root
    this.timelineController = createPipTimelineController({
      pipWindow: this.pipWindow,
      video: this.video,
      timeline,
      currentTimeLabel,
      durationLabel,
      seekTo: this.seekTo,
      resumeAfterSeek: this.resumeAfterSeek,
      onReveal: () => this.revealControls(),
      onError: message => this.showError(message),
    })
    this.rewindButton = rewindButton
    this.playbackButton = playbackButton
    this.forwardButton = forwardButton
    this.muteButton = muteButton
    this.volumeSlider = volumeSlider
    this.subtitleMenu = subtitleMenu
    this.errorLabel = errorLabel

    this.bindEvents()
    this.timelineController.start()
    this.subtitleMenu.start()
    this.updateSettings(this.settings)
    this.syncAudioState()
    this.onVisibilityChange?.(true)
    this.scheduleHide()
  }

  updateSettings(settings: PipControlsSettings): void {
    this.settings = settings
    if (!this.started) return

    const { seekSeconds, copy, pip } = settings
    this.timelineController?.updateLabel(copy.timeline)
    if (this.rewindButton) {
      this.rewindButton.innerHTML = seekIcon(-1)
      this.rewindButton.setAttribute('aria-label', withSeconds(copy.rewind, seekSeconds))
      this.rewindButton.title = withSeconds(copy.rewind, seekSeconds)
    }
    if (this.forwardButton) {
      this.forwardButton.innerHTML = seekIcon(1)
      this.forwardButton.setAttribute('aria-label', withSeconds(copy.forward, seekSeconds))
      this.forwardButton.title = withSeconds(copy.forward, seekSeconds)
    }
    if (this.volumeSlider) {
      this.volumeSlider.setAttribute('aria-label', copy.volume)
      this.volumeSlider.title = copy.volume
    }
    this.subtitleMenu?.update(pip, copy)
    this.updatePlaybackButton()
    this.updateMuteButton()
  }

  destroy(): void {
    if (!this.started) return
    this.started = false

    for (const cleanup of this.cleanups.splice(0)) cleanup()
    if (this.idleTimer !== null) this.pipWindow.clearTimeout(this.idleTimer)
    if (this.errorTimer !== null) this.pipWindow.clearTimeout(this.errorTimer)
    if (this.volumeFrameId !== null) this.pipWindow.cancelAnimationFrame(this.volumeFrameId)
    this.timelineController?.destroy()
    this.subtitleMenu?.destroy()
    this.styleElement?.remove()
    this.root?.remove()
    this.styleElement = null
    this.root = null
    this.timelineController = null
    this.rewindButton = null
    this.playbackButton = null
    this.forwardButton = null
    this.muteButton = null
    this.volumeSlider = null
    this.subtitleMenu = null
    this.errorLabel = null
    this.idleTimer = null
    this.errorTimer = null
    this.volumeFrameId = null
    this.pendingVolume = null
    this.focused = false
    this.onVisibilityChange?.(false)
  }

  private createButton(control: string): HTMLButtonElement {
    const button = this.pipWindow.document.createElement('button')
    button.type = 'button'
    button.dataset.pipControl = control
    button.dataset.action = control
    button.dataset[PIP_CONTROL_MARKER] = 'true'
    return button
  }

  private bindEvents(): void {
    const root = this.root!
    const volumeSlider = this.volumeSlider!

    for (const type of ['play', 'pause', 'ended']) {
      this.listen(this.video, type, () => this.updatePlaybackButton())
    }
    this.listen(this.video, 'volumechange', () => this.syncAudioState())

    for (const type of ['pointerenter', 'pointermove', 'mousemove']) {
      this.listen(this.videoArea, type, () => this.revealControls())
    }
    this.listen(this.videoArea, 'pointerleave', () => this.scheduleHide())
    this.listen(root, 'focusin', () => {
      this.focused = true
      this.revealControls()
    })
    this.listen(root, 'focusout', event => {
      const nextTarget = (event as FocusEvent).relatedTarget
      if (
        nextTarget &&
        typeof nextTarget === 'object' &&
        'nodeType' in nextTarget &&
        root.contains(nextTarget as Node)
      ) {
        return
      }
      this.focused = false
      this.scheduleHide()
    })

    this.listen(this.rewindButton!, 'click', () => {
      this.onAction?.('seekBackward')
      this.restoreDocumentFocus()
    })
    this.listen(this.playbackButton!, 'click', () => {
      this.onAction?.('playPause')
      this.restoreDocumentFocus()
    })
    this.listen(this.forwardButton!, 'click', () => {
      this.onAction?.('seekForward')
      this.restoreDocumentFocus()
    })
    this.listen(this.muteButton!, 'click', () => {
      this.onAction?.('mute')
      this.restoreDocumentFocus()
    })
    this.listen(volumeSlider, 'input', () => this.queueVolumeChange())
    this.listen(volumeSlider, 'change', () => {
      this.flushVolumeChange()
      this.restoreDocumentFocus()
    })
    this.listen(volumeSlider, 'pointerup', () => this.restoreDocumentFocus())
    this.listen(volumeSlider, 'pointercancel', () => this.restoreDocumentFocus())
    this.listen(root, 'click', event => event.stopPropagation())
    this.listen(root, 'pointerdown', event => event.stopPropagation())
    this.listen(root, 'keydown', event => {
      const keyboardEvent = event as KeyboardEvent
      if (keyboardEvent.key === 'Escape' && this.subtitleMenu?.handleEscape()) {
        keyboardEvent.preventDefault()
      }
      keyboardEvent.stopPropagation()
    })
    this.listen(root, 'keyup', event => event.stopPropagation())
  }

  private listen(target: EventTarget, type: string, listener: EventListener, capture = false): void {
    target.addEventListener(type, listener, capture)
    this.cleanups.push(() => target.removeEventListener(type, listener, capture))
  }

  private restoreDocumentFocus(): void {
    const body = this.pipWindow.document.body
    if (!body) return
    body.tabIndex = -1
    body.focus({ preventScroll: true })
  }

  private syncAudioState(): void {
    if (!this.volumeSlider) return
    const muted = this.video.muted || this.video.volume === 0
    this.volumeSlider.value = muted ? '0' : Math.round(this.video.volume * 100).toString()
    this.volumeSlider.setAttribute('aria-valuetext', `${this.volumeSlider.value}%`)
    this.updateMuteButton()
  }

  private updateMuteButton(): void {
    if (!this.muteButton) return
    const muted = this.video.muted || this.video.volume === 0
    const label = muted ? this.settings.copy.unmute : this.settings.copy.mute
    this.muteButton.innerHTML = volumeIcon(muted)
    this.muteButton.setAttribute('aria-label', label)
    this.muteButton.title = label
    this.muteButton.dataset.muted = muted.toString()
  }

  private updatePlaybackButton(): void {
    if (!this.playbackButton) return
    const paused = this.video.paused || this.video.ended
    const label = paused ? this.settings.copy.play : this.settings.copy.pause
    this.playbackButton.innerHTML = playbackIcon(paused)
    this.playbackButton.setAttribute('aria-label', label)
    this.playbackButton.title = label
    this.playbackButton.dataset.paused = paused.toString()
  }

  private queueVolumeChange(): void {
    if (!this.volumeSlider) return
    this.pendingVolume = Number(this.volumeSlider.value) / 100
    this.volumeSlider.setAttribute('aria-valuetext', `${this.volumeSlider.value}%`)
    if (this.volumeFrameId !== null) return
    this.volumeFrameId = this.pipWindow.requestAnimationFrame(() => {
      this.volumeFrameId = null
      this.sendPendingVolume()
    })
    this.revealControls()
  }

  private flushVolumeChange(): void {
    if (!this.volumeSlider) return
    this.pendingVolume = Number(this.volumeSlider.value) / 100
    if (this.volumeFrameId !== null) {
      this.pipWindow.cancelAnimationFrame(this.volumeFrameId)
      this.volumeFrameId = null
    }
    this.sendPendingVolume()
  }

  private sendPendingVolume(): void {
    if (this.pendingVolume === null) return
    const volume = this.pendingVolume
    this.pendingVolume = null
    this.onVolumeChange?.(volume)
  }

  private showError(message: string): void {
    if (!this.errorLabel) return
    if (this.errorTimer !== null) this.pipWindow.clearTimeout(this.errorTimer)
    this.errorLabel.textContent = message
    this.errorLabel.dataset.visible = 'true'
    this.errorTimer = this.pipWindow.setTimeout(() => {
      if (this.errorLabel) this.errorLabel.dataset.visible = 'false'
      this.errorTimer = null
    }, 1_800)
    this.revealControls()
  }

  private revealControls(): void {
    if (!this.root) return
    if (this.root.dataset.visible !== 'true') {
      this.root.dataset.visible = 'true'
      this.onVisibilityChange?.(true)
    }
    this.scheduleHide()
  }

  private scheduleHide(): void {
    if (
      !this.root ||
      this.focused ||
      this.subtitleMenu?.isOpen ||
      this.timelineController?.isInteracting
    ) {
      return
    }
    if (this.idleTimer !== null) this.pipWindow.clearTimeout(this.idleTimer)
    this.idleTimer = this.pipWindow.setTimeout(() => {
      if (
        this.root &&
        !this.focused &&
        !this.subtitleMenu?.isOpen &&
        !this.timelineController?.isInteracting &&
        this.root.dataset.visible !== 'false'
      ) {
        this.root.dataset.visible = 'false'
        this.onVisibilityChange?.(false)
      }
      this.idleTimer = null
    }, IDLE_HIDE_DELAY_MS)
  }
}
