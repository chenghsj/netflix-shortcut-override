import type { NetflixApiAction, NetflixPageResult } from '@/shared/netflix-api'

type NetflixAudioTrack = {
  bcp47?: string
  language?: string
}

type NetflixPlayer = {
  play(): void
  pause(): void
  seek(time: number): void
  getCurrentTime(): number
  setVolume(value: number): void
  setMuted(value: boolean): void
  getAudioTrack?(): NetflixAudioTrack | null | undefined
  getTimedAudioTrack?(): NetflixAudioTrack | null | undefined
  getTextTrackList?(): NetflixTextTrack[]
  getTimedTextTrackList?(): NetflixTextTrack[]
  getTextTrack?(): NetflixTextTrack | null | undefined
  getTimedTextTrack?(): NetflixTextTrack | null | undefined
  setTextTrack?(track: NetflixTextTrack): void
  setTimedTextTrack?(track: NetflixTextTrack): void
  getTimedTextVisibility?(): boolean
  setTimedTextVisibility?(visible: boolean): void
}

type NetflixTextTrack = {
  id?: string
  trackId?: string
  new_track_id?: string
  bcp47?: string
  language?: string
  displayName?: string
  isNoneTrack?: boolean
  isForcedNarrative?: boolean
  rawTrackType?: string
  trackType?: string
  isSelected?: boolean
  selected?: boolean
}

type NetflixTextTrackReference = Pick<
  NetflixTextTrack,
  'id' | 'trackId' | 'new_track_id' | 'bcp47' | 'language' | 'displayName'
>

type NetflixVideoPlayerApi = {
  getAllPlayerSessionIds(): string[]
  getVideoPlayerBySessionId(id: string): NetflixPlayer | null | undefined
}

type NetflixWindow = typeof window & {
  documentPictureInPicture?: {
    window?: Window | null
  }
  netflix?: {
    appContext?: {
      state?: {
        playerApp?: {
          getAPI(): { videoPlayer: NetflixVideoPlayerApi }
        }
      }
    }
  }
  __shortcutOverrideSubtitleState?: {
    lastTrack?: NetflixTextTrackReference
    lastOffTrack?: NetflixTextTrackReference
    subtitlesEnabled?: boolean
    hiddenWithoutOffTrack?: boolean
    hiddenWatchPath?: string
    hiddenTrackId?: string | null
  }
}

export const executeNetflixPageApi = (
  action: NetflixApiAction,
  value?: number
): NetflixPageResult => {
  // chrome.scripting.executeScript serializes this function without its module
  // scope, so every runtime dependency must remain inside this function body.
  function allowedNetflixSubtitleUrl(input: string): boolean {
    try {
      const url = new URL(input);
      const host = url.hostname.toLowerCase();
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        (!url.port || url.port === "443") &&
        ["netflix.com", "nflxvideo.net"].some(
          domain => host === domain || host.endsWith("." + domain),
        )
      );
    } catch {
      return false;
    }
  }

  function subtitleUrlFromTrack(track: unknown): string | null {
    if (!track || typeof track !== "object") return null;
    const source = track as Record<string, unknown>;
    // Traverse only known subtitle delivery fields, not arbitrary player internals.
    function readableUrl(value: unknown, depth = 0): string | null {
      if (typeof value === "string") return allowedNetflixSubtitleUrl(value) ? value : null;
      if (!value || typeof value !== "object" || depth > 5) return null;
      const entries = Array.isArray(value) ? value.slice(0, 100) : Object.values(value).slice(0, 100);
      for (const entry of entries) {
        const url = readableUrl(entry, depth + 1);
        if (url) return url;
      }
      return null;
    }
    const entries: unknown[] = [];
    if (source.ttDownloadables && typeof source.ttDownloadables === "object") {
      const downloadables = source.ttDownloadables as Record<string, unknown>;
      for (const name of [
        "webvtt-lssdh-ios8",
        "webvtt-lssdh",
        "dfxp-ls-sdh",
        "imsc1.1",
        "simplesdh",
      ]) {
        if (name in downloadables) entries.push(downloadables[name]);
      }
    }
    entries.push(source.urls, source.downloadUrls, source.url);
    for (const entry of entries) {
      const url = readableUrl(entry);
      if (url) return url;
    }
    return null;
  }

  type NetflixCaptionTrack = NetflixTextTrack
  const trackIds = (track: NetflixCaptionTrack | null | undefined): string[] =>
    [track?.trackId, track?.new_track_id, track?.id].filter((id): id is string => Boolean(id))
  const matchesTrackIds = (
    track: NetflixCaptionTrack | null | undefined,
    wantedIds: readonly string[]
  ): boolean => trackIds(track).some(id => wantedIds.includes(id))
  const isNoneTextTrack = (track: NetflixCaptionTrack | null | undefined): boolean =>
    track?.isNoneTrack === true
  const isForcedNarrativeTextTrack = (track: NetflixCaptionTrack | null | undefined): boolean =>
    track?.isForcedNarrative === true ||
    track?.rawTrackType === 'FORCED_NARRATIVE' ||
    track?.trackType === 'FORCED_NARRATIVE'
  const isOffTextTrack = (track: NetflixCaptionTrack | null | undefined): boolean =>
    isNoneTextTrack(track) || isForcedNarrativeTextTrack(track)

  function findInternalTrackUrl(root: unknown, wantedIds: readonly string[]): string | null {
    const visited = new WeakSet<object>();
    let checked = 0;
    function walk(value: unknown, depth: number): string | null {
      if (
        !value ||
        typeof value !== "object" ||
        visited.has(value) ||
        depth > 14 ||
        ++checked > 30_000
      )
        return null;
      visited.add(value);
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (
            entry &&
            typeof entry === "object" &&
            matchesTrackIds(entry as NetflixCaptionTrack, wantedIds)
          ) {
            const url = subtitleUrlFromTrack(entry);
            if (url) return url;
          }
        }
        for (const entry of value) {
          const result = walk(entry, depth + 1);
          if (result) return result;
        }
        return null;
      }
      // Inspect only own data properties: do not invoke arbitrary Netflix getters.
      let descriptors: PropertyDescriptorMap;
      try {
        descriptors = Object.getOwnPropertyDescriptors(value);
      } catch {
        return null;
      }
      for (const [name, descriptor] of Object.entries(descriptors)) {
        if (
          ["parentNode", "ownerDocument", "window", "document"].includes(name) ||
          !("value" in descriptor)
        )
          continue;
        const result = walk(descriptor.value, depth + 1);
        if (result) return result;
      }
      return null;
    }
    return walk(root, 0);
  }


  type CaptionPlayer = {
    getCurrentTime(): number
    getTextTrack?(): NetflixCaptionTrack | string | null | undefined
    getTimedTextTrack?(): NetflixCaptionTrack | string | null | undefined
    getTextTrackList?(): NetflixCaptionTrack[]
    getTimedTextTrackList?(): NetflixCaptionTrack[]
  }
  type CaptionPage = typeof window & {
    netflix?: {
      player?: { MediaSession?: unknown }
    }
  }

  function readCaptionMetadata(page: CaptionPage, player: CaptionPlayer, sessionId: string, watchId: string) {
    const tracks: NetflixCaptionTrack[] = []
    for (const read of [player.getTextTrackList, player.getTimedTextTrackList]) {
      try {
        const list = read?.call(player)
        if (Array.isArray(list)) tracks.push(...list)
      } catch { /* Read the other supported API generation. */ }
    }
    let selected: NetflixCaptionTrack | string | null = null
    for (const read of [player.getTextTrack, player.getTimedTextTrack]) {
      try { selected = read?.call(player) ?? null } catch { /* Try the other API. */ }
      if (selected) break
    }
    if (!selected) selected = tracks.find(track => (track as NetflixCaptionTrack & { isSelected?: boolean; selected?: boolean }).isSelected || (track as NetflixCaptionTrack & { selected?: boolean }).selected) ?? null
    if (!selected || (typeof selected !== 'string' && isOffTextTrack(selected))) throw new Error('track')
    const wantedIds = typeof selected === 'string' ? [selected] : trackIds(selected)
    const id = wantedIds[0] ?? null
    if (!id) throw new Error('track')
    // The selected-track API can return only a reference; delivery URLs live in
    // the complete catalog. Match by identity, never silently pick a language.
    const candidates = tracks.filter(track => matchesTrackIds(track, wantedIds) && !isOffTextTrack(track))
    if (typeof selected !== 'string' && candidates.length === 0 && tracks.some(track => matchesTrackIds(track, wantedIds) && isOffTextTrack(track))) {
      throw new Error('track')
    }
    const url = (typeof selected === 'object' ? subtitleUrlFromTrack(selected) : null)
      ?? candidates.map(subtitleUrlFromTrack).find(Boolean)
      ?? findInternalTrackUrl([page.netflix?.player?.MediaSession, player, page.netflix?.player], wantedIds)
    if (!url) throw new Error('document')
    const currentMs = player.getCurrentTime()
    if (!Number.isFinite(currentMs)) throw new Error('player')
    return { key: `${watchId}:${sessionId}:${id}`, watchId, url, currentMs }
  }
  const defaultVolume = 0.1
  const clampVolume = (volume: number, fallback = defaultVolume): number => {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : fallback))
    return Number(clamped.toFixed(2))
  }
  const normalizeRestoreVolume = (volume: number): number => {
    if (!Number.isFinite(volume) || volume <= 0) return defaultVolume
    const restored = clampVolume(volume)
    return restored > 0 ? restored : defaultVolume
  }
  const getVideoArea = (video: HTMLVideoElement): number => {
    const rect = video.getBoundingClientRect()
    return Math.max(0, rect.width) * Math.max(0, rect.height)
  }
  const getFiniteVideoDuration = (video: HTMLVideoElement): number =>
    Number.isFinite(video.duration) ? Math.max(0, video.duration) : 0
  const preferSessionReferenceVideo = (
    left: HTMLVideoElement,
    right: HTMLVideoElement
  ): HTMLVideoElement => {
    const leftPlaying = !left.paused && !left.ended
    const rightPlaying = !right.paused && !right.ended
    if (leftPlaying !== rightPlaying) return leftPlaying ? left : right

    const leftArea = getVideoArea(left)
    const rightArea = getVideoArea(right)
    if (leftArea !== rightArea) return leftArea > rightArea ? left : right

    return getFiniteVideoDuration(left) >= getFiniteVideoDuration(right) ? left : right
  }
  const findSessionReferenceVideo = (pageWindow: NetflixWindow): HTMLVideoElement | null => {
    try {
      const pipVideo = pageWindow.documentPictureInPicture?.window?.document.querySelector('video')
      if (pipVideo) return pipVideo as HTMLVideoElement
    } catch {
      // The PiP window can disappear between reading the API and its document.
    }

    // This video is only a time reference for matching Netflix player sessions.
    // It is not the presentation-oriented selection used by shortcuts and PiP entry.
    return Array.from(document.querySelectorAll<HTMLVideoElement>('video')).reduce<HTMLVideoElement | null>(
      (preferred, candidate) =>
        preferred ? preferSessionReferenceVideo(preferred, candidate) : candidate,
      null
    )
  }
  const getPlayerCurrentTime = (player: NetflixPlayer): number | null => {
    try {
      const currentTime = player.getCurrentTime()
      return Number.isFinite(currentTime) ? currentTime : null
    } catch {
      return null
    }
  }
  const SUBTITLE_HIDDEN_ATTR = 'data-shortcut-override-subtitles-hidden'
  const SUBTITLE_HIDDEN_STYLE_ID = 'shortcut-override-subtitle-visibility-style'
  const setSubtitleDomHidden = (hidden: boolean): void => {
    const root = document.documentElement
    if (!root) return
    if (!hidden) {
      root.removeAttribute(SUBTITLE_HIDDEN_ATTR)
      return
    }
    if (!document.getElementById(SUBTITLE_HIDDEN_STYLE_ID)) {
      const style = document.createElement('style')
      style.id = SUBTITLE_HIDDEN_STYLE_ID
      style.textContent = `html[${SUBTITLE_HIDDEN_ATTR}="true"] .player-timedtext, html[${SUBTITLE_HIDDEN_ATTR}="true"] [data-uia="subtitle-text"] { display: none !important; }`
      ;(document.head ?? root).appendChild(style)
    }
    root.setAttribute(SUBTITLE_HIDDEN_ATTR, 'true')
  }
  const getTextTracks = (player: NetflixPlayer): NetflixTextTrack[] => {
    const tracks: NetflixTextTrack[] = []
    for (const read of [player.getTextTrackList, player.getTimedTextTrackList]) {
      try {
        for (const track of read?.call(player) ?? []) {
          if (track && !tracks.some(t => t === track || matchesTrackIds(t, trackIds(track)))) {
            tracks.push(track)
          }
        }
      } catch { /* Fall back to the other supported track-list API. */ }
    }
    return tracks
  }
  const getSelectedTextTrack = (
    player: NetflixPlayer,
    tracks: NetflixTextTrack[]
  ): NetflixTextTrack | null => {
    const selected =
      player.getTextTrack?.() ??
      player.getTimedTextTrack?.() ??
      tracks.find(track => track.isSelected === true || track.selected === true) ??
      null
    const match = selected ? tracks.find(track => matchesTrackIds(track, trackIds(selected))) : undefined
    return match && match !== selected ? { ...match, ...selected } : selected
  }
  const rememberTextTrack = (track: NetflixTextTrack): NetflixTextTrackReference => ({
    id: track.id,
    trackId: track.trackId,
    new_track_id: track.new_track_id,
    bcp47: track.bcp47,
    language: track.language,
    displayName: track.displayName,
  })
  const sameTrackLanguage = (
    left?: { bcp47?: string; language?: string } | null,
    right?: { bcp47?: string; language?: string } | null
  ): boolean => {
    if (left?.bcp47 && left.bcp47 === right?.bcp47) return true
    if (left?.language && left.language === right?.language) return true
    return false
  }
  const selectOffTextTrack = (
    player: NetflixPlayer,
    tracks: NetflixTextTrack[],
    setTextTrack: ((track: NetflixTextTrack) => void) | undefined,
    lastOffTrack: NetflixTextTrackReference | undefined
  ): NetflixTextTrack | null => {
    if (typeof setTextTrack !== 'function') return null

    const audioTrack = player.getAudioTrack?.() ?? player.getTimedAudioTrack?.()
    const offTracks = tracks.filter(isOffTextTrack)
    const forcedTracks = tracks.filter(isForcedNarrativeTextTrack)
    const rememberedOffTrack = offTracks.find(
      track =>
        matchesTrackIds(track, trackIds(lastOffTrack)) || sameTrackLanguage(track, lastOffTrack)
    )
    const audioForcedTrack = forcedTracks.find(track => sameTrackLanguage(track, audioTrack))
    const prioritizedCandidates = [
      rememberedOffTrack,
      ...tracks.filter(isNoneTextTrack),
      audioForcedTrack,
      ...forcedTracks,
    ]
    const candidates = prioritizedCandidates.filter(
      (track, index): track is NetflixTextTrack =>
        Boolean(track) && prioritizedCandidates.indexOf(track) === index
    )

    for (const [index, candidate] of candidates.entries()) {
      setTextTrack.call(player, candidate)
      const hasMoreCandidates = index < candidates.length - 1
      if (!hasMoreCandidates) return candidate

      const updatedTrack = getSelectedTextTrack(player, tracks)
      if (!updatedTrack || isOffTextTrack(updatedTrack) || updatedTrack === candidate) {
        return candidate
      }
    }
    return null
  }
  const findRememberedTextTrack = (
    tracks: NetflixTextTrack[],
    reference: NetflixTextTrackReference | undefined
  ): NetflixTextTrack | null => {
    const selectableTracks = tracks.filter(track => !isOffTextTrack(track))
    if (!reference) return selectableTracks[0] ?? null

    const referenceIds = trackIds(reference)
    const exactIdMatch = selectableTracks.find(track => matchesTrackIds(track, referenceIds))
    if (exactIdMatch) return exactIdMatch

    if (reference.displayName) {
      const languageAndLabelMatch = selectableTracks.find(
        track => sameTrackLanguage(track, reference) && track.displayName === reference.displayName
      )
      if (languageAndLabelMatch) return languageAndLabelMatch
    }

    const languageMatch = selectableTracks.find(track => sameTrackLanguage(track, reference))
    if (languageMatch) return languageMatch

    if (reference.displayName) {
      const labelMatch = selectableTracks.find(track => track.displayName === reference.displayName)
      if (labelMatch) return labelMatch
    }

    return selectableTracks[0] ?? null
  }
  const setFallbackSubtitleHidden = (
    player: NetflixPlayer,
    state: NonNullable<NetflixWindow['__shortcutOverrideSubtitleState']> | undefined,
    hidden: boolean,
    currentTrack?: NetflixTextTrack | null
  ): void => {
    player.setTimedTextVisibility?.(!hidden)
    setSubtitleDomHidden(hidden)
    if (!state) return
    state.hiddenWithoutOffTrack = hidden
    state.hiddenWatchPath = hidden ? location.pathname : undefined
    state.hiddenTrackId = hidden ? (trackIds(currentTrack)[0] ?? null) : undefined
  }
  const shouldKeepDomSubtitleHide = (
    state: NonNullable<NetflixWindow['__shortcutOverrideSubtitleState']> | undefined,
    currentTrack: NetflixTextTrack | null
  ): boolean => {
    if (state?.hiddenWithoutOffTrack !== true) return false
    if (state.hiddenWatchPath && state.hiddenWatchPath !== location.pathname) return false
    if (!currentTrack) return true
    if (isOffTextTrack(currentTrack)) return false
    if (state.hiddenTrackId && !matchesTrackIds(currentTrack, [state.hiddenTrackId])) return false
    return true
  }
  const syncFallbackSubtitleHide = (
    player: NetflixPlayer,
    state: NonNullable<NetflixWindow['__shortcutOverrideSubtitleState']> | undefined,
    currentTrack: NetflixTextTrack | null
  ): boolean => {
    const keepDomHidden = shouldKeepDomSubtitleHide(state, currentTrack)
    if (!keepDomHidden) {
      if (state?.hiddenWithoutOffTrack) {
        setFallbackSubtitleHidden(player, state, false)
      } else {
        setSubtitleDomHidden(false)
      }
    }
    return keepDomHidden || player.getTimedTextVisibility?.() === false
  }
  const resolveSubtitleOffMode = (player: NetflixPlayer, tracks: NetflixTextTrack[]): string => {
    if (tracks.some(isNoneTextTrack)) return 'none-track'
    if (tracks.some(isForcedNarrativeTextTrack)) return 'forced-narrative'
    if (typeof player.setTimedTextVisibility === 'function') return 'visibility-api'
    return 'dom-fallback'
  }
  const summarizeSubtitleDiagnostics = (player: NetflixPlayer): string => {
    const tracks = getTextTracks(player)
    if (tracks.length === 0) return '0 tracks'
    const selectableCount = tracks.filter(track => !isOffTextTrack(track)).length
    const offMode = resolveSubtitleOffMode(player, tracks)
    return `${selectableCount} selectable (${tracks.length} total, off: ${offMode})`
  }
  const getTextTrackLabel = (track: NetflixTextTrack): string | undefined =>
    track.displayName ?? track.bcp47 ?? track.language ?? track.id ?? track.trackId ?? track.new_track_id
  const readSubtitleState = (
    pageWindow: NetflixWindow,
    player: NetflixPlayer,
    result: NetflixPageResult
  ): void => {
    const currentTrack = getSelectedTextTrack(player, getTextTracks(player))
    if (!currentTrack) {
      throw new Error('Unable to determine the current Netflix subtitle track.')
    }
    const hiddenByFallback = syncFallbackSubtitleHide(
      player,
      pageWindow.__shortcutOverrideSubtitleState,
      currentTrack
    )
    result.subtitlesEnabled = !isOffTextTrack(currentTrack) && !hiddenByFallback
    result.subtitleTrack = getTextTrackLabel(currentTrack)
  }
  const toggleSubtitles = (
    pageWindow: NetflixWindow,
    player: NetflixPlayer,
    result: NetflixPageResult
  ): void => {
    const tracks = getTextTracks(player)
    const setTextTrack = player.setTextTrack ?? player.setTimedTextTrack
    const canToggleTrack = typeof setTextTrack === 'function'
    const canToggleVisibility = typeof player.setTimedTextVisibility === 'function'
    if (tracks.length === 0 || (!canToggleTrack && !canToggleVisibility)) {
      throw new Error('Netflix subtitle track API is unavailable.')
    }

    const state = pageWindow.__shortcutOverrideSubtitleState ?? {}
    const currentTrack = getSelectedTextTrack(player, tracks)
    if (currentTrack && isOffTextTrack(currentTrack)) {
      state.lastOffTrack = rememberTextTrack(currentTrack)
    }

    const hiddenByFallback = syncFallbackSubtitleHide(player, state, currentTrack)
    const currentlyEnabled = hiddenByFallback
      ? false
      : currentTrack
        ? !isOffTextTrack(currentTrack)
        : state.subtitlesEnabled
    if (currentlyEnabled === undefined) {
      throw new Error('Unable to determine the current Netflix subtitle track.')
    }

    if (currentlyEnabled) {
      if (currentTrack && !isOffTextTrack(currentTrack)) {
        state.lastTrack = rememberTextTrack(currentTrack)
      }
      const appliedOffTrack = selectOffTextTrack(player, tracks, setTextTrack, state.lastOffTrack)
      if (appliedOffTrack) {
        state.lastOffTrack = rememberTextTrack(appliedOffTrack)
        setFallbackSubtitleHidden(player, state, false)
        result.subtitleTrack = getTextTrackLabel(appliedOffTrack)
      } else {
        setFallbackSubtitleHidden(player, state, true, currentTrack)
        result.subtitleTrack = 'Off'
      }
      state.subtitlesEnabled = false
      result.subtitlesEnabled = false
    } else {
      setFallbackSubtitleHidden(player, state, false)
      const nextTrack = findRememberedTextTrack(tracks, state.lastTrack)
      if (!nextTrack) throw new Error('No Netflix subtitle track is available.')
      setTextTrack?.call(player, nextTrack)
      state.lastTrack = rememberTextTrack(nextTrack)
      state.subtitlesEnabled = true
      result.subtitlesEnabled = true
      result.subtitleTrack = getTextTrackLabel(nextTrack)
    }

    pageWindow.__shortcutOverrideSubtitleState = state
    result.subtitleToggleCalled = true
  }
  const selectPlayerSession = (
    videoPlayer: NetflixVideoPlayerApi,
    sessionIds: string[],
    playbackVideo: HTMLVideoElement | null
  ): { sessionId: string; player: NetflixPlayer } | null => {
    const players = sessionIds.flatMap(sessionId => {
      const player = videoPlayer.getVideoPlayerBySessionId(sessionId)
      return player ? [{ sessionId, player }] : []
    })
    if (players.length <= 1 || !playbackVideo || !Number.isFinite(playbackVideo.currentTime)) {
      return players[0] ?? null
    }

    const playbackTime = playbackVideo.currentTime * 1_000
    return players.reduce((closest, candidate) => {
      const closestTime = getPlayerCurrentTime(closest.player)
      const candidateTime = getPlayerCurrentTime(candidate.player)
      if (candidateTime === null) return closest
      if (closestTime === null) return candidate
      return Math.abs(candidateTime - playbackTime) < Math.abs(closestTime - playbackTime)
        ? candidate
        : closest
    })
  }
  const result: NetflixPageResult = {
    action,
    bridge: 'main-world',
    playerApiFound: false,
    sessionIds: [],
    playerFound: false,
    seekCalled: false,
  }
  try {
    const playerApi = (window as NetflixWindow).netflix?.appContext?.state?.playerApp?.getAPI()
      .videoPlayer

    result.playerApiFound = Boolean(playerApi)
    const sessionIds = playerApi?.getAllPlayerSessionIds() ?? []
    result.sessionIds = sessionIds
    const selected = playerApi
      ? selectPlayerSession(
          playerApi,
          sessionIds,
          findSessionReferenceVideo(window as NetflixWindow)
        )
      : null
    result.sessionId = selected?.sessionId
    const player = selected?.player
    result.playerFound = Boolean(player)

    if (action === 'getCaptionMetadata') {
      const watchId = location.pathname.match(/^\/watch\/(\d+)/)?.[1]
      if (!watchId) throw new Error('watch')
      if (!selected) throw new Error('player')
      result.captionMetadata = readCaptionMetadata(window as CaptionPage, selected.player, selected.sessionId, watchId)
    } else if (player) {
      if (action === 'diagnose') {
        // Diagnostics only inspect API availability and must not alter playback.
        result.subtitleDiagnostics = summarizeSubtitleDiagnostics(player)
      } else if (action === 'play') {
        player.play()
      } else if (action === 'pause') {
        player.pause()
      } else if ((action === 'seek' || action === 'seekTo') && value !== undefined) {
        const currentTime = player.getCurrentTime()
        result.currentTime = currentTime
        result.targetTime = action === 'seek' ? currentTime + value : value
        player.seek(result.targetTime)
        result.seekCalled = true
      } else if (action === 'setVolume' && value !== undefined) {
        player.setVolume(clampVolume(value))
      } else if (action === 'setMuted') {
        player.setMuted(Boolean(value))
      } else if (action === 'unmuteWithVolume' && value !== undefined) {
        const restored = normalizeRestoreVolume(value)
        player.setVolume(restored)
        player.setMuted(false)
        player.setVolume(restored)
      } else if (action === 'getSubtitleState') {
        readSubtitleState(window as NetflixWindow, player, result)
      } else if (action === 'toggleSubtitles') {
        toggleSubtitles(window as NetflixWindow, player, result)
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unable to access Netflix player API.'
  }

  return result
}
