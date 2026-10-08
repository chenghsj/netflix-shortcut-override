import { afterEach, expect, it, vi } from 'vitest'
import { getCaptionMetadata } from './netflix-caption-metadata'
import { executeNetflixPageApi } from './netflix-page-api-executor'

afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState(null, '', '/') })
it('resolves the selected track reference through the complete subtitle catalogue', () => {
  window.history.replaceState(null, '', '/watch/123')
  const selected = { trackId: 'ja-main', bcp47: 'ja' }
  const catalogue = { ...selected, ttDownloadables: { 'webvtt-lssdh': { downloadUrls: { main: 'https://a.nflxvideo.net/sub.vtt' } } } }
  const player = { getCurrentTime: () => 10000, getTextTrack: () => selected, getTextTrackList: () => [catalogue] }
  vi.stubGlobal('netflix', { appContext: { state: { playerApp: { getAPI: () => ({ videoPlayer: { getAllPlayerSessionIds: () => ['session'], getVideoPlayerBySessionId: () => player } }) } } } })
  const expected = { key: '123:session:ja-main', url: 'https://a.nflxvideo.net/sub.vtt', currentMs: 10000 }
  expect(getCaptionMetadata()).toMatchObject(expected)
  // executeScript transfers the function body, not its imports or closures.
  const injected = Function(`return (${executeNetflixPageApi.toString()})`)() as typeof executeNetflixPageApi
  expect(injected('getCaptionMetadata').captionMetadata).toMatchObject(expected)
})

it.each(['nflximg.net', 'nflxext.com'])('rejects %s subtitle URLs in both bridge and serialized execution', domain => {
  window.history.replaceState(null, '', '/watch/123')
  const track = { trackId: 'en', url: `https://a.${domain}/sub.vtt` }
  const player = { getCurrentTime: () => 10000, getTextTrack: () => track, getTextTrackList: () => [track] }
  vi.stubGlobal('netflix', { appContext: { state: { playerApp: { getAPI: () => ({ videoPlayer: { getAllPlayerSessionIds: () => ['session'], getVideoPlayerBySessionId: () => player } }) } } } })
  expect(() => getCaptionMetadata()).toThrow('document')
  const injected = Function(`return (${executeNetflixPageApi.toString()})`)() as typeof executeNetflixPageApi
  expect(injected('getCaptionMetadata')).toMatchObject({ error: 'document' })
  // A supported alternative on the same selected track must remain usable.
  Object.assign(track, { downloadUrls: { main: 'https://a.nflxvideo.net/sub.vtt' } })
  expect(getCaptionMetadata()).toMatchObject({ url: 'https://a.nflxvideo.net/sub.vtt' })
  expect(injected('getCaptionMetadata').captionMetadata).toMatchObject({ url: 'https://a.nflxvideo.net/sub.vtt' })
})
