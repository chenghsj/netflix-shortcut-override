import { findVideo } from '@/content/dom-utils'
import type { NetflixPlaybackSession } from '@/content/netflix-playback-session'
import { PLAYER_ROOT_SELECTOR } from './pip-selectors'

const NEXT_EPISODE_UI_READY_TIMEOUT_MS = 2_000

export const getNetflixWatchId = (sourceWindow: Window): string | null =>
  sourceWindow.location.pathname.match(/^\/watch\/([^/]+)/)?.[1] ?? null

export const getNetflixVideoTitle = (sourceDocument: Document): string | null => {
  const title = sourceDocument.querySelector('[data-uia="video-title"]')?.textContent?.trim()
  return title || null
}

type NextEpisodePauseGuardOptions = {
  sourceDocument: Document
  confirmedVideo: HTMLVideoElement
  entryWatchId: string | null
  entryVideoTitle: string | null
  playbackSession: Pick<NetflixPlaybackSession, 'pause'>
}

export const startNextEpisodePauseGuard = ({
  sourceDocument,
  confirmedVideo,
  entryWatchId,
  entryVideoTitle,
  playbackSession,
}: NextEpisodePauseGuardOptions): (() => void) => {
  const sourceWindow = sourceDocument.defaultView
  if (!sourceWindow) {
    void playbackSession.pause(confirmedVideo)
    return () => undefined
  }

  let guardedPlayerRoot = confirmedVideo.closest<HTMLElement>(PLAYER_ROOT_SELECTOR)
  let pendingVideo: HTMLVideoElement | null = null
  let readinessTimeoutId: number | null = null
  let readinessDeadline: number | null = null
  let guardActive = true

  const clearReadinessTimeout = () => {
    if (readinessTimeoutId === null) return
    sourceWindow.clearTimeout(readinessTimeoutId)
    readinessTimeoutId = null
  }
  const hasNextEpisodeMetadata = () => {
    const title = getNetflixVideoTitle(sourceDocument)
    return title !== null && title !== entryVideoTitle
  }
  const hasNextEpisodeIdentity = () =>
    hasNextEpisodeMetadata() ||
    (entryWatchId !== null && getNetflixWatchId(sourceWindow) !== entryWatchId)
  const isEligibleVideo = (playingVideo: HTMLVideoElement): boolean => {
    if (playingVideo === confirmedVideo) return true

    const playingPlayerRoot = playingVideo.closest<HTMLElement>(PLAYER_ROOT_SELECTOR)
    if (guardedPlayerRoot !== null && playingPlayerRoot === guardedPlayerRoot) return true

    if (guardedPlayerRoot !== null && !guardedPlayerRoot.isConnected && playingPlayerRoot) {
      guardedPlayerRoot = playingPlayerRoot
      return true
    }

    if (!hasNextEpisodeIdentity() || findVideo(sourceDocument) !== playingVideo) return false
    guardedPlayerRoot = playingPlayerRoot
    return true
  }
  const pausePendingVideo = () => {
    const playingVideo = pendingVideo
    if (!playingVideo) return
    pendingVideo = null
    clearReadinessTimeout()
    void playbackSession.pause(playingVideo)
  }
  const pauseWhenMetadataReady = () => {
    if (pendingVideo && hasNextEpisodeMetadata()) pausePendingVideo()
  }
  const pauseAfterNetflixHandlers = (playingVideo: HTMLVideoElement) => {
    sourceWindow.queueMicrotask(() => {
      if (!guardActive || !isEligibleVideo(playingVideo)) return

      playingVideo.pause()
      pendingVideo = playingVideo
      clearReadinessTimeout()
      if (hasNextEpisodeMetadata()) {
        pausePendingVideo()
        return
      }
      readinessDeadline ??= Date.now() + NEXT_EPISODE_UI_READY_TIMEOUT_MS
      readinessTimeoutId = sourceWindow.setTimeout(
        pausePendingVideo,
        Math.max(0, readinessDeadline - Date.now())
      )
    })
  }
  const pausePlayingVideo = (event: Event) => {
    const playingVideo = event.target
    if (!(playingVideo instanceof HTMLVideoElement)) return
    pauseAfterNetflixHandlers(playingVideo)
  }
  const cleanup = () => {
    guardActive = false
    clearReadinessTimeout()
    metadataObserver.disconnect()
    sourceDocument.removeEventListener('playing', pausePlayingVideo, true)
    sourceDocument.removeEventListener('pointerdown', cleanup, true)
    sourceDocument.removeEventListener('keydown', cleanup, true)
  }
  const metadataObserver = new sourceWindow.MutationObserver(pauseWhenMetadataReady)
  metadataObserver.observe(sourceDocument.body, {
    subtree: true,
    childList: true,
    characterData: true,
  })
  sourceDocument.addEventListener('playing', pausePlayingVideo, true)
  sourceDocument.addEventListener('pointerdown', cleanup, true)
  sourceDocument.addEventListener('keydown', cleanup, true)

  if (
    !confirmedVideo.paused &&
    confirmedVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  ) {
    pauseAfterNetflixHandlers(confirmedVideo)
  }

  return cleanup
}
