import type { Locale, ShortcutAction } from '@/shared/shortcuts'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文',
  ja: '日本語',
  ko: '한국어',
}

export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  en: 'EN',
  'zh-TW': '繁中',
  'zh-CN': '简中',
  ja: '日本語',
  ko: '한국어',
}

type Copy = {
  appTitle: string
  enabled: string
  enabledDesc: string
  showHints: string
  showHintsDesc: string
  quickSettings: string
  savingSettings: string
  settingsSaveError: string
  openOptions: string
  githubRepository: string
  githubRepositoryAriaLabel: string
  otherProjects: string
  otherProjectsAriaLabel: string
  streamDanmakuStore: string
  streamDanmakuStoreAriaLabel: string
  popupNetflixPage: string
  popupNetflixOnly: string
  locale: string
  speed: string
  speedDesc: string
  minSpeed: string
  minSpeedTooltip: string
  maxSpeed: string
  maxSpeedTooltip: string
  step: string
  stepDesc: string
  stepTooltip: string
  holdSpeed: string
  holdSpeedDesc: string
  holdSpeedTooltip: string
  seek: string
  seekDesc: string
  seekSeconds: string
  seekSecondsDesc: string
  seekSecondsTooltip: string
  shortcuts: string
  shortcutsDesc: string
  action: string
  key: string
  status: string
  columnActions: string
  edit: string
  reset: string
  resetAll: string
  resetSpeedSettings: string
  resetSeekSettings: string
  disabledStatus: string
  recordTitle: string
  recordDesc: string
  pressKey: string
  cancel: string
  save: string
  conflict: string
  noConflict: string
  actions: Record<ShortcutAction, string>
  hints: Record<
    | 'rewind'
    | 'forward'
    | 'mute'
    | 'unmute'
    | 'play'
    | 'pause'
    | 'fullscreen'
    | 'skipIntro'
    | 'speed',
    string
  >
}

export const COPY: Record<Locale, Copy> = {
  en: {
    appTitle: 'Shortcut Override for Netflix',
    enabled: 'Enable shortcut override',
    enabledDesc: 'Enable custom playback shortcuts on Netflix watch pages.',
    showHints: 'Show media hints',
    showHintsDesc: 'Show a small overlay after shortcut actions.',
    quickSettings: 'General settings',
    savingSettings: 'Saving settings...',
    settingsSaveError: 'Settings were not saved',
    openOptions: 'Open options',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: 'Open GitHub repository',
    otherProjects: 'Other projects',
    otherProjectsAriaLabel: 'Other projects',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      'Open Stream Danmaku, another project by the same maker, in the Chrome Web Store',
    popupNetflixPage: 'Open a Netflix title to use shortcuts.',
    popupNetflixOnly: 'Shortcuts only run on Netflix watch pages.',
    locale: 'Language',
    speed: 'Speed shortcuts',
    speedDesc: 'Set the range and step size for speed up/down shortcuts.',
    minSpeed: 'Lowest speed',
    minSpeedTooltip: 'Minimum speed for speed-down shortcuts.\nRange 0.25x-1.0x.',
    maxSpeed: 'Highest speed',
    maxSpeedTooltip: 'Maximum speed for speed-up shortcuts.\nRange 1.0x-4.0x.',
    step: 'Each change',
    stepDesc: 'Amount changed each time you press speed up or speed down.',
    stepTooltip: 'Speed change per press.\nRange 0.05x-4.0x, rounded to 0.05x.',
    holdSpeed: 'Space hold speed',
    holdSpeedDesc: 'Temporarily switch to this speed while Space is held, then restore.',
    holdSpeedTooltip: 'Temporary speed while holding Space.\nRange 0.25x-4.0x.',
    seek: 'Seek shortcuts',
    seekDesc: 'Set how far the rewind and forward shortcuts move playback.',
    seekSeconds: 'Left / Right seconds',
    seekSecondsDesc: 'Amount of time moved each time you press Left or Right.',
    seekSecondsTooltip: 'Seconds moved per Left/Right press.\nRange 1-60s.',
    shortcuts: 'Shortcuts',
    shortcutsDesc: 'Record keys, disable individual actions, or reset defaults.',
    action: 'Action',
    key: 'Key',
    status: 'Enabled',
    columnActions: 'Action',
    edit: 'Edit',
    reset: 'Reset',
    resetAll: 'Reset all shortcuts',
    resetSpeedSettings: 'Reset speed settings',
    resetSeekSettings: 'Reset seek settings',
    disabledStatus: 'Disabled',
    recordTitle: 'Record shortcut',
    recordDesc: 'Press the key combination to assign to this action.',
    pressKey: 'Press a key',
    cancel: 'Cancel',
    save: 'Save',
    conflict: 'This shortcut is already used by {action}.',
    noConflict: 'No conflict detected.',
    actions: {
      playPause: 'Play / Pause',
      seekBackward: 'Rewind',
      seekForward: 'Forward',
      volumeUp: 'Volume up',
      volumeDown: 'Volume down',
      mute: 'Mute',
      fullscreen: 'Fullscreen',
      skipIntro: 'Skip intro',
      speedUp: 'Increase speed',
      speedDown: 'Decrease speed',
      speedReset: 'Reset speed',
    },
    hints: {
      rewind: 'Rewind',
      forward: 'Forward',
      mute: 'Muted',
      unmute: 'Unmuted',
      play: 'Play',
      pause: 'Pause',
      fullscreen: 'Fullscreen',
      skipIntro: 'Skipped',
      speed: 'Speed',
    },
  },
  'zh-TW': {
    appTitle: 'Shortcut Override for Netflix',
    enabled: '啟用快捷鍵覆寫',
    enabledDesc: '在 Netflix 觀看頁啟用自訂播放快捷鍵。',
    showHints: '顯示媒體提示',
    showHintsDesc: '使用快捷鍵後顯示小型畫面提示。',
    quickSettings: '一般設定',
    savingSettings: '正在儲存設定...',
    settingsSaveError: '設定未儲存',
    openOptions: '開啟設定頁',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: '開啟 GitHub repo',
    otherProjects: '其他作品',
    otherProjectsAriaLabel: '其他作品',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '在 Chrome Web Store 開啟同作者的其他作品 Stream Danmaku',
    popupNetflixPage: '開啟 Netflix 影片後即可使用快捷鍵。',
    popupNetflixOnly: '快捷鍵只會在 Netflix 觀看頁生效。',
    locale: '語言',
    speed: '播放速度快捷鍵',
    speedDesc: '設定「加快 / 降低播放速度」快捷鍵的可用範圍與每次增減。',
    minSpeed: '最低倍速',
    minSpeedTooltip: '降低速度時的最低倍速。\n範圍 0.25x-1.0x。',
    maxSpeed: '最高倍速',
    maxSpeedTooltip: '加快速度時的最高倍速。\n範圍 1.0x-4.0x。',
    step: '每次增減',
    stepDesc: '按加快或降低播放速度時，每次變動的倍速。',
    stepTooltip: '每次按加快/降低時調整的倍速。\n範圍 0.05x-4.0x，以 0.05x 校正。',
    holdSpeed: '長按 Space 倍速',
    holdSpeedDesc: '按住 Space 時暫時切到這個倍速，放開後還原。',
    holdSpeedTooltip: '按住 Space 時暫時切換的倍速。\n範圍 0.25x-4.0x。',
    seek: '快轉 / 倒轉快捷鍵',
    seekDesc: '設定左右鍵每次要移動的播放時間。',
    seekSeconds: '左右鍵秒數',
    seekSecondsDesc: '每次按下左鍵或右鍵時移動的秒數。',
    seekSecondsTooltip: '每次按左/右鍵移動的秒數。\n範圍 1-60 秒。',
    shortcuts: '快捷鍵',
    shortcutsDesc: '錄製按鍵、停用單項功能，或還原預設值。',
    action: '功能',
    key: '按鍵',
    status: '啟用',
    columnActions: '操作',
    edit: '編輯',
    reset: '重設',
    resetAll: '重設全部快捷鍵',
    resetSpeedSettings: '重設播放速度設定',
    resetSeekSettings: '重設快轉倒轉設定',
    disabledStatus: '停用',
    recordTitle: '錄製快捷鍵',
    recordDesc: '按下要指定給這個功能的按鍵組合。',
    pressKey: '按下按鍵',
    cancel: '取消',
    save: '儲存',
    conflict: '這組快捷鍵已被「{action}」使用。',
    noConflict: '沒有偵測到衝突。',
    actions: {
      playPause: '播放 / 暫停',
      seekBackward: '倒轉',
      seekForward: '快轉',
      volumeUp: '提高音量',
      volumeDown: '降低音量',
      mute: '靜音',
      fullscreen: '全螢幕',
      skipIntro: '略過片頭',
      speedUp: '加快播放速度',
      speedDown: '降低播放速度',
      speedReset: '重設播放速度',
    },
    hints: {
      rewind: '倒轉',
      forward: '快轉',
      mute: '靜音',
      unmute: '取消靜音',
      play: '播放',
      pause: '暫停',
      fullscreen: '全螢幕',
      skipIntro: '已略過',
      speed: '速度',
    },
  },
  'zh-CN': {
    appTitle: 'Shortcut Override for Netflix',
    enabled: '启用快捷键覆写',
    enabledDesc: '在 Netflix 观看页启用自定义播放快捷键。',
    showHints: '显示媒体提示',
    showHintsDesc: '使用快捷键后显示小型画面提示。',
    quickSettings: '常规设置',
    savingSettings: '正在保存设置...',
    settingsSaveError: '设置未保存',
    openOptions: '打开设置页',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: '打开 GitHub repo',
    otherProjects: '其他作品',
    otherProjectsAriaLabel: '其他作品',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '在 Chrome Web Store 打开同作者的其他作品 Stream Danmaku',
    popupNetflixPage: '打开 Netflix 视频后即可使用快捷键。',
    popupNetflixOnly: '快捷键只会在 Netflix 观看页生效。',
    locale: '语言',
    speed: '播放速度快捷键',
    speedDesc: '设置“加快 / 降低播放速度”快捷键的可用范围与每次增减。',
    minSpeed: '最低倍速',
    minSpeedTooltip: '降低速度时的最低倍速。\n范围 0.25x-1.0x。',
    maxSpeed: '最高倍速',
    maxSpeedTooltip: '加快速度时的最高倍速。\n范围 1.0x-4.0x。',
    step: '每次增减',
    stepDesc: '按加快或降低播放速度时，每次变动的倍速。',
    stepTooltip: '每次按加快/降低时调整的倍速。\n范围 0.05x-4.0x，以 0.05x 校正。',
    holdSpeed: '长按 Space 倍速',
    holdSpeedDesc: '按住 Space 时暂时切到这个倍速，松开后还原。',
    holdSpeedTooltip: '按住 Space 时暂时切换的倍速。\n范围 0.25x-4.0x。',
    seek: '快进 / 倒退快捷键',
    seekDesc: '设置左右键每次要移动的播放时间。',
    seekSeconds: '左右键秒数',
    seekSecondsDesc: '每次按下左键或右键时移动的秒数。',
    seekSecondsTooltip: '每次按左/右键移动的秒数。\n范围 1-60 秒。',
    shortcuts: '快捷键',
    shortcutsDesc: '录制按键、停用单项功能，或还原默认值。',
    action: '功能',
    key: '按键',
    status: '启用',
    columnActions: '操作',
    edit: '编辑',
    reset: '重置',
    resetAll: '重置全部快捷键',
    resetSpeedSettings: '重置播放速度设置',
    resetSeekSettings: '重置快进倒退设置',
    disabledStatus: '停用',
    recordTitle: '录制快捷键',
    recordDesc: '按下要指定给这个功能的按键组合。',
    pressKey: '按下按键',
    cancel: '取消',
    save: '保存',
    conflict: '这组快捷键已被“{action}”使用。',
    noConflict: '没有检测到冲突。',
    actions: {
      playPause: '播放 / 暂停',
      seekBackward: '倒退',
      seekForward: '快进',
      volumeUp: '提高音量',
      volumeDown: '降低音量',
      mute: '静音',
      fullscreen: '全屏',
      skipIntro: '跳过片头',
      speedUp: '加快播放速度',
      speedDown: '降低播放速度',
      speedReset: '重设播放速度',
    },
    hints: {
      rewind: '倒退',
      forward: '快进',
      mute: '静音',
      unmute: '取消静音',
      play: '播放',
      pause: '暂停',
      fullscreen: '全屏',
      skipIntro: '已跳过',
      speed: '速度',
    },
  },
  ja: {
    appTitle: 'Shortcut Override for Netflix',
    enabled: 'ショートカット上書きを有効化',
    enabledDesc: 'Netflix の視聴ページでカスタム再生ショートカットを有効にします。',
    showHints: 'メディアヒントを表示',
    showHintsDesc: 'ショートカット実行後に小さなヒントを表示します。',
    quickSettings: '一般設定',
    savingSettings: '設定を保存中...',
    settingsSaveError: '設定は保存されませんでした',
    openOptions: '設定を開く',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: 'GitHub リポジトリを開く',
    otherProjects: '他の作品',
    otherProjectsAriaLabel: '他の作品',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '同じ作者の別作品 Stream Danmaku を Chrome ウェブストアで開く',
    popupNetflixPage: 'Netflix の作品を開くとショートカットを使えます。',
    popupNetflixOnly: 'ショートカットは Netflix の視聴ページでのみ動作します。',
    locale: '言語',
    speed: '速度ショートカット',
    speedDesc: '速度を上げる/下げるショートカットの範囲と増減幅を設定します。',
    minSpeed: '最低速度',
    minSpeedTooltip: '速度を下げる時の最低速度。\n範囲 0.25x-1.0x。',
    maxSpeed: '最高速度',
    maxSpeedTooltip: '速度を上げる時の最高速度。\n範囲 1.0x-4.0x。',
    step: '1回の増減',
    stepDesc: '速度を上げる/下げるたびに変わる倍率です。',
    stepTooltip: '1回ごとの速度変更量。\n範囲 0.05x-4.0x、0.05x 単位に丸めます。',
    holdSpeed: 'Space 長押し時の速度',
    holdSpeedDesc: 'Space を押している間だけこの速度に切り替え、離すと元に戻します。',
    holdSpeedTooltip: 'Space 長押し中の一時速度。\n範囲 0.25x-4.0x。',
    seek: 'シークショートカット',
    seekDesc: '戻る/進むショートカットで移動する時間を設定します。',
    seekSeconds: '左右キーの秒数',
    seekSecondsDesc: 'Left または Right を押すたびに移動する秒数です。',
    seekSecondsTooltip: '左右キー1回で移動する秒数。\n範囲 1-60 秒。',
    shortcuts: 'ショートカット',
    shortcutsDesc: 'キーの記録、個別無効化、既定値へのリセットができます。',
    action: '操作',
    key: 'キー',
    status: '有効',
    columnActions: 'アクション',
    edit: '編集',
    reset: 'リセット',
    resetAll: 'ショートカットをすべてリセット',
    resetSpeedSettings: '速度設定をリセット',
    resetSeekSettings: 'シーク設定をリセット',
    disabledStatus: '無効',
    recordTitle: 'ショートカットを記録',
    recordDesc: 'この操作に割り当てるキーの組み合わせを押してください。',
    pressKey: 'キーを押す',
    cancel: 'キャンセル',
    save: '保存',
    conflict: 'このショートカットは「{action}」で使用されています。',
    noConflict: '競合はありません。',
    actions: {
      playPause: '再生 / 一時停止',
      seekBackward: '戻る',
      seekForward: '進む',
      volumeUp: '音量を上げる',
      volumeDown: '音量を下げる',
      mute: 'ミュート',
      fullscreen: '全画面',
      skipIntro: 'イントロをスキップ',
      speedUp: '再生速度を上げる',
      speedDown: '再生速度を下げる',
      speedReset: '再生速度をリセット',
    },
    hints: {
      rewind: '戻る',
      forward: '進む',
      mute: 'ミュート',
      unmute: 'ミュート解除',
      play: '再生',
      pause: '一時停止',
      fullscreen: '全画面',
      skipIntro: 'スキップ済み',
      speed: '速度',
    },
  },
  ko: {
    appTitle: 'Shortcut Override for Netflix',
    enabled: '단축키 오버라이드 켜기',
    enabledDesc: 'Netflix 시청 페이지에서 사용자 재생 단축키를 켭니다.',
    showHints: '미디어 힌트 표시',
    showHintsDesc: '단축키 실행 후 작은 화면 힌트를 표시합니다.',
    quickSettings: '일반 설정',
    savingSettings: '설정 저장 중...',
    settingsSaveError: '설정이 저장되지 않았습니다',
    openOptions: '설정 열기',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: 'GitHub 저장소 열기',
    otherProjects: '다른 작품',
    otherProjectsAriaLabel: '다른 작품',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '같은 제작자의 다른 작품 Stream Danmaku를 Chrome 웹 스토어에서 열기',
    popupNetflixPage: 'Netflix 콘텐츠를 열면 단축키를 사용할 수 있습니다.',
    popupNetflixOnly: '단축키는 Netflix 시청 페이지에서만 동작합니다.',
    locale: '언어',
    speed: '속도 단축키',
    speedDesc: '속도 올리기/내리기 단축키의 범위와 한 번에 바뀌는 값을 설정합니다.',
    minSpeed: '최저 배속',
    minSpeedTooltip: '속도를 내릴 때의 최저 배속입니다.\n범위 0.25x-1.0x.',
    maxSpeed: '최고 배속',
    maxSpeedTooltip: '속도를 올릴 때의 최고 배속입니다.\n범위 1.0x-4.0x.',
    step: '한 번에 변경',
    stepDesc: '속도 올리기/내리기를 누를 때마다 바뀌는 배속입니다.',
    stepTooltip: '한 번 누를 때 바뀌는 배속입니다.\n범위 0.05x-4.0x, 0.05x 단위 보정.',
    holdSpeed: 'Space 길게 누를 때 배속',
    holdSpeedDesc: 'Space를 누르는 동안 이 배속으로 잠시 바꾸고, 놓으면 되돌립니다.',
    holdSpeedTooltip: 'Space를 누르는 동안의 임시 배속입니다.\n범위 0.25x-4.0x.',
    seek: '탐색 단축키',
    seekDesc: '되감기/빨리감기 단축키가 이동할 시간을 설정합니다.',
    seekSeconds: '왼쪽 / 오른쪽 초',
    seekSecondsDesc: '왼쪽 또는 오른쪽 키를 누를 때마다 이동할 초입니다.',
    seekSecondsTooltip: '왼쪽/오른쪽 키 한 번에 이동할 초입니다.\n범위 1-60초.',
    shortcuts: '단축키',
    shortcutsDesc: '키 기록, 개별 비활성화, 기본값 복원이 가능합니다.',
    action: '동작',
    key: '키',
    status: '활성화',
    columnActions: '작업',
    edit: '편집',
    reset: '초기화',
    resetAll: '모든 단축키 초기화',
    resetSpeedSettings: '속도 설정 초기화',
    resetSeekSettings: '탐색 설정 초기화',
    disabledStatus: '꺼짐',
    recordTitle: '단축키 기록',
    recordDesc: '이 동작에 지정할 키 조합을 누르세요.',
    pressKey: '키를 누르세요',
    cancel: '취소',
    save: '저장',
    conflict: '이 단축키는 이미 “{action}”에서 사용 중입니다.',
    noConflict: '충돌이 없습니다.',
    actions: {
      playPause: '재생 / 일시정지',
      seekBackward: '되감기',
      seekForward: '빨리감기',
      volumeUp: '볼륨 올리기',
      volumeDown: '볼륨 내리기',
      mute: '음소거',
      fullscreen: '전체 화면',
      skipIntro: '인트로 건너뛰기',
      speedUp: '재생 속도 올리기',
      speedDown: '재생 속도 내리기',
      speedReset: '재생 속도 초기화',
    },
    hints: {
      rewind: '되감기',
      forward: '빨리감기',
      mute: '음소거',
      unmute: '음소거 해제',
      play: '재생',
      pause: '일시정지',
      fullscreen: '전체 화면',
      skipIntro: '건너뜀',
      speed: '속도',
    },
  },
}

export const getCopy = (locale: Locale): Copy => COPY[locale]
