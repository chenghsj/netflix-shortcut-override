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
  quickSettings: string
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
  holdSpeedEnabled: string
  holdSpeedRate: string
  seek: string
  seekDesc: string
  seekSeconds: string
  seekSecondsDesc: string
  seekSecondsTooltip: string
  shortcuts: string
  shortcutsDesc: string
  pictureInPictureTooltip: string
  action: string
  key: string
  status: string
  columnActions: string
  edit: string
  reset: string
  resetAll: string
  resetSpeedSettings: string
  disabledStatus: string
  recordTitle: string
  recordDesc: string
  pressKey: string
  restore: string
  cancel: string
  save: string
  conflict: string
  noConflict: string
  actions: Record<ShortcutAction, string>
}

export const COPY: Record<Locale, Copy> = {
  en: {
    appTitle: 'Shortcut Override for Netflix',
    enabled: 'Enable shortcut override',
    enabledDesc: 'When off, extension shortcuts—including Space-hold speed—are disabled.',
    quickSettings: 'General settings',
    settingsSaveError: 'Settings were not saved',
    openOptions: 'Open options',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: 'Open GitHub repository',
    otherProjects: 'Other products',
    otherProjectsAriaLabel: 'Other products',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      'Open Stream Danmaku, another product by the same maker, in the extension store',
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
    holdSpeedEnabled: 'Enabled',
    holdSpeedRate: 'Hold speed',
    seek: 'Seek shortcuts',
    seekDesc: 'Set how far the rewind and forward shortcuts move playback.',
    seekSeconds: 'Seek interval (seconds)',
    seekSecondsDesc: 'Amount of time moved each time you use the rewind or forward shortcut.',
    seekSecondsTooltip: 'Seconds moved per rewind/forward shortcut use.\nRange 1-60s.',
    shortcuts: 'Shortcuts',
    shortcutsDesc:
      'Record keys, disable individual actions, or reset defaults. In Picture-in-Picture, Space is handled by the extension.',
    pictureInPictureTooltip:
      'Picture-in-Picture is a separate window, so Netflix native shortcuts cannot run there. Space remains available through this extension; other disabled shortcuts are unavailable in Picture-in-Picture.',
    action: 'Action',
    key: 'Key',
    status: 'Enabled',
    columnActions: 'Action',
    edit: 'Edit',
    reset: 'Reset',
    resetAll: 'Reset all shortcuts',
    resetSpeedSettings: 'Reset speed and seek settings',
    disabledStatus: 'Disabled',
    recordTitle: 'Record shortcut',
    recordDesc: 'Press the key combination to assign to this action.',
    pressKey: 'Press a key',
    restore: 'Restore',
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
      pictureInPicture: 'Picture-in-Picture',
      skipIntro: 'Skip intro',
      speedUp: 'Increase speed',
      speedDown: 'Decrease speed',
      speedReset: 'Reset speed',
    },
  },
  'zh-TW': {
    appTitle: 'Shortcut Override for Netflix',
    enabled: '啟用快捷鍵覆寫',
    enabledDesc: '關閉後，擴充功能快捷鍵（包含長按 Space 倍速）會停用。',
    quickSettings: '一般設定',
    settingsSaveError: '設定未儲存',
    openOptions: '開啟設定頁',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: '開啟 GitHub repo',
    otherProjects: '其他產品',
    otherProjectsAriaLabel: '其他產品',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '在擴充功能商店開啟同作者的其他產品 Stream Danmaku',
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
    holdSpeedEnabled: '啟用',
    holdSpeedRate: '長按倍速',
    seek: '快轉 / 倒轉快捷鍵',
    seekDesc: '設定快轉與倒轉快捷鍵每次要移動的播放時間。',
    seekSeconds: '快轉 / 倒轉秒數',
    seekSecondsDesc: '每次使用快轉或倒轉快捷鍵時移動的秒數。',
    seekSecondsTooltip: '每次使用快轉 / 倒轉快捷鍵移動的秒數。\n範圍 1-60 秒。',
    shortcuts: '快捷鍵',
    shortcutsDesc: '錄製按鍵、停用單項功能，或還原預設值。子母畫面中的 Space 會由擴充功能處理。',
    pictureInPictureTooltip:
      '子母畫面是獨立視窗，Netflix 原生快捷鍵無法在其中使用。Space 仍由本擴充功能處理；其他快捷鍵若已關閉，則無法在子母畫面中使用。',
    action: '功能',
    key: '按鍵',
    status: '啟用',
    columnActions: '操作',
    edit: '編輯',
    reset: '重設',
    resetAll: '重設全部快捷鍵',
    resetSpeedSettings: '重設播放速度與快轉倒轉設定',
    disabledStatus: '停用',
    recordTitle: '錄製快捷鍵',
    recordDesc: '按下要指定給這個功能的按鍵組合。',
    pressKey: '按下按鍵',
    restore: '還原',
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
      pictureInPicture: '子母畫面',
      skipIntro: '略過片頭',
      speedUp: '加快播放速度',
      speedDown: '降低播放速度',
      speedReset: '重設播放速度',
    },
  },
  'zh-CN': {
    appTitle: 'Shortcut Override for Netflix',
    enabled: '启用快捷键覆盖',
    enabledDesc: '关闭后，扩展程序快捷键（包括长按 Space 倍速）会停用。',
    quickSettings: '常规设置',
    settingsSaveError: '设置未保存',
    openOptions: '打开设置页',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: '打开 GitHub repo',
    otherProjects: '其他产品',
    otherProjectsAriaLabel: '其他产品',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '在扩展商店打开同作者的其他产品 Stream Danmaku',
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
    holdSpeedEnabled: '启用',
    holdSpeedRate: '长按倍速',
    seek: '快进 / 倒退快捷键',
    seekDesc: '设置快进与倒退快捷键每次要移动的播放时间。',
    seekSeconds: '快进 / 倒退秒数',
    seekSecondsDesc: '每次使用快进或倒退快捷键时移动的秒数。',
    seekSecondsTooltip: '每次使用快进 / 倒退快捷键移动的秒数。\n范围 1-60 秒。',
    shortcuts: '快捷键',
    shortcutsDesc: '录制按键、停用单项功能，或还原默认值。画中画中的 Space 会由扩展程序处理。',
    pictureInPictureTooltip:
      '画中画是独立窗口，Netflix 原生快捷键无法在其中使用。Space 仍由本扩展程序处理；其他快捷键若已关闭，则无法在画中画中使用。',
    action: '功能',
    key: '按键',
    status: '启用',
    columnActions: '操作',
    edit: '编辑',
    reset: '重置',
    resetAll: '重置全部快捷键',
    resetSpeedSettings: '重置播放速度与快进倒退设置',
    disabledStatus: '停用',
    recordTitle: '录制快捷键',
    recordDesc: '按下要指定给这个功能的按键组合。',
    pressKey: '按下按键',
    restore: '恢复',
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
      pictureInPicture: '画中画',
      skipIntro: '跳过片头',
      speedUp: '加快播放速度',
      speedDown: '降低播放速度',
      speedReset: '重设播放速度',
    },
  },
  ja: {
    appTitle: 'Shortcut Override for Netflix',
    enabled: 'ショートカットの上書きを有効化',
    enabledDesc: '無効にすると、Space 長押しの速度変更を含む拡張機能のショートカットが無効になります。',
    quickSettings: '一般設定',
    settingsSaveError: '設定は保存されませんでした',
    openOptions: '設定を開く',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: 'GitHub リポジトリを開く',
    otherProjects: '他の製品',
    otherProjectsAriaLabel: '他の製品',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '同じ作者の別製品 Stream Danmaku を拡張機能ストアで開く',
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
    holdSpeedTooltip: 'Space 長押し中の一時速度です。\n範囲 0.25x-4.0x。',
    holdSpeedEnabled: '有効',
    holdSpeedRate: '長押し時の速度',
    seek: 'シークショートカット',
    seekDesc: '戻る/進むショートカットで移動する時間を設定します。',
    seekSeconds: 'シーク秒数',
    seekSecondsDesc: '戻る/進むショートカットを使うたびに移動する秒数です。',
    seekSecondsTooltip: '戻る/進むショートカット1回で移動する秒数。\n範囲 1-60 秒。',
    shortcuts: 'ショートカット',
    shortcutsDesc:
      'キーの記録、個別無効化、既定値へのリセットができます。ピクチャー イン ピクチャー内の Space は拡張機能が処理します。',
    pictureInPictureTooltip:
      'ピクチャー イン ピクチャーは独立したウィンドウのため、Netflix 本来のショートカットは使えません。Space はこの拡張機能が処理しますが、無効にした他のショートカットは使えません。',
    action: '操作',
    key: 'キー',
    status: '有効',
    columnActions: 'アクション',
    edit: '編集',
    reset: 'リセット',
    resetAll: 'ショートカットをすべてリセット',
    resetSpeedSettings: '速度とシーク設定をリセット',
    disabledStatus: '無効',
    recordTitle: 'ショートカットを記録',
    recordDesc: 'この操作に割り当てるキーの組み合わせを押してください。',
    pressKey: 'キーを押す',
    restore: '復元',
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
      pictureInPicture: 'ピクチャー イン ピクチャー',
      skipIntro: 'イントロをスキップ',
      speedUp: '再生速度を上げる',
      speedDown: '再生速度を下げる',
      speedReset: '再生速度をリセット',
    },
  },
  ko: {
    appTitle: 'Shortcut Override for Netflix',
    enabled: '단축키 재정의 사용',
    enabledDesc: '끄면 Space 길게 누르기 배속을 포함한 확장 프로그램 단축키가 비활성화됩니다.',
    quickSettings: '일반 설정',
    settingsSaveError: '설정이 저장되지 않았습니다',
    openOptions: '설정 열기',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: 'GitHub 저장소 열기',
    otherProjects: '다른 제품',
    otherProjectsAriaLabel: '다른 제품',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '같은 제작자의 다른 제품 Stream Danmaku를 확장 프로그램 스토어에서 열기',
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
    holdSpeedEnabled: '사용',
    holdSpeedRate: '길게 누르기 배속',
    seek: '탐색 단축키',
    seekDesc: '되감기/빨리감기 단축키가 이동할 시간을 설정합니다.',
    seekSeconds: '탐색 시간(초)',
    seekSecondsDesc: '되감기/빨리감기 단축키를 사용할 때마다 이동할 초입니다.',
    seekSecondsTooltip: '되감기/빨리감기 단축키 한 번에 이동할 초입니다.\n범위 1-60초.',
    shortcuts: '단축키',
    shortcutsDesc: '키 기록, 개별 비활성화, 기본값 복원이 가능합니다. 화면 속 화면의 Space는 확장 프로그램이 처리합니다.',
    pictureInPictureTooltip:
      '화면 속 화면은 별도 창이므로 Netflix 기본 단축키를 사용할 수 없습니다. Space는 이 확장 프로그램이 처리하지만, 다른 단축키를 끄면 화면 속 화면에서도 사용할 수 없습니다.',
    action: '동작',
    key: '키',
    status: '활성화',
    columnActions: '작업',
    edit: '편집',
    reset: '초기화',
    resetAll: '모든 단축키 초기화',
    resetSpeedSettings: '속도 및 탐색 설정 초기화',
    disabledStatus: '꺼짐',
    recordTitle: '단축키 기록',
    recordDesc: '이 동작에 지정할 키 조합을 누르세요.',
    pressKey: '키를 누르세요',
    restore: '복원',
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
      pictureInPicture: '화면 속 화면',
      skipIntro: '인트로 건너뛰기',
      speedUp: '재생 속도 올리기',
      speedDown: '재생 속도 내리기',
      speedReset: '재생 속도 초기화',
    },
  },
}

export const getCopy = (locale: Locale): Copy => COPY[locale]
