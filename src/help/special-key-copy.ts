import type { Locale } from '@/shared/shortcut-types'
import type { SpecialShortcutKey, SpecialShortcutKeyGroup } from '@/shared/special-shortcut-keys'

export const SPECIAL_KEY_LABELS: Record<Locale, Record<SpecialShortcutKey, string>> = {
  en: {
    MediaTrackNext: 'Next track key', MediaTrackPrevious: 'Previous track key',
    MediaPlayPause: 'Play / pause key', MediaStop: 'Stop key',
    MediaPlay: 'Play key', MediaPause: 'Pause key',
    MediaFastForward: 'Fast-forward key', MediaRewind: 'Rewind key', MediaRecord: 'Record key',
    AudioVolumeUp: 'Volume up key', AudioVolumeDown: 'Volume down key', AudioVolumeMute: 'Mute key',
    BrowserBack: 'Browser back key', BrowserForward: 'Browser forward key',
  },
  'zh-TW': {
    MediaTrackNext: '下一首鍵', MediaTrackPrevious: '上一首鍵',
    MediaPlayPause: '播放／暫停鍵', MediaStop: '停止鍵',
    MediaPlay: '播放鍵', MediaPause: '暫停鍵',
    MediaFastForward: '快轉鍵', MediaRewind: '倒轉鍵', MediaRecord: '錄製鍵',
    AudioVolumeUp: '增加音量鍵', AudioVolumeDown: '降低音量鍵', AudioVolumeMute: '靜音鍵',
    BrowserBack: '上一頁鍵', BrowserForward: '下一頁鍵',
  },
  'zh-CN': {
    MediaTrackNext: '下一首键', MediaTrackPrevious: '上一首键',
    MediaPlayPause: '播放／暂停键', MediaStop: '停止键',
    MediaPlay: '播放键', MediaPause: '暂停键',
    MediaFastForward: '快进键', MediaRewind: '快退键', MediaRecord: '录制键',
    AudioVolumeUp: '增大音量键', AudioVolumeDown: '降低音量键', AudioVolumeMute: '静音键',
    BrowserBack: '上一页键', BrowserForward: '下一页键',
  },
  ja: {
    MediaTrackNext: '次のトラックキー', MediaTrackPrevious: '前のトラックキー',
    MediaPlayPause: '再生／一時停止キー', MediaStop: '停止キー',
    MediaPlay: '再生キー', MediaPause: '一時停止キー',
    MediaFastForward: '早送りキー', MediaRewind: '巻き戻しキー', MediaRecord: '録音・録画キー',
    AudioVolumeUp: '音量アップキー', AudioVolumeDown: '音量ダウンキー', AudioVolumeMute: 'ミュートキー',
    BrowserBack: 'ブラウザーの戻るキー', BrowserForward: 'ブラウザーの進むキー',
  },
  ko: {
    MediaTrackNext: '다음 트랙 키', MediaTrackPrevious: '이전 트랙 키',
    MediaPlayPause: '재생 / 일시 정지 키', MediaStop: '정지 키',
    MediaPlay: '재생 키', MediaPause: '일시 정지 키',
    MediaFastForward: '빨리 감기 키', MediaRewind: '되감기 키', MediaRecord: '녹음 / 녹화 키',
    AudioVolumeUp: '음량 높이기 키', AudioVolumeDown: '음량 낮추기 키', AudioVolumeMute: '음소거 키',
    BrowserBack: '브라우저 뒤로 키', BrowserForward: '브라우저 앞으로 키',
  },
}

export const SPECIAL_KEY_GUIDE_COPY = {
  'en': {
    groups: {media: 'Media keys', volume: 'Volume keys', browser: 'Browser keys'},
    generalTitle: 'Standard keyboard keys',
    general: 'Letters, digits, F1–F24, arrows, Home/End, PageUp/PageDown, Enter, Backspace and Delete can be recorded when the browser delivers them.',
    combinations: 'Combine a key with Ctrl, Alt, Shift, Win (Windows) or Command (macOS).',
    reservedTitle: 'Key restrictions when setting shortcuts',
    reserved: '- Tab: moves focus. Tab and combinations containing Tab cannot be assigned.\n- Esc: closes the shortcut settings dialog. Esc and combinations containing Esc cannot be assigned.\n- Ctrl / Alt / Shift: must be combined with another key; they cannot be assigned alone.\n- Win / Command: must be combined with another key; they cannot be assigned alone. Combinations intercepted by the operating system cannot be recorded.\n- Fn: the keyboard or operating system may handle this key directly. Recording Fn or Fn combinations is not guaranteed.',
    aliasesTitle: 'Older key names',
  },
  'zh-TW': {
    groups: {media: '媒體按鍵', volume: '音量按鍵', browser: '瀏覽器按鍵'},
    generalTitle: '一般鍵盤按鍵',
    general: '可錄製字母、數字、F1–F24、方向鍵、Home／End、PageUp／PageDown、Enter、Backspace、Delete 等瀏覽器能收到的按鍵。',
    combinations: '可搭配 Ctrl、Alt、Shift、Win（Windows）或 Command（macOS）組成快捷鍵。',
    reservedTitle: '設定快捷鍵時的按鍵限制',
    reserved: '- Tab：切換焦點，無法設定 Tab 或包含 Tab 的組合鍵。\n- Esc：關閉快捷鍵設定視窗，無法設定 Esc 或包含 Esc 的組合鍵。\n- Ctrl／Alt／Shift：需搭配其他鍵，無法單獨設定。\n- Win／Command：需搭配其他鍵，無法單獨設定；系統攔截的組合鍵無法錄入。\n- Fn：可能由鍵盤或系統直接處理，不保證能設定 Fn 或 Fn 組合鍵。',
    aliasesTitle: '舊版按鍵名稱',
  },
  'zh-CN': {
    groups: {media: '媒体按键', volume: '音量按键', browser: '浏览器按键'},
    generalTitle: '普通键盘按键',
    general: '可录制字母、数字、F1–F24、方向键、Home／End、PageUp／PageDown、Enter、Backspace、Delete 等浏览器能收到的按键。',
    combinations: '可搭配 Ctrl、Alt、Shift、Win（Windows）或 Command（macOS）组成快捷键。',
    reservedTitle: '设置快捷键时的按键限制',
    reserved: '- Tab：切换焦点，无法设置 Tab 或包含 Tab 的组合键。\n- Esc：关闭快捷键设置窗口，无法设置 Esc 或包含 Esc 的组合键。\n- Ctrl／Alt／Shift：需搭配其他键，无法单独设置。\n- Win／Command：需搭配其他键，无法单独设置；系统拦截的组合键无法录入。\n- Fn：可能由键盘或系统直接处理，不保证能设置 Fn 或 Fn 组合键。',
    aliasesTitle: '旧版按键名称',
  },
  'ja': {
    groups: {media: 'メディアキー', volume: '音量キー', browser: 'ブラウザーキー'},
    generalTitle: '通常のキーボードキー',
    general: 'ブラウザーが受け取れる文字、数字、F1〜F24、矢印、Home／End、PageUp／PageDown、Enter、Backspace、Delete などを記録できます。',
    combinations: 'Ctrl、Alt、Shift、Win（Windows）、Command（macOS）と組み合わせられます。',
    reservedTitle: 'ショートカット設定時のキー制限',
    reserved: '- Tab：フォーカスを移動します。Tab 単独や Tab を含む組み合わせは設定できません。\n- Esc：ショートカット設定画面を閉じます。Esc 単独や Esc を含む組み合わせは設定できません。\n- Ctrl／Alt／Shift：他のキーと組み合わせてください。単独では設定できません。\n- Win／Command：他のキーと組み合わせてください。単独では設定できません。OS が処理する組み合わせは記録できません。\n- Fn：キーボードや OS が直接処理する場合があるため、Fn 単独や Fn を含む組み合わせを記録できるとは限りません。',
    aliasesTitle: '以前のキー名',
  },
  'ko': {
    groups: {media: '미디어 키', volume: '음량 키', browser: '브라우저 키'},
    generalTitle: '일반 키보드 키',
    general: '브라우저가 전달하는 문자, 숫자, F1–F24, 방향키, Home/End, PageUp/PageDown, Enter, Backspace, Delete 등을 기록할 수 있습니다.',
    combinations: 'Ctrl, Alt, Shift, Win(Windows), Command(macOS)와 조합할 수 있습니다.',
    reservedTitle: '단축키 설정 시 키 제한',
    reserved: '- Tab: 포커스를 이동합니다. Tab 단독이나 Tab이 포함된 조합은 설정할 수 없습니다.\n- Esc: 단축키 설정 창을 닫습니다. Esc 단독이나 Esc가 포함된 조합은 설정할 수 없습니다.\n- Ctrl / Alt / Shift: 다른 키와 조합해야 하며, 단독으로는 설정할 수 없습니다.\n- Win / Command: 다른 키와 조합해야 하며, 단독으로는 설정할 수 없습니다. 운영체제가 먼저 처리하는 조합은 기록할 수 없습니다.\n- Fn: 키보드나 운영체제가 직접 처리할 수 있어 Fn 단독이나 Fn 조합의 기록은 보장되지 않습니다.',
    aliasesTitle: '이전 키 이름',
  },
} satisfies Record<Locale, {
  groups: Record<SpecialShortcutKeyGroup, string>
  generalTitle: string
  general: string
  combinations: string
  reservedTitle: string
  reserved: string
  aliasesTitle: string
}>
