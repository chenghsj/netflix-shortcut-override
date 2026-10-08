import { expect, it, vi } from 'vitest'
import { CAPTION_BYTE_LIMIT, fetchNetflixCaptionText } from './netflix-caption-fetch'

it('does not request a subtitle CDN without granted host access', async () => {
  vi.mocked(chrome.permissions.contains).mockImplementation(() => Promise.resolve(false) as never)
  const request = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('NetworkError'))
  await expect(fetchNetflixCaptionText('https://a.nflxvideo.net/sub?secret=token', request))
    .rejects.toMatchObject({ code: 'CAPTION_PERMISSION_REQUIRED' })
  expect(chrome.permissions.contains).toHaveBeenCalledWith({ origins: ['https://a.nflxvideo.net/*'] })
  expect(request).not.toHaveBeenCalled()
})

it('rejects unsupported endpoints without checking permissions or sending a request', async () => {
  const request = vi.fn<typeof fetch>()
  for (const url of ['https://nflxvideo.net.attacker.example/sub', 'http://a.nflxvideo.net/sub', 'https://user:pass@a.nflxvideo.net/sub', 'https://a.nflximg.net/sub', 'https://a.nflxext.com/sub']) {
    await expect(fetchNetflixCaptionText(url, request)).rejects.toThrow('rejected')
  }
  expect(request).not.toHaveBeenCalled()
  expect(chrome.permissions.contains).not.toHaveBeenCalled()
})
it('downloads a bounded subtitle document without following redirects', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('WEBVTT'))
  await expect(fetchNetflixCaptionText('https://a.nflxvideo.net/sub', request)).resolves.toBe('WEBVTT')
  expect(request).toHaveBeenCalledWith('https://a.nflxvideo.net/sub', expect.objectContaining({ credentials: 'include', redirect: 'manual' }))
  request.mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'https://example.org' } }))
  await expect(fetchNetflixCaptionText('https://a.nflxvideo.net/sub', request)).rejects.toThrow('redirected')
})
it('enforces the byte limit on streamed bodies even without content-length', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('a'.repeat(CAPTION_BYTE_LIMIT + 1)))
  await expect(fetchNetflixCaptionText('https://a.nflxvideo.net/sub', request)).rejects.toThrow('2 MB')
})
