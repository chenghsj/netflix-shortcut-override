import { findEnabledBindingConflicts, keyBindingFromEvent, keyBindingsEqual } from './shortcut-bindings'
import { SUBTITLE_PRACTICE_ACTIONS, type ShortcutSettings, type KeyBinding, type Locale } from './shortcut-types'

export const SUBTITLE_PRACTICE_COPY: Record<Locale, { title: string; description: string; requiresEnabled: string; resetAll: string; enabled: string; previous: string; next: string; replay: string; playback: string; loading: string; unavailable: string; boundary: string }> = {
  en: { title: 'Subtitle navigation', requiresEnabled: 'Enable shortcut override before using subtitle navigation.', description: 'Jump to the previous or next subtitle, or replay the current one, using the selected subtitle track. Enabled subtitle navigation keys take priority over other shortcuts.', resetAll: 'Reset subtitle shortcuts', enabled: 'Enable subtitle navigation shortcuts', previous: 'Previous subtitle', next: 'Next subtitle', replay: 'Replay current subtitle', playback: 'Play / pause', loading: 'Loading subtitles…', unavailable: 'Subtitles unavailable. Enable subtitles and retry.', boundary: 'No subtitle in this direction' },
  'zh-TW': { title: '字幕導航', requiresEnabled: '需先啟用快捷鍵覆寫，才能使用字幕導航。', description: '依目前選擇的字幕跳至上一句、下一句，或重播目前句子。已啟用的字幕導航按鍵優先於其他快捷鍵。', resetAll: '重設字幕導航快捷鍵', enabled: '啟用字幕導航快捷鍵', previous: '上一句', next: '下一句', replay: '重播目前句子', playback: '播放／暫停', loading: '正在取得字幕…', unavailable: '無法取得字幕，請開啟字幕後重試。', boundary: '這個方向沒有其他字幕' },
  'zh-CN': { title: '字幕导航', requiresEnabled: '需先启用快捷键覆盖，才能使用字幕导航。', description: '根据当前选择的字幕跳至上一句、下一句，或重播当前句子。已启用的字幕导航按键优先于其他快捷键。', resetAll: '重置字幕导航快捷键', enabled: '启用字幕导航快捷键', previous: '上一句', next: '下一句', replay: '重播当前句子', playback: '播放／暂停', loading: '正在获取字幕…', unavailable: '无法获取字幕，请开启字幕后重试。', boundary: '这个方向没有其他字幕' },
  ja: { title: '字幕ナビゲーション', requiresEnabled: '字幕ナビゲーションを使うには、ショートカットの上書きを有効にしてください。', description: '選択中の字幕に沿って前後の字幕へ移動したり、現在の字幕を再生したりできます。有効な字幕ナビゲーションキーは他のショートカットより優先されます。', resetAll: '字幕ショートカットをリセット', enabled: '字幕ナビゲーションショートカットを有効にする', previous: '前の字幕', next: '次の字幕', replay: '現在の字幕を再生', playback: '再生／一時停止', loading: '字幕を読み込み中…', unavailable: '字幕を取得できません。字幕を有効にして再試行してください。', boundary: 'この方向に字幕はありません' },
  ko: { title: '자막 탐색', requiresEnabled: '자막 탐색을 사용하려면 단축키 재정의를 먼저 활성화하세요.', description: '선택한 자막을 기준으로 이전 또는 다음 자막으로 이동하거나 현재 자막을 다시 재생합니다. 활성화한 자막 탐색 키는 다른 단축키보다 우선합니다.', resetAll: '자막 단축키 초기화', enabled: '자막 탐색 단축키 활성화', previous: '이전 자막', next: '다음 자막', replay: '현재 자막 다시 재생', playback: '재생 / 일시 정지', loading: '자막을 불러오는 중…', unavailable: '자막을 가져올 수 없습니다. 자막을 켜고 다시 시도하세요.', boundary: '이 방향에 자막이 없습니다' },
}

export type PracticeFailureCode = 'bridge' | 'watch' | 'player' | 'track' | 'document' | 'download' | 'permission' | 'timeout' | 'parse' | 'seek'
export const PRACTICE_FAILURE_COPY: Record<Locale, Record<PracticeFailureCode, string>> = {
  en: { bridge: 'Subtitle bridge unavailable. Reload the extension and Netflix tab.', watch: 'Open a Netflix video first.', player: 'Player not ready. Start playback and retry.', track: 'Enable a Netflix subtitle track first.', document: 'Subtitle timing is not available yet. Start playback, then retry.', download: 'Subtitle download failed. Reload the extension and Netflix tab; check subtitle website access.', permission: 'Subtitle website access is missing. Enable Netflix subtitle host access in the extension permissions.', timeout: 'Subtitle download timed out. Press the shortcut to retry.', parse: 'This subtitle format could not be read. Try another subtitle track.', seek: 'Netflix did not accept the subtitle jump. Retry.' },
  'zh-TW': { bridge: '字幕連線未就緒，請重新載入擴充功能和 Netflix 分頁。', watch: '請先開啟 Netflix 影片。', player: '播放器尚未就緒，請先播放影片再重試。', track: '請先開啟 Netflix 字幕。', document: '尚未取得字幕時間，請先播放影片再重試。', download: '字幕下載失敗，請重新載入擴充功能和 Netflix 分頁，並確認字幕來源的網站存取權。', permission: '字幕來源未授權，請在擴充功能權限中啟用 Netflix 字幕網站存取權。', timeout: '字幕下載逾時，請再次按下快捷鍵重試。', parse: '無法讀取這個字幕格式，請嘗試其他字幕軌。', seek: 'Netflix 未接受字幕跳轉，請重試。' },
  'zh-CN': { bridge: '字幕连接未就绪，请重新加载扩展和 Netflix 标签页。', watch: '请先打开 Netflix 视频。', player: '播放器尚未就绪，请先播放视频再重试。', track: '请先开启 Netflix 字幕。', document: '尚未获取字幕时间，请先播放视频再重试。', download: '字幕下载失败，请重新加载扩展和 Netflix 标签页，并确认字幕来源的网站访问权限。', permission: '字幕来源未授权，请在扩展权限中启用 Netflix 字幕网站访问权限。', timeout: '字幕下载超时，请再次按下快捷键重试。', parse: '无法读取这个字幕格式，请尝试其他字幕轨。', seek: 'Netflix 未接受字幕跳转，请重试。' },
  ja: { bridge: '字幕接続を利用できません。拡張機能と Netflix タブを再読み込みしてください。', watch: 'Netflix の動画を開いてください。', player: 'プレーヤーの準備ができていません。再生して再試行してください。', track: 'Netflix の字幕を有効にしてください。', document: '字幕の時間情報がありません。再生して再試行してください。', download: '字幕のダウンロードに失敗しました。拡張機能とタブを再読み込みし、サイトへのアクセスを確認してください。', permission: '字幕サイトへのアクセス権限がありません。拡張機能の権限で Netflix 字幕サイトへのアクセスを有効にしてください。', timeout: '字幕のダウンロードがタイムアウトしました。キーを押して再試行してください。', parse: '字幕形式を読み取れません。別の字幕を試してください。', seek: 'Netflix が字幕への移動を受け付けませんでした。再試行してください。' },
  ko: { bridge: '자막 연결을 사용할 수 없습니다. 확장 프로그램과 Netflix 탭을 새로고침하세요.', watch: 'Netflix 동영상을 먼저 여세요.', player: '플레이어가 준비되지 않았습니다. 재생 후 다시 시도하세요.', track: 'Netflix 자막을 먼저 켜세요.', document: '자막 시간 정보가 아직 없습니다. 재생 후 다시 시도하세요.', download: '자막 다운로드에 실패했습니다. 확장 프로그램과 탭을 새로고침하고 사이트 접근 권한을 확인하세요.', permission: '자막 사이트 접근 권한이 없습니다. 확장 프로그램 권한에서 Netflix 자막 사이트 접근을 허용하세요.', timeout: '자막 다운로드 시간이 초과되었습니다. 단축키를 눌러 다시 시도하세요.', parse: '이 자막 형식을 읽을 수 없습니다. 다른 자막을 시도하세요.', seek: 'Netflix가 자막 이동을 수락하지 않았습니다. 다시 시도하세요.' },
}

export const SUBTITLE_PERMISSION_COPY: Record<Locale, { denied: string; failed: string }> = {
  en: { denied: 'Website access was not granted. Subtitle navigation stays off. Turn it on again to retry.', failed: 'Could not request website access. Retry, or grant Netflix and subtitle website access in the extension permissions.' },
  'zh-TW': { denied: '尚未授予網站存取權，字幕導航保持關閉。再次開啟即可重試。', failed: '無法要求網站授權，請重試，或在擴充功能權限中啟用 Netflix 與字幕網站存取權。' },
  'zh-CN': { denied: '尚未授予网站访问权限，字幕导航保持关闭。再次开启即可重试。', failed: '无法请求网站授权，请重试，或在扩展权限中启用 Netflix 与字幕网站访问权限。' },
  ja: { denied: 'サイトへのアクセスが許可されませんでした。字幕ナビゲーションはオフのままです。再度オンにして再試行してください。', failed: 'サイトへのアクセスを要求できませんでした。再試行するか、拡張機能の権限で Netflix と字幕サイトへのアクセスを有効にしてください。' },
  ko: { denied: '사이트 접근이 허용되지 않았습니다. 자막 탐색은 꺼진 상태로 유지됩니다. 다시 켜서 재시도하세요.', failed: '사이트 접근을 요청하지 못했습니다. 다시 시도하거나 확장 프로그램 권한에서 Netflix와 자막 사이트 접근을 허용하세요.' },
}

import type { SubtitlePracticeAction } from './shortcut-types'
export type { SubtitlePracticeAction } from './shortcut-types'
export const DEFAULT_PRACTICE_BINDINGS = Object.fromEntries(SUBTITLE_PRACTICE_ACTIONS.map((action, index) => [action, { enabled: true, key: { code: ['KeyA', 'KeyD', 'KeyS', 'KeyW'][index], key: ['a', 'd', 's', 'w'][index], ctrl: false, alt: false, shift: false, meta: false } }])) as ShortcutSettings['subtitlePractice']['bindings']
export function practiceAction(event: KeyboardEvent, settings?: ShortcutSettings): SubtitlePracticeAction | null {
  if (settings && !settings.subtitlePractice.enabled) return null
  const pressed = keyBindingFromEvent(event)
  const bindings = settings?.subtitlePractice.bindings ?? DEFAULT_PRACTICE_BINDINGS
  return SUBTITLE_PRACTICE_ACTIONS.find(action => bindings[action].enabled && keyBindingsEqual(bindings[action].key, pressed)) ?? null
}
export function practiceConflict(settings: ShortcutSettings, action: SubtitlePracticeAction, key: KeyBinding): SubtitlePracticeAction | null {
  return findEnabledBindingConflicts(settings.subtitlePractice.bindings, SUBTITLE_PRACTICE_ACTIONS, action, key)[0] ?? null
}

export function subtitleStarts(input: string): number[] {
  const clock = (raw: string) => {
    const match = raw.trim().match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)\.(\d{3})$/)
    return match ? ((Number(match[1] ?? 0) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000 + Number(match[4]) : null
  }
  const starts = input.replace(/\r/g, '').split(/\n\s*\n/).flatMap(block => {
    const lines = block.trim().split('\n')
    const index = lines.findIndex(line => line.includes('-->'))
    if (index < 0 || !lines.slice(index + 1).join('').trim()) return []
    const [start, end] = lines[index].split('-->')
    const left = clock(start), right = clock(end?.trim().split(/\s+/)[0] ?? '')
    return left !== null && right !== null && right > left ? [left] : []
  })
  return [...new Set(starts)].sort((a, b) => a - b)
}

export function subtitleTarget(starts: number[], currentMs: number, action: Exclude<SubtitlePracticeAction, 'playback'>): number | null {
  if (!Number.isFinite(currentMs)) return null
  const next = starts.findIndex(start => start > currentMs + 50)
  const current = next === -1 ? starts.length - 1 : next - 1
  const index = action === 'next' ? next : action === 'previous' ? current - 1 : Math.max(0, current)
  return starts[index] ?? null
}
