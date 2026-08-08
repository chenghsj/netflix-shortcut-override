import type { NetflixPlaybackSession } from '@/content/netflix-playback-session'
import type { ShortcutCommandController } from '@/content/shortcuts/shortcut-command-controller'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getCopy } from '@/shared/i18n'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { findSubtitleSearchRoot, SubtitleMirror } from './pip-subtitle-mirror'
import { PipControls } from './pip-controls'
import { VideoPlacement } from './video-placement'

type AdoptedVideoBindingOptions = {
  sourceDocument: Document
  pipWindow: Window
  playbackSession: NetflixPlaybackSession
  commands?: Pick<ShortcutCommandController, 'execute' | 'setVolume'>
  settings: ShortcutSettings
  onSettingsChange?: (settings: ShortcutSettings) => void
  onUserSeek: () => void
}

type PipControlAction = 'playPause' | 'seekBackward' | 'seekForward' | 'mute'

export class AdoptedVideoBinding {
  private readonly sourceDocument: Document
  private readonly pipWindow: Window
  private readonly playbackSession: NetflixPlaybackSession
  private readonly commands: AdoptedVideoBindingOptions['commands']
  private readonly onSettingsChange: AdoptedVideoBindingOptions['onSettingsChange']
  private readonly onUserSeek: () => void
  private readonly videoPlacement: VideoPlacement
  private settings: ShortcutSettings
  private videoArea: HTMLElement | null = null
  private subtitleMirror: SubtitleMirror | null = null
  private pipControls: PipControls | null = null
  private subtitleStateVersion = 0

  constructor(options: AdoptedVideoBindingOptions) {
    this.sourceDocument = options.sourceDocument
    this.pipWindow = options.pipWindow
    this.playbackSession = options.playbackSession
    this.commands = options.commands
    this.settings = options.settings
    this.onSettingsChange = options.onSettingsChange
    this.onUserSeek = options.onUserSeek
    this.videoPlacement = new VideoPlacement(this.sourceDocument)
  }

  get area(): HTMLElement | null {
    return this.videoArea
  }

  get currentVideo(): HTMLVideoElement | null {
    return this.videoPlacement.currentVideo
  }

  adopt(video: HTMLVideoElement): HTMLElement {
    if (this.videoArea) throw new Error('An adopted video is already bound')

    const fallbackSourceParent = video.parentElement
    this.videoPlacement.prepare(video)
    const videoArea = this.videoPlacement.createPipVideoArea(this.pipWindow)
    this.videoArea = videoArea
    this.mountBindings(video, fallbackSourceParent)
    return videoArea
  }

  replace(video: HTMLVideoElement): boolean {
    const videoArea = this.videoArea
    const fallbackSourceParent = video.parentElement
    if (!videoArea || !fallbackSourceParent) return false

    this.cleanupBindings()
    this.videoPlacement.replaceVideo(video, videoArea)
    this.mountBindings(video, fallbackSourceParent)
    return true
  }

  updateSettings(settings: ShortcutSettings): void {
    this.applySettings(settings)
  }

  confirmSubtitleState(settings: ShortcutSettings): void {
    this.subtitleStateVersion += 1
    this.applySettings(settings)
  }

  private applySettings(settings: ShortcutSettings): void {
    this.settings = settings
    this.subtitleMirror?.setSettings(settings.pip)
    this.pipControls?.updateSettings(this.getControlsSettings())
  }

  destroy(restoreAdoptedVideo = true): void {
    this.cleanupBindings()
    this.videoPlacement.restore(false, restoreAdoptedVideo)
    this.videoArea = null
  }

  private mountBindings(video: HTMLVideoElement, fallbackSourceParent: HTMLElement | null): void {
    const videoArea = this.videoArea
    if (!videoArea) throw new Error('Adopted video area is unavailable')

    this.subtitleMirror = new SubtitleMirror({
      sourceDocument: this.sourceDocument,
      searchRoot: findSubtitleSearchRoot(
        this.videoPlacement.sourceParent ?? fallbackSourceParent ?? this.sourceDocument.body
      ),
      pipWindow: this.pipWindow,
      video,
      videoArea,
      settings: this.settings.pip,
    })
    this.subtitleMirror.start()

    this.pipControls = new PipControls({
      pipWindow: this.pipWindow,
      video,
      videoArea,
      seekTo: milliseconds => {
        this.onUserSeek()
        return this.playbackSession.seekTo(milliseconds)
      },
      resumeAfterSeek: () => this.playbackSession.play(video),
      onVisibilityChange: visible => this.subtitleMirror?.setControlsVisible(visible),
      settings: this.getControlsSettings(),
      onAction: action => this.executeControlAction(action, video),
      onVolumeChange: volume => this.executeVolumeChange(volume, video),
      onPipSettingsChange: pip => {
        if (pip.subtitlesEnabled !== this.settings.pip.subtitlesEnabled) {
          this.pipControls?.updateSettings(this.getControlsSettings())
          void this.toggleNetflixSubtitles()
          return
        }

        const nextSettings = { ...this.settings, pip }
        this.updateSettings(nextSettings)
        this.onSettingsChange?.(nextSettings)
      },
    })
    this.pipControls.start()
    void this.syncNetflixSubtitleState(this.subtitleStateVersion)
  }

  private getControlsSettings() {
    return {
      seekSeconds: this.settings.seek.seconds,
      pip: this.settings.pip,
      copy: getCopy(resolveLocalePreference(this.settings.locale)).pipControls,
    }
  }

  private executeControlAction(action: PipControlAction, video: HTMLVideoElement): void {
    if (action === 'seekBackward' || action === 'seekForward') this.onUserSeek()

    if (this.commands) {
      this.commands.execute(action, this.pipWindow.document)
      return
    }
    if (action === 'playPause') {
      void this.playbackSession.togglePlayback(video)
      return
    }
    if (action === 'mute') {
      this.playbackSession.toggleMute(video)
      return
    }
    const direction = action === 'seekBackward' ? -1 : 1
    void this.playbackSession.seekBy(direction * this.settings.seek.seconds * 1_000)
  }

  private executeVolumeChange(volume: number, video: HTMLVideoElement): void {
    if (this.commands) {
      this.commands.setVolume(volume, this.pipWindow.document)
      return
    }
    this.playbackSession.setVolume(video, volume)
  }

  private async toggleNetflixSubtitles(): Promise<void> {
    const result = await this.playbackSession.toggleSubtitles()
    const subtitlesEnabled = result.response.result?.subtitlesEnabled
    if (result.failureLabel || typeof subtitlesEnabled !== 'boolean') return

    const nextSettings = {
      ...this.settings,
      pip: { ...this.settings.pip, subtitlesEnabled },
    }
    this.confirmSubtitleState(nextSettings)
    this.onSettingsChange?.(nextSettings)
  }

  private async syncNetflixSubtitleState(version: number): Promise<void> {
    const result = await this.playbackSession.getSubtitleState()
    const subtitlesEnabled = result.response.result?.subtitlesEnabled
    if (
      result.failureLabel ||
      typeof subtitlesEnabled !== 'boolean' ||
      version !== this.subtitleStateVersion ||
      !this.pipControls
    ) {
      return
    }
    if (subtitlesEnabled === this.settings.pip.subtitlesEnabled) return

    const nextSettings = {
      ...this.settings,
      pip: { ...this.settings.pip, subtitlesEnabled },
    }
    this.updateSettings(nextSettings)
    this.onSettingsChange?.(nextSettings)
  }

  private cleanupBindings(): void {
    this.subtitleStateVersion += 1
    this.pipControls?.destroy()
    this.pipControls = null
    this.subtitleMirror?.destroy()
    this.subtitleMirror = null
  }
}
