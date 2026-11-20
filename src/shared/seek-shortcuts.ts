import { getSubtitleSizeShortcutLabel } from './subtitle-size-shortcuts'
import { getCopy } from './i18n'
import type { Locale, SeekShortcut, SeekShortcutAction, ShortcutAction, ShortcutSettings } from './shortcut-types'

export const SEEK_SHORTCUT_LIMITS = { seconds: 300, percentage: 100 } as const
const LEGACY_MAX_SEEK_SECONDS = 3600

export const isSeekShortcutAction = (value: string): value is SeekShortcutAction =>
  /^seek:[a-zA-Z0-9-]{1,64}$/.test(value)

export const isLegacySeekShortcut = (value: unknown): value is SeekShortcut => {
  if (!value || typeof value !== 'object') return false
  const shortcut = value as Partial<SeekShortcut>
  return typeof shortcut.id === 'string' && isSeekShortcutAction(shortcut.id) &&
    typeof shortcut.value === 'number' && Number.isInteger(shortcut.value) &&
    (shortcut.kind === 'relative'
      ? shortcut.value !== 0 && Math.abs(shortcut.value) <= LEGACY_MAX_SEEK_SECONDS
      : shortcut.kind === 'percentage' && shortcut.value >= 0 && shortcut.value <= 100)
}

export const isSeekShortcut = (value: unknown): value is SeekShortcut =>
  isLegacySeekShortcut(value) && (value.kind !== 'relative' || (value.value > 0 && value.value <= SEEK_SHORTCUT_LIMITS.seconds))

export type SeekDirection = 'backward' | 'forward'

export const getSeekPairAction = (shortcut: SeekShortcut, direction: SeekDirection): SeekShortcutAction =>
  `${shortcut.id}-${direction}`

export const getSeekShortcutActions = (shortcut: SeekShortcut): SeekShortcutAction[] =>
  shortcut.kind === 'relative'
    ? [getSeekPairAction(shortcut, 'backward'), getSeekPairAction(shortcut, 'forward')]
    : [shortcut.id]

export const resolveSeekShortcut = (settings: ShortcutSettings, action: ShortcutAction): SeekShortcut | undefined => {
  for (const shortcut of settings.seekShortcuts) {
    if (shortcut.kind === 'percentage' && shortcut.id === action) return shortcut
    if (shortcut.kind === 'relative') {
      if (getSeekPairAction(shortcut, 'backward') === action) return { ...shortcut, value: -shortcut.value }
      if (getSeekPairAction(shortcut, 'forward') === action) return shortcut
    }
  }
}

export const SEEK_SHORTCUT_COPY = {
  en: { title: 'Custom seeking', type: 'Seek type', forward: 'Forward', backward: 'Rewind', percentage: 'Video progress (%)', seconds: 'Seconds', add: 'Add', remove: 'Remove {action}', relativeLabel: '{direction} {value} seconds', percentageLabel: '{value}%', empty: 'Add a time interval or a video percentage, then record its shortcut.', unavailable: 'Episode unavailable' },
  'zh-TW': { title: '自訂跳轉', type: '跳轉方式', forward: '前進', backward: '後退', percentage: '影片進度（%）', seconds: '秒數', add: '新增', remove: '刪除 {action}', relativeLabel: '{direction} {value} 秒', percentageLabel: '{value}%', empty: '選擇秒數或影片進度，再錄製快捷鍵來新增。', unavailable: '無法切換至該集' },
  'zh-CN': { title: '自定义跳转', type: '跳转方式', forward: '前进', backward: '后退', percentage: '影片进度（%）', seconds: '秒数', add: '添加', remove: '删除 {action}', relativeLabel: '{direction} {value} 秒', percentageLabel: '{value}%', empty: '选择秒数或影片进度，再录制快捷键来添加。', unavailable: '无法切换至该集' },
  ja: { title: 'カスタムシーク', type: '移動方法', forward: '進む', backward: '戻る', percentage: '動画の再生位置（%）', seconds: '秒数', add: '追加', remove: '{action}を削除', relativeLabel: '{value}秒{direction}', percentageLabel: '{value}%', empty: '秒数または再生位置を選び、キーを記録して追加します。', unavailable: 'エピソードを切り替えられません' },
  ko: { title: '사용자 지정 탐색', type: '탐색 방식', forward: '앞으로', backward: '뒤로', percentage: '동영상 위치 (%)', seconds: '초', add: '추가', remove: '{action} 삭제', relativeLabel: '{value}초 {direction}', percentageLabel: '{value}%', empty: '초 또는 동영상 위치를 선택한 후 단축키를 기록해 추가하세요.', unavailable: '에피소드를 전환할 수 없습니다' },
  es: {
    title: 'Saltos personalizados',
    type: 'Tipo de salto',
    forward: 'Avanzar',
    backward: 'Retroceder',
    percentage: 'Progreso del video (%)',
    seconds: 'Segundos',
    add: 'Agregar',
    remove: 'Quitar {action}',
    relativeLabel: '{direction} {value} s',
    percentageLabel: '{value}%',
    empty: 'Agrega un intervalo o un porcentaje del video y asigna su atajo.',
    unavailable: 'Episodio no disponible',
  },
  'pt-BR': {
    title: 'Saltos personalizados',
    type: 'Tipo de salto',
    forward: 'Avançar',
    backward: 'Voltar',
    percentage: 'Progresso do vídeo (%)',
    seconds: 'Segundos',
    add: 'Adicionar',
    remove: 'Remover {action}',
    relativeLabel: '{direction} {value} s',
    percentageLabel: '{value}%',
    empty: 'Adicione um intervalo ou uma porcentagem do vídeo e defina o atalho.',
    unavailable: 'Episódio indisponível',
  },
  fr: {
    title: 'Sauts personnalisés',
    type: 'Type de saut',
    forward: 'Avancer',
    backward: 'Reculer',
    percentage: 'Position dans la vidéo (%)',
    seconds: 'Secondes',
    add: 'Ajouter',
    remove: 'Retirer {action}',
    relativeLabel: '{direction} de {value} s',
    percentageLabel: '{value} %',
    empty: 'Ajoutez une durée ou un pourcentage de la vidéo, puis attribuez un raccourci.',
    unavailable: 'Épisode indisponible',
  },
  de: {
    title: 'Benutzerdefinierte Sprünge',
    type: 'Sprungtyp',
    forward: 'Vorspringen',
    backward: 'Zurückspringen',
    percentage: 'Position im Video (%)',
    seconds: 'Sekunden',
    add: 'Hinzufügen',
    remove: '{action} entfernen',
    relativeLabel: '{direction} um {value} s',
    percentageLabel: '{value} %',
    empty: 'Fügen Sie ein Intervall oder eine Position in Prozent hinzu und legen Sie das Tastenkürzel fest.',
    unavailable: 'Folge nicht verfügbar',
  },
  id: {
    title: 'Lompatan khusus',
    type: 'Jenis lompatan',
    forward: 'Maju',
    backward: 'Mundur',
    percentage: 'Posisi video (%)',
    seconds: 'Detik',
    add: 'Tambah',
    remove: 'Hapus {action}',
    relativeLabel: '{direction} {value} detik',
    percentageLabel: '{value}%',
    empty: 'Tambahkan interval atau persentase video, lalu tetapkan pintasannya.',
    unavailable: 'Episode tidak tersedia',
  },
} satisfies Record<Locale, Record<string, string>>

export const SEEK_PAIR_COPY = {
  en: { pair: 'Forward / Rewind', unit: 's', group: 'Forward / Rewind {value} seconds', add: 'Add seek pair', backwardKey: 'Rewind', forwardKey: 'Forward', record: 'Press a key combination', recording: 'Recording…', description: 'One interval, with separate rewind and forward keys. Both are saved together.', duplicate: 'Choose different keys for rewind and forward.' },
  'zh-TW': { pair: '前進／後退', unit: '秒', group: '前進／後退 {value} 秒', add: '新增前進／後退組合', backwardKey: '後退', forwardKey: '前進', record: '按下按鍵組合', recording: '錄製中…', description: '共用一個跳轉秒數，分別設定後退與前進快捷鍵，再一起儲存。', duplicate: '前進與後退請使用不同的快捷鍵。' },
  'zh-CN': { pair: '前进／后退', unit: '秒', group: '前进／后退 {value} 秒', add: '添加前进／后退组合', backwardKey: '后退', forwardKey: '前进', record: '按下按键组合', recording: '录制中…', description: '共用一个跳转秒数，分别设置后退与前进快捷键，再一起保存。', duplicate: '前进与后退请使用不同的快捷键。' },
  ja: { pair: '進む／戻る', unit: '秒', group: '{value}秒進む／戻る', add: 'シークのペアを追加', backwardKey: '戻る', forwardKey: '進む', record: 'キーの組み合わせを押す', recording: '記録中…', description: '移動秒数を共用し、戻るキーと進むキーを一緒に保存します。', duplicate: '戻るキーと進むキーは別々にしてください。' },
  ko: { pair: '앞으로 / 뒤로', unit: '초', group: '{value}초 앞으로 / 뒤로', add: '탐색 단축키 쌍 추가', backwardKey: '뒤로', forwardKey: '앞으로', record: '키 조합을 누르세요', recording: '기록 중…', description: '이동 시간을 공유하고 뒤로 및 앞으로 키를 함께 저장합니다.', duplicate: '뒤로 및 앞으로 키는 서로 달라야 합니다.' },
  es: {
    pair: 'Avanzar / Retroceder',
    unit: 's',
    group: 'Avanzar / Retroceder {value} s',
    add: 'Agregar avance y retroceso',
    backwardKey: 'Retroceder',
    forwardKey: 'Avanzar',
    record: 'Pulsa una combinación de teclas',
    recording: 'Registrando…',
    description: 'Define un intervalo y dos atajos, uno para avanzar y otro para retroceder. Se guardan juntos.',
    duplicate: 'Elige teclas distintas para avanzar y retroceder.',
  },
  'pt-BR': {
    pair: 'Avançar / Voltar',
    unit: 's',
    group: 'Avançar / Voltar {value} s',
    add: 'Adicionar avanço e retrocesso',
    backwardKey: 'Voltar',
    forwardKey: 'Avançar',
    record: 'Pressione uma combinação de teclas',
    recording: 'Registrando…',
    description: 'Defina um intervalo e dois atalhos, um para avançar e outro para voltar. Os dois são salvos juntos.',
    duplicate: 'Escolha teclas diferentes para avançar e voltar.',
  },
  fr: {
    pair: 'Avancer / Reculer',
    unit: 's',
    group: 'Avancer / Reculer de {value} s',
    add: 'Ajouter une paire de sauts',
    backwardKey: 'Reculer',
    forwardKey: 'Avancer',
    record: 'Appuyez sur une combinaison de touches',
    recording: 'Enregistrement…',
    description: 'Définissez une durée et deux raccourcis, l’un pour reculer et l’autre pour avancer. Ils sont enregistrés ensemble.',
    duplicate: 'Choisissez des touches différentes pour avancer et reculer.',
  },
  de: {
    pair: 'Vor / Zurück',
    unit: 's',
    group: '{value} s vor / zurück',
    add: 'Sprungpaar hinzufügen',
    backwardKey: 'Zurück',
    forwardKey: 'Vor',
    record: 'Tastenkombination drücken',
    recording: 'Wird erfasst…',
    description: 'Legen Sie ein Intervall und getrennte Tasten für Vor- und Rücksprünge fest. Sie werden zusammen gespeichert.',
    duplicate: 'Wählen Sie unterschiedliche Tasten für Vor- und Rücksprünge.',
  },
  id: {
    pair: 'Maju / Mundur',
    unit: 'detik',
    group: 'Maju / Mundur {value} detik',
    add: 'Tambah pasangan lompatan',
    backwardKey: 'Mundur',
    forwardKey: 'Maju',
    record: 'Tekan kombinasi tombol',
    recording: 'Merekam…',
    description: 'Atur satu interval dengan tombol maju dan mundur yang berbeda. Keduanya disimpan bersama.',
    duplicate: 'Pilih tombol yang berbeda untuk maju dan mundur.',
  },
} satisfies Record<Locale, Record<string, string>>

export const SEEK_SECTION_COPY = {
  en: { percentage: 'Jump to position', addPercentage: 'Add percentage shortcut', emptyPercentage: 'No percentage shortcuts yet. Choose Add to set a video position.', emptyPercentageSummary: 'No percentage shortcuts configured.', relativeHint: 'Set an interval, then record the rewind and forward keys together.', percentageHint: 'Set a video position, then record its shortcut.' },
  'zh-TW': { percentage: '進度跳轉', addPercentage: '新增百分比快捷鍵', emptyPercentage: '尚未設定百分比快捷鍵。點選「新增」設定跳轉位置。', emptyPercentageSummary: '尚未設定百分比快捷鍵。', relativeHint: '設定共用秒數，再一起錄製後退與前進快捷鍵。', percentageHint: '設定影片進度百分比，再錄製對應的快捷鍵。' },
  'zh-CN': { percentage: '进度跳转', addPercentage: '添加百分比快捷键', emptyPercentage: '尚未设置百分比快捷键。点击“添加”设置跳转位置。', emptyPercentageSummary: '尚未设置百分比快捷键。', relativeHint: '设置共用秒数，再一起录制后退与前进快捷键。', percentageHint: '设置影片进度百分比，再录制对应的快捷键。' },
  ja: { percentage: '再生位置へ移動', addPercentage: '再生位置のキーを追加', emptyPercentage: '再生位置のキーはまだありません。「追加」で移動先を設定できます。', emptyPercentageSummary: '再生位置のキーはまだありません。', relativeHint: '移動秒数を設定し、戻るキーと進むキーを一緒に記録します。', percentageHint: '動画の再生位置（%）を設定し、対応するキーを記録します。' },
  ko: { percentage: '재생 위치 이동', addPercentage: '재생 위치 단축키 추가', emptyPercentage: '재생 위치 단축키가 없습니다. 추가를 눌러 이동할 위치를 설정하세요.', emptyPercentageSummary: '재생 위치 단축키가 없습니다.', relativeHint: '이동 시간을 설정한 후 뒤로 및 앞으로 키를 함께 기록하세요.', percentageHint: '동영상 재생 위치(%)를 설정한 후 단축키를 기록하세요.' },
  es: {
    percentage: 'Saltar a una posición',
    addPercentage: 'Agregar atajo por porcentaje',
    emptyPercentage: 'Todavía no hay atajos por porcentaje. Elige Agregar para definir una posición del video.',
    emptyPercentageSummary: 'No hay atajos por porcentaje.',
    relativeHint: 'Define un intervalo y luego asigna los dos atajos.',
    percentageHint: 'Define una posición en el video y luego asigna el atajo.',
  },
  'pt-BR': {
    percentage: 'Ir para uma posição',
    addPercentage: 'Adicionar atalho por porcentagem',
    emptyPercentage: 'Ainda não há atalhos por porcentagem. Selecione Adicionar para definir uma posição no vídeo.',
    emptyPercentageSummary: 'Nenhum atalho por porcentagem definido.',
    relativeHint: 'Defina um intervalo e depois os atalhos de avanço e retrocesso.',
    percentageHint: 'Defina uma posição no vídeo e depois defina o atalho.',
  },
  fr: {
    percentage: 'Sauter à une position',
    addPercentage: 'Ajouter un raccourci en pourcentage',
    emptyPercentage: 'Aucun raccourci en pourcentage. Choisissez Ajouter pour définir une position dans la vidéo.',
    emptyPercentageSummary: 'Aucun raccourci en pourcentage.',
    relativeHint: 'Définissez une durée, puis attribuez les deux raccourcis.',
    percentageHint: 'Définissez une position dans la vidéo, puis attribuez son raccourci.',
  },
  de: {
    percentage: 'Zu Position springen',
    addPercentage: 'Tastenkürzel für Prozentposition hinzufügen',
    emptyPercentage: 'Noch keine Tastenkürzel für Prozentpositionen. Wählen Sie Hinzufügen, um eine Position im Video festzulegen.',
    emptyPercentageSummary: 'Keine Tastenkürzel für Prozentpositionen eingerichtet.',
    relativeHint: 'Legen Sie ein Intervall fest und weisen Sie dann die Tasten für Vor- und Rücksprünge zu.',
    percentageHint: 'Legen Sie eine Position im Video fest und weisen Sie dann das Tastenkürzel zu.',
  },
  id: {
    percentage: 'Lompat ke posisi',
    addPercentage: 'Tambah pintasan persentase',
    emptyPercentage: 'Belum ada pintasan persentase. Pilih Tambah untuk menetapkan posisi video.',
    emptyPercentageSummary: 'Tidak ada pintasan persentase yang ditetapkan.',
    relativeHint: 'Atur interval, lalu tetapkan tombol mundur dan maju.',
    percentageHint: 'Atur posisi video, lalu tetapkan pintasannya.',
  },
} satisfies Record<Locale, Record<string, string>>

export const getRelativeSeekLabel = (value: number, locale: Locale, direction: SeekDirection): string => {
  const copy = SEEK_SHORTCUT_COPY[locale]
  return copy.relativeLabel.replace('{direction}', direction === 'backward' ? copy.backward : copy.forward)
    .replace('{value}', String(Math.abs(value)))
}

export const getSeekShortcutLabel = (shortcut: SeekShortcut, locale: Locale, direction?: SeekDirection): string => {
  const copy = SEEK_SHORTCUT_COPY[locale]
  return shortcut.kind === 'percentage'
    ? copy.percentageLabel.replace('{value}', String(shortcut.value))
    : !direction ? SEEK_PAIR_COPY[locale].group.replace('{value}', String(shortcut.value))
    : getRelativeSeekLabel(shortcut.value, locale, direction)
}

export const getShortcutLabels = (settings: ShortcutSettings, locale: Locale): Record<ShortcutAction, string> => ({
  ...getCopy(locale).actions,
  ...Object.fromEntries(settings.preferredSpeedShortcuts.map(shortcut => [shortcut.id, `${getCopy(locale).actions.setPreferredSpeed} · ${shortcut.speed}×`])),
  ...Object.fromEntries(settings.subtitleSizeShortcuts.map(shortcut => [shortcut.id, getSubtitleSizeShortcutLabel(shortcut, locale)])),
  ...Object.fromEntries(settings.seekShortcuts.flatMap(shortcut => shortcut.kind === 'relative'
    ? (['backward', 'forward'] as const).map(direction => [getSeekPairAction(shortcut, direction), getSeekShortcutLabel(shortcut, locale, direction)])
    : [[shortcut.id, getSeekShortcutLabel(shortcut, locale)]])),
})
