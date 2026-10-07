import type { Locale, ShortcutAction } from '@/shared/shortcut-types'

export type PipControlsCopy = {
  timeline: string
  rewind: string
  forward: string
  play: string
  pause: string
  mute: string
  unmute: string
  volume: string
  subtitles: string
  subtitlesEnabled: string
  back: string
  subtitleFontSize: string
  subtitleSmall: string
  subtitleMedium: string
  subtitleLarge: string
  subtitleBackground: string
  subtitleBackgroundNone: string
  subtitleBackgroundTranslucent: string
  subtitleBackgroundDark: string
}

export const EN_PIP_CONTROLS_COPY: PipControlsCopy = {
  timeline: 'Seek timeline',
  rewind: 'Rewind {seconds} seconds',
  forward: 'Forward {seconds} seconds',
  play: 'Play',
  pause: 'Pause',
  mute: 'Mute',
  unmute: 'Unmute',
  volume: 'Volume',
  subtitles: 'Subtitles',
  subtitlesEnabled: 'Subtitles',
  back: 'Back',
  subtitleFontSize: 'Font size',
  subtitleSmall: 'Small',
  subtitleMedium: 'Medium',
  subtitleLarge: 'Large',
  subtitleBackground: 'Subtitle background',
  subtitleBackgroundNone: 'None',
  subtitleBackgroundTranslucent: 'Translucent',
  subtitleBackgroundDark: 'Dark',
}

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
  backupRestore: string
  backupRestoreDesc: string
  exportSettings: string
  importSettings: string
  importSuccess: string
  importDialogTitle: string
  importDialogDesc: string
  backupDate: string
  backupExtensionVersion: string
  backupSettingsVersion: string
  backupLanguageTheme: string
  backupEnabledShortcuts: string
  backupSubtitleNavigationSummary: string
  backupSpeedSummary: string
  backupSeekSummary: string
  backupHoldSpeedSummary: string
  backupEnabled: string
  backupDisabled: string
  confirmImport: string
  importInvalidJson: string
  importInvalidRoot: string
  importWrongFormat: string
  importUnsupportedFormatVersion: string
  importInvalidMetadata: string
  importMissingSettings: string
  importInvalidSettingsVersion: string
  importInvalidSettings: string
  importUnsupportedSettingsVersion: string
  importSaveError: string
  openOptions: string
  githubRepository: string
  githubRepositoryAriaLabel: string
  rateExtension: string
  rateExtensionAriaLabel: string
  otherProjects: string
  otherProjectsAriaLabel: string
  streamDanmakuStore: string
  streamDanmakuStoreAriaLabel: string
  popupNetflixPage: string
  popupNetflixOnly: string
  diagnosticsTitle: string
  diagnosticsReady: string
  diagnosticsWarning: string
  diagnosticsPending: string
  diagnosticsPageLoadingLong: string
  diagnosticsChecking: string
  diagnosticsRetrying: string
  diagnosticsInactive: string
  diagnosticsReloadRequired: string
  diagnosticsReloadPage: string
  diagnosticsContentScript: string
  diagnosticsSettings: string
  diagnosticsVideo: string
  diagnosticsBridge: string
  diagnosticsNetflixApi: string
  diagnosticsPictureInPicture: string
  diagnosticsReadyValue: string
  diagnosticsEnabledValue: string
  diagnosticsDisabledValue: string
  diagnosticsFoundValue: string
  diagnosticsMissingValue: string
  diagnosticsSupportedValue: string
  diagnosticsUnsupportedValue: string
  diagnosticsCopy: string
  diagnosticsCopied: string
  diagnosticsCopyFailed: string
  locale: string
  localeAuto: string
  theme: string
  themeAuto: string
  themeLight: string
  themeDark: string
  speed: string
  speedDesc: string
  minSpeed: string
  minSpeedTooltip: string
  maxSpeed: string
  maxSpeedTooltip: string
  step: string
  stepDesc: string
  stepTooltip: string
  preferredSpeed: string
  preferredSpeedTooltip: string
  holdSpeed: string
  holdSpeedDesc: string
  holdSpeedTooltip: string
  holdSpeedEnabled: string
  holdSpeedRate: string
  holdSpeedHint: string
  seek: string
  seekDesc: string
  seekSeconds: string
  seekSecondsDesc: string
  seekSecondsTooltip: string
  shortcuts: string
  shortcutsDesc: string
  pictureInPictureTooltip: string
  pictureInPictureUnsupported: string
  pipControls: PipControlsCopy
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
  restore: string
  cancel: string
  save: string
  conflict: string
  noConflict: string
  replacedNetflixKeys: string
  willReplaceNetflixKeys: string
  actions: Record<ShortcutAction, string>
}

export const COPY: Record<Locale, Copy> = {
  en: {
    appTitle: 'Shortcut Override for Netflix',
    enabled: 'Enable shortcut override',
    enabledDesc: 'When off, all extension shortcuts are disabled.',
    quickSettings: 'General settings',
    settingsSaveError: 'Settings were not saved',
    backupRestore: 'Backup and restore',
    backupRestoreDesc: 'Export all settings, including subtitle navigation, or restore them from a backup file.',
    exportSettings: 'Export settings',
    importSettings: 'Import settings',
    importSuccess: 'Settings imported successfully.',
    importDialogTitle: 'Import settings?',
    importDialogDesc: 'Review this backup before replacing all current settings.',
    backupDate: 'Backup date',
    backupExtensionVersion: 'Extension version',
    backupSettingsVersion: 'Settings version',
    backupLanguageTheme: 'Language and theme',
    backupEnabledShortcuts: 'Enabled general shortcuts',
    backupSubtitleNavigationSummary: '{status} · enabled keys: {count} / {total}',
    backupSpeedSummary: 'Preferred {preferred}x · range {min}x–{max}x · step {step}x',
    backupSeekSummary: '{seconds} seconds per seek',
    backupHoldSpeedSummary: '{status} · {speed}x · speed hint {hint}',
    backupEnabled: 'Enabled',
    backupDisabled: 'Disabled',
    confirmImport: 'Replace settings',
    importInvalidJson: 'This file is not valid JSON.',
    importInvalidRoot: 'This file does not contain a valid settings backup.',
    importWrongFormat: 'This file was not created by Shortcut Override for Netflix.',
    importUnsupportedFormatVersion: 'This backup format is not supported.',
    importInvalidMetadata: 'This backup has invalid source information.',
    importMissingSettings: 'This backup does not contain settings.',
    importInvalidSettingsVersion: 'This backup has an invalid settings version.',
    importInvalidSettings: 'This backup contains incomplete or invalid settings.',
    importUnsupportedSettingsVersion: 'This backup was created by a newer settings version.',
    importSaveError: 'Settings could not be imported: {message}',
    openOptions: 'Open options',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: 'Open GitHub repository',
    rateExtension: 'Rate this extension',
    rateExtensionAriaLabel: 'Rate this extension in the extension store',
    otherProjects: 'Other products',
    otherProjectsAriaLabel: 'Other products',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      'Open Stream Danmaku, another product by the same maker, in the extension store',
    popupNetflixPage: 'Open a Netflix title to use shortcuts.',
    popupNetflixOnly: 'Shortcuts only run in Netflix playback contexts.',
    diagnosticsTitle: 'Compatibility',
    diagnosticsReady: 'Netflix playback features are ready.',
    diagnosticsWarning: 'Some playback features may be unavailable.',
    diagnosticsPending: 'The Netflix player is not ready yet. Retrying automatically…',
    diagnosticsPageLoadingLong:
      'Netflix is still loading. Compatibility will be checked automatically when loading finishes.',
    diagnosticsChecking: 'Checking compatibility…',
    diagnosticsRetrying: 'Unable to retrieve diagnostics. Retrying automatically…',
    diagnosticsInactive: 'Extension not active',
    diagnosticsReloadRequired: 'Reload the Netflix tab to reconnect the extension.',
    diagnosticsReloadPage: 'Reload Netflix',
    diagnosticsContentScript: 'Extension',
    diagnosticsSettings: 'Shortcut handling',
    diagnosticsVideo: 'Video',
    diagnosticsBridge: 'Page bridge',
    diagnosticsNetflixApi: 'Netflix player API',
    diagnosticsPictureInPicture: 'Picture-in-Picture',
    diagnosticsReadyValue: 'Ready',
    diagnosticsEnabledValue: 'Enabled',
    diagnosticsDisabledValue: 'Disabled',
    diagnosticsFoundValue: 'Found',
    diagnosticsMissingValue: 'Missing',
    diagnosticsSupportedValue: 'Supported',
    diagnosticsUnsupportedValue: 'Unsupported',
    diagnosticsCopy: 'Copy diagnostics',
    diagnosticsCopied: 'Copied',
    diagnosticsCopyFailed: 'Copy failed',
    locale: 'Language',
    localeAuto: 'Auto',
    theme: 'Theme',
    themeAuto: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    speed: 'Playback speed',
    speedDesc: 'Set preferred speed plus the range and step for speed up/down shortcuts.',
    minSpeed: 'Lowest speed',
    minSpeedTooltip: 'Minimum speed for speed-down shortcuts.\nRange 0.25x-1.0x.',
    maxSpeed: 'Highest speed',
    maxSpeedTooltip: 'Maximum speed for speed-up shortcuts.\nRange 1.0x-4.0x.',
    step: 'Speed adjustment amount',
    stepDesc: 'Amount changed each time you press speed up or speed down.',
    stepTooltip: 'Speed change per press.\nRange 0.05x-4.0x, rounded to 0.05x.',
    preferredSpeed: 'Preferred speed',
    preferredSpeedTooltip: 'Speed applied by the preferred-speed shortcut.\nRange 0.25x-4.0x.',
    holdSpeed: 'Play / Pause hold speed',
    holdSpeedDesc: 'Temporarily switch speed while holding the Play / Pause shortcut.',
    holdSpeedTooltip:
      'Hold the configured Play / Pause shortcut to temporarily use this speed. Release it to restore the previous speed and playback state.\nRange 0.25x-4.0x.',
    holdSpeedEnabled: 'Enabled',
    holdSpeedRate: 'Hold speed',
    holdSpeedHint: 'Show speed hint',
    seek: 'Seek shortcuts',
    seekDesc: 'Set how far the rewind and forward shortcuts move playback.',
    seekSeconds: 'Seconds per seek',
    seekSecondsDesc: 'Amount of time moved each time you use the rewind or forward shortcut.',
    seekSecondsTooltip: 'Seconds moved per rewind/forward shortcut use.\nRange 1-60s.',
    shortcuts: 'Shortcuts',
    shortcutsDesc: 'Record keys, disable individual actions, or reset defaults.',
    pictureInPictureTooltip:
      'Picture-in-Picture is a separate window, so Netflix native shortcuts cannot run there. Only extension shortcuts enabled on this page can be used in Picture-in-Picture.',
    pictureInPictureUnsupported:
      'Firefox does not support the subtitle-preserving Picture-in-Picture window used by this extension.',
    pipControls: EN_PIP_CONTROLS_COPY,
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
    restore: 'Restore',
    cancel: 'Cancel',
    save: 'Save',
    conflict: 'This shortcut is already used by {action}.',
    noConflict: 'No conflict detected.',
    replacedNetflixKeys: 'Replaces Netflix: {keys}',
    willReplaceNetflixKeys: 'Saving will disable the Netflix keys: {keys}',
    actions: {
      playPause: 'Play / Pause (hold for speed)',
      seekBackward: 'Rewind',
      seekForward: 'Forward',
      volumeUp: 'Volume up',
      volumeDown: 'Volume down',
      mute: 'Mute',
      toggleSubtitles: 'Toggle subtitles',
      fullscreen: 'Fullscreen',
      pictureInPicture: 'Picture-in-Picture',
      skipIntro: 'Skip intro',
      speedUp: 'Increase speed',
      speedDown: 'Decrease speed',
      setPreferredSpeed: 'Set preferred speed',
      speedReset: 'Reset speed',
    },
  },
  'zh-TW': {
    appTitle: 'Shortcut Override for Netflix',
    enabled: '啟用快捷鍵覆寫',
    enabledDesc: '關閉後，所有擴充功能快捷鍵都會停用。',
    quickSettings: '一般設定',
    settingsSaveError: '設定未儲存',
    backupRestore: '備份與還原',
    backupRestoreDesc: '匯出全部設定（包含字幕導航），或從備份檔還原。',
    exportSettings: '匯出設定',
    importSettings: '匯入設定',
    importSuccess: '設定已成功匯入。',
    importDialogTitle: '要匯入設定嗎？',
    importDialogDesc: '請先確認備份內容，再取代目前的全部設定。',
    backupDate: '備份日期',
    backupExtensionVersion: '擴充功能版本',
    backupSettingsVersion: '設定版本',
    backupLanguageTheme: '語言與主題',
    backupEnabledShortcuts: '已啟用一般快捷鍵',
    backupSubtitleNavigationSummary: '{status} · 已啟用按鍵：{count} / {total}',
    backupSpeedSummary: '常用 {preferred}x · 範圍 {min}x–{max}x · 每次 {step}x',
    backupSeekSummary: '每次跳轉 {seconds} 秒',
    backupHoldSpeedSummary: '{status} · {speed}x · 倍速提示：{hint}',
    backupEnabled: '啟用',
    backupDisabled: '停用',
    confirmImport: '取代設定',
    importInvalidJson: '這不是有效的 JSON 檔案。',
    importInvalidRoot: '檔案中沒有有效的設定備份。',
    importWrongFormat: '這不是 Shortcut Override for Netflix 建立的備份。',
    importUnsupportedFormatVersion: '不支援這個備份格式版本。',
    importInvalidMetadata: '備份的來源資訊無效。',
    importMissingSettings: '備份中沒有設定資料。',
    importInvalidSettingsVersion: '備份中的設定版本無效。',
    importInvalidSettings: '備份中的設定不完整或無效。',
    importUnsupportedSettingsVersion: '此備份由較新的設定版本建立，無法匯入。',
    importSaveError: '無法匯入設定：{message}',
    openOptions: '開啟設定頁',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: '開啟 GitHub repo',
    rateExtension: '為這個擴充功能評分',
    rateExtensionAriaLabel: '在擴充功能商店為這個擴充功能評分',
    otherProjects: '其他產品',
    otherProjectsAriaLabel: '其他產品',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '在擴充功能商店開啟同作者的其他產品 Stream Danmaku',
    popupNetflixPage: '開啟 Netflix 影片後即可使用快捷鍵。',
    popupNetflixOnly: '快捷鍵只會在 Netflix 播放環境中生效。',
    diagnosticsTitle: '相容性診斷',
    diagnosticsReady: 'Netflix 播放功能已就緒。',
    diagnosticsWarning: '部分播放功能可能無法使用。',
    diagnosticsPending: 'Netflix 播放器尚未就緒，正在自動重試…',
    diagnosticsPageLoadingLong: 'Netflix 仍在載入，完成後會自動重新檢查相容性。',
    diagnosticsChecking: '正在檢查相容性…',
    diagnosticsRetrying: '暫時無法取得診斷資訊，正在自動重試…',
    diagnosticsInactive: '擴充功能未生效',
    diagnosticsReloadRequired: '請重新整理 Netflix 分頁，讓擴充功能重新連線。',
    diagnosticsReloadPage: '重新整理 Netflix',
    diagnosticsContentScript: '擴充功能',
    diagnosticsSettings: '快捷鍵處理',
    diagnosticsVideo: '播放器影片',
    diagnosticsBridge: '頁面橋接',
    diagnosticsNetflixApi: 'Netflix 播放器 API',
    diagnosticsPictureInPicture: '子母畫面',
    diagnosticsReadyValue: '已就緒',
    diagnosticsEnabledValue: '已啟用',
    diagnosticsDisabledValue: '已停用',
    diagnosticsFoundValue: '已找到',
    diagnosticsMissingValue: '未找到',
    diagnosticsSupportedValue: '支援',
    diagnosticsUnsupportedValue: '不支援',
    diagnosticsCopy: '複製診斷資訊',
    diagnosticsCopied: '已複製',
    diagnosticsCopyFailed: '複製失敗',
    locale: '語言',
    localeAuto: '自動',
    theme: '主題',
    themeAuto: '自動',
    themeLight: '淺色',
    themeDark: '深色',
    speed: '播放速度',
    speedDesc: '設定常用倍速，以及加快 / 降低播放速度的範圍與每次增減。',
    minSpeed: '最低倍速',
    minSpeedTooltip: '降低速度時的最低倍速。\n範圍 0.25x-1.0x。',
    maxSpeed: '最高倍速',
    maxSpeedTooltip: '加快速度時的最高倍速。\n範圍 1.0x-4.0x。',
    step: '倍速調整幅度',
    stepDesc: '按加快或降低播放速度時，每次變動的倍速。',
    stepTooltip: '每次按加快/降低時調整的倍速。\n範圍 0.05x-4.0x，以 0.05x 校正。',
    preferredSpeed: '常用倍速',
    preferredSpeedTooltip: '使用常用倍速快捷鍵時套用的速度。\n範圍 0.25x-4.0x。',
    holdSpeed: '長按播放 / 暫停鍵倍速',
    holdSpeedDesc: '按住播放 / 暫停快捷鍵時暫時切換倍速。',
    holdSpeedTooltip:
      '長按目前設定的「播放 / 暫停」快捷鍵時暫時套用此倍速；放開後恢復原本倍速與播放狀態。\n範圍 0.25x-4.0x。',
    holdSpeedEnabled: '啟用',
    holdSpeedRate: '長按倍速',
    holdSpeedHint: '顯示倍速提示',
    seek: '快轉 / 倒轉快捷鍵',
    seekDesc: '設定快轉與倒轉快捷鍵每次要移動的播放時間。',
    seekSeconds: '每次跳轉秒數',
    seekSecondsDesc: '每次使用快轉或倒轉快捷鍵時移動的秒數。',
    seekSecondsTooltip: '每次使用快轉 / 倒轉快捷鍵移動的秒數。\n範圍 1-60 秒。',
    shortcuts: '快捷鍵',
    shortcutsDesc: '錄製按鍵、停用單項功能，或還原預設值。',
    pictureInPictureTooltip:
      '子母畫面是獨立視窗，無法使用 Netflix 原生快捷鍵。只有在此頁面啟用的擴充功能快捷鍵，才能在子母畫面中使用。',
    pictureInPictureUnsupported: 'Firefox 不支援本擴充功能使用的字幕保留子母畫面視窗。',
    pipControls: {
      timeline: '播放時間軸',
      rewind: '倒轉 {seconds} 秒',
      forward: '快轉 {seconds} 秒',
      play: '播放',
      pause: '暫停',
      mute: '靜音',
      unmute: '解除靜音',
      volume: '音量',
      subtitles: '字幕',
      subtitlesEnabled: '字幕',
      back: '返回',
      subtitleFontSize: '字型大小',
      subtitleSmall: '小',
      subtitleMedium: '中',
      subtitleLarge: '大',
      subtitleBackground: '字幕背景',
      subtitleBackgroundNone: '無',
      subtitleBackgroundTranslucent: '半透明',
      subtitleBackgroundDark: '深色',
    },
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
    restore: '還原',
    cancel: '取消',
    save: '儲存',
    conflict: '這組快捷鍵已被「{action}」使用。',
    noConflict: '沒有偵測到衝突。',
    replacedNetflixKeys: '已取代 Netflix：{keys}',
    willReplaceNetflixKeys: '儲存後將停用 Netflix 原生按鍵：{keys}',
    actions: {
      playPause: '播放 / 暫停（長按倍速）',
      seekBackward: '倒轉',
      seekForward: '快轉',
      volumeUp: '提高音量',
      volumeDown: '降低音量',
      mute: '靜音',
      toggleSubtitles: '切換字幕',
      fullscreen: '全螢幕',
      pictureInPicture: '子母畫面',
      skipIntro: '略過片頭',
      speedUp: '加快播放速度',
      speedDown: '降低播放速度',
      setPreferredSpeed: '套用常用倍速',
      speedReset: '重設播放速度',
    },
  },
  'zh-CN': {
    appTitle: 'Shortcut Override for Netflix',
    enabled: '启用快捷键覆盖',
    enabledDesc: '关闭后，所有扩展程序快捷键都会停用。',
    quickSettings: '常规设置',
    settingsSaveError: '设置未保存',
    backupRestore: '备份与恢复',
    backupRestoreDesc: '导出全部设置（包含字幕导航），或从备份文件恢复。',
    exportSettings: '导出设置',
    importSettings: '导入设置',
    importSuccess: '设置已成功导入。',
    importDialogTitle: '要导入设置吗？',
    importDialogDesc: '请先检查备份内容，再替换当前的全部设置。',
    backupDate: '备份日期',
    backupExtensionVersion: '扩展程序版本',
    backupSettingsVersion: '设置版本',
    backupLanguageTheme: '语言与主题',
    backupEnabledShortcuts: '已启用普通快捷键',
    backupSubtitleNavigationSummary: '{status} · 已启用按键：{count} / {total}',
    backupSpeedSummary: '常用 {preferred}x · 范围 {min}x–{max}x · 每次 {step}x',
    backupSeekSummary: '每次跳转 {seconds} 秒',
    backupHoldSpeedSummary: '{status} · {speed}x · 倍速提示：{hint}',
    backupEnabled: '启用',
    backupDisabled: '停用',
    confirmImport: '替换设置',
    importInvalidJson: '这不是有效的 JSON 文件。',
    importInvalidRoot: '文件中没有有效的设置备份。',
    importWrongFormat: '这不是 Shortcut Override for Netflix 创建的备份。',
    importUnsupportedFormatVersion: '不支持此备份格式版本。',
    importInvalidMetadata: '备份的来源信息无效。',
    importMissingSettings: '备份中没有设置数据。',
    importInvalidSettingsVersion: '备份中的设置版本无效。',
    importInvalidSettings: '备份中的设置不完整或无效。',
    importUnsupportedSettingsVersion: '此备份由较新的设置版本创建，无法导入。',
    importSaveError: '无法导入设置：{message}',
    openOptions: '打开设置页',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: '打开 GitHub repo',
    rateExtension: '为这个扩展程序评分',
    rateExtensionAriaLabel: '在扩展程序商店为这个扩展程序评分',
    otherProjects: '其他产品',
    otherProjectsAriaLabel: '其他产品',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '在扩展商店打开同作者的其他产品 Stream Danmaku',
    popupNetflixPage: '打开 Netflix 视频后即可使用快捷键。',
    popupNetflixOnly: '快捷键只会在 Netflix 播放环境中生效。',
    diagnosticsTitle: '兼容性诊断',
    diagnosticsReady: 'Netflix 播放功能已就绪。',
    diagnosticsWarning: '部分播放功能可能无法使用。',
    diagnosticsPending: 'Netflix 播放器尚未就绪，正在自动重试…',
    diagnosticsPageLoadingLong: 'Netflix 仍在加载，完成后会自动重新检查兼容性。',
    diagnosticsChecking: '正在检查兼容性…',
    diagnosticsRetrying: '暂时无法获取诊断信息，正在自动重试…',
    diagnosticsInactive: '扩展程序未生效',
    diagnosticsReloadRequired: '请重新加载 Netflix 标签页，让扩展程序重新连接。',
    diagnosticsReloadPage: '重新加载 Netflix',
    diagnosticsContentScript: '扩展程序',
    diagnosticsSettings: '快捷键处理',
    diagnosticsVideo: '播放器视频',
    diagnosticsBridge: '页面桥接',
    diagnosticsNetflixApi: 'Netflix 播放器 API',
    diagnosticsPictureInPicture: '画中画',
    diagnosticsReadyValue: '已就绪',
    diagnosticsEnabledValue: '已启用',
    diagnosticsDisabledValue: '已停用',
    diagnosticsFoundValue: '已找到',
    diagnosticsMissingValue: '未找到',
    diagnosticsSupportedValue: '支持',
    diagnosticsUnsupportedValue: '不支持',
    diagnosticsCopy: '复制诊断信息',
    diagnosticsCopied: '已复制',
    diagnosticsCopyFailed: '复制失败',
    locale: '语言',
    localeAuto: '自动',
    theme: '主题',
    themeAuto: '自动',
    themeLight: '浅色',
    themeDark: '深色',
    speed: '播放速度',
    speedDesc: '设置常用倍速，以及加快 / 降低播放速度的范围与每次增减。',
    minSpeed: '最低倍速',
    minSpeedTooltip: '降低速度时的最低倍速。\n范围 0.25x-1.0x。',
    maxSpeed: '最高倍速',
    maxSpeedTooltip: '加快速度时的最高倍速。\n范围 1.0x-4.0x。',
    step: '倍速调整幅度',
    stepDesc: '按加快或降低播放速度时，每次变动的倍速。',
    stepTooltip: '每次按加快/降低时调整的倍速。\n范围 0.05x-4.0x，以 0.05x 校正。',
    preferredSpeed: '常用倍速',
    preferredSpeedTooltip: '使用常用倍速快捷键时应用的速度。\n范围 0.25x-4.0x。',
    holdSpeed: '长按播放 / 暂停键倍速',
    holdSpeedDesc: '按住播放 / 暂停快捷键时暂时切换倍速。',
    holdSpeedTooltip:
      '长按当前设置的“播放 / 暂停”快捷键时暂时应用此倍速；松开后恢复原本倍速与播放状态。\n范围 0.25x-4.0x。',
    holdSpeedEnabled: '启用',
    holdSpeedRate: '长按倍速',
    holdSpeedHint: '显示倍速提示',
    seek: '快进 / 倒退快捷键',
    seekDesc: '设置快进与倒退快捷键每次要移动的播放时间。',
    seekSeconds: '每次跳转秒数',
    seekSecondsDesc: '每次使用快进或倒退快捷键时移动的秒数。',
    seekSecondsTooltip: '每次使用快进 / 倒退快捷键移动的秒数。\n范围 1-60 秒。',
    shortcuts: '快捷键',
    shortcutsDesc: '录制按键、停用单项功能，或还原默认值。',
    pictureInPictureTooltip:
      '画中画是独立窗口，无法使用 Netflix 原生快捷键。只有在此页面启用的扩展程序快捷键，才能在画中画中使用。',
    pictureInPictureUnsupported: 'Firefox 不支持本扩展程序使用的保留字幕画中画窗口。',
    pipControls: {
      timeline: '播放时间轴',
      rewind: '倒退 {seconds} 秒',
      forward: '快进 {seconds} 秒',
      play: '播放',
      pause: '暂停',
      mute: '静音',
      unmute: '取消静音',
      volume: '音量',
      subtitles: '字幕',
      subtitlesEnabled: '字幕',
      back: '返回',
      subtitleFontSize: '字体大小',
      subtitleSmall: '小',
      subtitleMedium: '中',
      subtitleLarge: '大',
      subtitleBackground: '字幕背景',
      subtitleBackgroundNone: '无',
      subtitleBackgroundTranslucent: '半透明',
      subtitleBackgroundDark: '深色',
    },
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
    restore: '恢复',
    cancel: '取消',
    save: '保存',
    conflict: '这组快捷键已被“{action}”使用。',
    noConflict: '没有检测到冲突。',
    replacedNetflixKeys: '已取代 Netflix：{keys}',
    willReplaceNetflixKeys: '保存后将停用 Netflix 原生按键：{keys}',
    actions: {
      playPause: '播放 / 暂停（长按倍速）',
      seekBackward: '倒退',
      seekForward: '快进',
      volumeUp: '提高音量',
      volumeDown: '降低音量',
      mute: '静音',
      toggleSubtitles: '切换字幕',
      fullscreen: '全屏',
      pictureInPicture: '画中画',
      skipIntro: '跳过片头',
      speedUp: '加快播放速度',
      speedDown: '降低播放速度',
      setPreferredSpeed: '应用常用倍速',
      speedReset: '重设播放速度',
    },
  },
  ja: {
    appTitle: 'Shortcut Override for Netflix',
    enabled: 'ショートカットの上書きを有効化',
    enabledDesc: '無効にすると、拡張機能のすべてのショートカットが無効になります。',
    quickSettings: '一般設定',
    settingsSaveError: '設定は保存されませんでした',
    backupRestore: 'バックアップと復元',
    backupRestoreDesc: '字幕ナビゲーションを含むすべての設定を書き出すか、バックアップファイルから復元します。',
    exportSettings: '設定を書き出す',
    importSettings: '設定を読み込む',
    importSuccess: '設定を読み込みました。',
    importDialogTitle: '設定を読み込みますか？',
    importDialogDesc: '現在のすべての設定を置き換える前に、バックアップ内容を確認してください。',
    backupDate: 'バックアップ日時',
    backupExtensionVersion: '拡張機能のバージョン',
    backupSettingsVersion: '設定バージョン',
    backupLanguageTheme: '言語とテーマ',
    backupEnabledShortcuts: '有効な一般ショートカット',
    backupSubtitleNavigationSummary: '{status} · 有効なキー：{count} / {total}',
    backupSpeedSummary: 'よく使う速度 {preferred}x · 範囲 {min}x–{max}x · 変更幅 {step}x',
    backupSeekSummary: '1回 {seconds} 秒',
    backupHoldSpeedSummary: '{status} · {speed}x · 速度ヒント {hint}',
    backupEnabled: '有効',
    backupDisabled: '無効',
    confirmImport: '設定を置き換える',
    importInvalidJson: '有効な JSON ファイルではありません。',
    importInvalidRoot: '有効な設定バックアップが含まれていません。',
    importWrongFormat: 'Shortcut Override for Netflix が作成したバックアップではありません。',
    importUnsupportedFormatVersion: 'このバックアップ形式のバージョンには対応していません。',
    importInvalidMetadata: 'バックアップの作成元情報が無効です。',
    importMissingSettings: 'バックアップに設定が含まれていません。',
    importInvalidSettingsVersion: 'バックアップの設定バージョンが無効です。',
    importInvalidSettings: 'バックアップの設定が不完全か無効です。',
    importUnsupportedSettingsVersion: '新しい設定バージョンで作成されたため、読み込めません。',
    importSaveError: '設定を読み込めませんでした：{message}',
    openOptions: '設定を開く',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: 'GitHub リポジトリを開く',
    rateExtension: 'この拡張機能を評価',
    rateExtensionAriaLabel: '拡張機能ストアでこの拡張機能を評価',
    otherProjects: '他の製品',
    otherProjectsAriaLabel: '他の製品',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '同じ作者の別製品 Stream Danmaku を拡張機能ストアで開く',
    popupNetflixPage: 'Netflix の作品を開くとショートカットを使えます。',
    popupNetflixOnly: 'ショートカットは Netflix の再生コンテキストでのみ動作します。',
    diagnosticsTitle: '互換性診断',
    diagnosticsReady: 'Netflix の再生機能を使用できます。',
    diagnosticsWarning: '一部の再生機能を使用できない可能性があります。',
    diagnosticsPending: 'Netflix プレーヤーの準備ができていません。自動的に再試行しています…',
    diagnosticsPageLoadingLong:
      'Netflix はまだ読み込み中です。完了後に互換性を自動で再確認します。',
    diagnosticsChecking: '互換性を確認しています…',
    diagnosticsRetrying: '診断情報を取得できません。自動的に再試行しています…',
    diagnosticsInactive: '拡張機能が動作していません',
    diagnosticsReloadRequired:
      'Netflix のタブを再読み込みして、拡張機能を再接続してください。',
    diagnosticsReloadPage: 'Netflix を再読み込み',
    diagnosticsContentScript: '拡張機能',
    diagnosticsSettings: 'ショートカット処理',
    diagnosticsVideo: '動画',
    diagnosticsBridge: 'ページブリッジ',
    diagnosticsNetflixApi: 'Netflix プレーヤー API',
    diagnosticsPictureInPicture: 'ピクチャー イン ピクチャー',
    diagnosticsReadyValue: '準備完了',
    diagnosticsEnabledValue: '有効',
    diagnosticsDisabledValue: '無効',
    diagnosticsFoundValue: '検出済み',
    diagnosticsMissingValue: '未検出',
    diagnosticsSupportedValue: '対応',
    diagnosticsUnsupportedValue: '非対応',
    diagnosticsCopy: '診断情報をコピー',
    diagnosticsCopied: 'コピーしました',
    diagnosticsCopyFailed: 'コピー失敗',
    locale: '言語',
    localeAuto: '自動',
    theme: 'テーマ',
    themeAuto: '自動',
    themeLight: 'ライト',
    themeDark: 'ダーク',
    speed: '再生速度',
    speedDesc: 'よく使う速度と、速度を上げる/下げる範囲および増減幅を設定します。',
    minSpeed: '最低速度',
    minSpeedTooltip: '速度を下げる時の最低速度。\n範囲 0.25x-1.0x。',
    maxSpeed: '最高速度',
    maxSpeedTooltip: '速度を上げる時の最高速度。\n範囲 1.0x-4.0x。',
    step: '速度調整幅',
    stepDesc: '速度を上げる/下げるたびに変わる倍率です。',
    stepTooltip: '1回ごとの速度変更量。\n範囲 0.05x-4.0x、0.05x 単位に丸めます。',
    preferredSpeed: 'よく使う速度',
    preferredSpeedTooltip: 'よく使う速度のショートカットで適用します。\n範囲 0.25x-4.0x。',
    holdSpeed: '再生 / 一時停止キー長押し速度',
    holdSpeedDesc: '再生 / 一時停止ショートカットを押している間だけ速度を切り替えます。',
    holdSpeedTooltip:
      '現在設定されている「再生 / 一時停止」ショートカットを長押しすると、一時的にこの速度になります。キーを離すと、元の速度と再生状態に戻ります。\n範囲 0.25x-4.0x。',
    holdSpeedEnabled: '有効',
    holdSpeedRate: '長押し時の速度',
    holdSpeedHint: '速度ヒントを表示',
    seek: 'シークショートカット',
    seekDesc: '戻る/進むショートカットで移動する時間を設定します。',
    seekSeconds: '1回の移動秒数',
    seekSecondsDesc: '戻る/進むショートカットを使うたびに移動する秒数です。',
    seekSecondsTooltip: '戻る/進むショートカット1回で移動する秒数。\n範囲 1-60 秒。',
    shortcuts: 'ショートカット',
    shortcutsDesc: 'キーの記録、個別無効化、既定値へのリセットができます。',
    pictureInPictureTooltip:
      'ピクチャー イン ピクチャーは独立したウィンドウのため、Netflix 本来のショートカットは使えません。このページで有効にした拡張機能のショートカットのみ、ピクチャー イン ピクチャーで使用できます。',
    pictureInPictureUnsupported:
      'Firefox はこの拡張機能が使用する字幕を保持したピクチャー イン ピクチャー ウィンドウに対応していません。',
    pipControls: {
      timeline: '再生タイムライン',
      rewind: '{seconds} 秒戻る',
      forward: '{seconds} 秒進む',
      play: '再生',
      pause: '一時停止',
      mute: 'ミュート',
      unmute: 'ミュート解除',
      volume: '音量',
      subtitles: '字幕',
      subtitlesEnabled: '字幕',
      back: '戻る',
      subtitleFontSize: '文字サイズ',
      subtitleSmall: '小',
      subtitleMedium: '中',
      subtitleLarge: '大',
      subtitleBackground: '字幕の背景',
      subtitleBackgroundNone: 'なし',
      subtitleBackgroundTranslucent: '半透明',
      subtitleBackgroundDark: '濃い',
    },
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
    restore: '復元',
    cancel: 'キャンセル',
    save: '保存',
    conflict: 'このショートカットは「{action}」で使用されています。',
    noConflict: '競合はありません。',
    replacedNetflixKeys: 'Netflix のキーを置換：{keys}',
    willReplaceNetflixKeys: '保存すると Netflix のキーが無効になります：{keys}',
    actions: {
      playPause: '再生 / 一時停止（長押しで速度変更）',
      seekBackward: '戻る',
      seekForward: '進む',
      volumeUp: '音量を上げる',
      volumeDown: '音量を下げる',
      mute: 'ミュート',
      toggleSubtitles: '字幕を切り替える',
      fullscreen: '全画面',
      pictureInPicture: 'ピクチャー イン ピクチャー',
      skipIntro: 'イントロをスキップ',
      speedUp: '再生速度を上げる',
      speedDown: '再生速度を下げる',
      setPreferredSpeed: 'よく使う速度に設定',
      speedReset: '再生速度をリセット',
    },
  },
  ko: {
    appTitle: 'Shortcut Override for Netflix',
    enabled: '단축키 재정의 사용',
    enabledDesc: '끄면 확장 프로그램의 모든 단축키가 비활성화됩니다.',
    quickSettings: '일반 설정',
    settingsSaveError: '설정이 저장되지 않았습니다',
    backupRestore: '백업 및 복원',
    backupRestoreDesc: '자막 탐색을 포함한 모든 설정을 내보내거나 백업 파일에서 복원합니다.',
    exportSettings: '설정 내보내기',
    importSettings: '설정 가져오기',
    importSuccess: '설정을 성공적으로 가져왔습니다.',
    importDialogTitle: '설정을 가져올까요?',
    importDialogDesc: '현재 설정을 모두 바꾸기 전에 백업 내용을 확인하세요.',
    backupDate: '백업 날짜',
    backupExtensionVersion: '확장 프로그램 버전',
    backupSettingsVersion: '설정 버전',
    backupLanguageTheme: '언어 및 테마',
    backupEnabledShortcuts: '활성화된 일반 단축키',
    backupSubtitleNavigationSummary: '{status} · 활성화된 키: {count} / {total}',
    backupSpeedSummary: '자주 쓰는 배속 {preferred}x · 범위 {min}x–{max}x · 변경값 {step}x',
    backupSeekSummary: '한 번에 {seconds}초',
    backupHoldSpeedSummary: '{status} · {speed}x · 배속 힌트 {hint}',
    backupEnabled: '사용',
    backupDisabled: '꺼짐',
    confirmImport: '설정 바꾸기',
    importInvalidJson: '유효한 JSON 파일이 아닙니다.',
    importInvalidRoot: '유효한 설정 백업이 없습니다.',
    importWrongFormat: 'Shortcut Override for Netflix에서 만든 백업이 아닙니다.',
    importUnsupportedFormatVersion: '지원하지 않는 백업 형식 버전입니다.',
    importInvalidMetadata: '백업의 출처 정보가 올바르지 않습니다.',
    importMissingSettings: '백업에 설정 데이터가 없습니다.',
    importInvalidSettingsVersion: '백업의 설정 버전이 올바르지 않습니다.',
    importInvalidSettings: '백업 설정이 불완전하거나 올바르지 않습니다.',
    importUnsupportedSettingsVersion: '더 새로운 설정 버전에서 만든 백업이라 가져올 수 없습니다.',
    importSaveError: '설정을 가져올 수 없습니다: {message}',
    openOptions: '설정 열기',
    githubRepository: 'GitHub',
    githubRepositoryAriaLabel: 'GitHub 저장소 열기',
    rateExtension: '이 확장 프로그램 평가하기',
    rateExtensionAriaLabel: '확장 프로그램 스토어에서 이 확장 프로그램 평가하기',
    otherProjects: '다른 제품',
    otherProjectsAriaLabel: '다른 제품',
    streamDanmakuStore: 'Stream Danmaku',
    streamDanmakuStoreAriaLabel:
      '같은 제작자의 다른 제품 Stream Danmaku를 확장 프로그램 스토어에서 열기',
    popupNetflixPage: 'Netflix 콘텐츠를 열면 단축키를 사용할 수 있습니다.',
    popupNetflixOnly: '단축키는 Netflix 재생 컨텍스트에서만 동작합니다.',
    diagnosticsTitle: '호환성 진단',
    diagnosticsReady: 'Netflix 재생 기능을 사용할 수 있습니다.',
    diagnosticsWarning: '일부 재생 기능을 사용하지 못할 수 있습니다.',
    diagnosticsPending: 'Netflix 플레이어가 아직 준비되지 않았습니다. 자동으로 다시 시도하는 중…',
    diagnosticsPageLoadingLong:
      'Netflix가 아직 로드 중입니다. 완료되면 호환성을 자동으로 다시 확인합니다.',
    diagnosticsChecking: '호환성을 확인하는 중…',
    diagnosticsRetrying: '진단 정보를 가져올 수 없습니다. 자동으로 다시 시도하는 중…',
    diagnosticsInactive: '확장 프로그램이 작동하지 않음',
    diagnosticsReloadRequired: '확장 프로그램을 다시 연결하려면 Netflix 탭을 새로고침하세요.',
    diagnosticsReloadPage: 'Netflix 새로고침',
    diagnosticsContentScript: '확장 프로그램',
    diagnosticsSettings: '단축키 처리',
    diagnosticsVideo: '동영상',
    diagnosticsBridge: '페이지 브리지',
    diagnosticsNetflixApi: 'Netflix 플레이어 API',
    diagnosticsPictureInPicture: '화면 속 화면',
    diagnosticsReadyValue: '준비됨',
    diagnosticsEnabledValue: '사용',
    diagnosticsDisabledValue: '꺼짐',
    diagnosticsFoundValue: '찾음',
    diagnosticsMissingValue: '찾지 못함',
    diagnosticsSupportedValue: '지원',
    diagnosticsUnsupportedValue: '미지원',
    diagnosticsCopy: '진단 정보 복사',
    diagnosticsCopied: '복사됨',
    diagnosticsCopyFailed: '복사 실패',
    locale: '언어',
    localeAuto: '자동',
    theme: '테마',
    themeAuto: '자동',
    themeLight: '라이트',
    themeDark: '다크',
    speed: '재생 속도',
    speedDesc: '자주 쓰는 배속과 속도 올리기/내리기의 범위 및 변경값을 설정합니다.',
    minSpeed: '최저 배속',
    minSpeedTooltip: '속도를 내릴 때의 최저 배속입니다.\n범위 0.25x-1.0x.',
    maxSpeed: '최고 배속',
    maxSpeedTooltip: '속도를 올릴 때의 최고 배속입니다.\n범위 1.0x-4.0x.',
    step: '배속 조정 단위',
    stepDesc: '속도 올리기/내리기를 누를 때마다 바뀌는 배속입니다.',
    stepTooltip: '한 번 누를 때 바뀌는 배속입니다.\n범위 0.05x-4.0x, 0.05x 단위 보정.',
    preferredSpeed: '자주 쓰는 배속',
    preferredSpeedTooltip: '자주 쓰는 배속 단축키로 적용할 속도입니다.\n범위 0.25x-4.0x.',
    holdSpeed: '재생 / 일시정지 키 길게 누르기 배속',
    holdSpeedDesc: '재생 / 일시정지 단축키를 누르는 동안 배속을 잠시 전환합니다.',
    holdSpeedTooltip:
      '현재 설정된 재생 / 일시정지 단축키를 길게 누르면 일시적으로 이 배속을 적용합니다. 키를 놓으면 원래 배속과 재생 상태로 돌아갑니다.\n범위 0.25x-4.0x.',
    holdSpeedEnabled: '사용',
    holdSpeedRate: '길게 누르기 배속',
    holdSpeedHint: '배속 힌트 표시',
    seek: '탐색 단축키',
    seekDesc: '되감기/빨리감기 단축키가 이동할 시간을 설정합니다.',
    seekSeconds: '1회 이동 시간(초)',
    seekSecondsDesc: '되감기/빨리감기 단축키를 사용할 때마다 이동할 초입니다.',
    seekSecondsTooltip: '되감기/빨리감기 단축키 한 번에 이동할 초입니다.\n범위 1-60초.',
    shortcuts: '단축키',
    shortcutsDesc: '키 기록, 개별 비활성화, 기본값 복원이 가능합니다.',
    pictureInPictureTooltip:
      '화면 속 화면은 별도 창이므로 Netflix 기본 단축키를 사용할 수 없습니다. 이 페이지에서 활성화한 확장 프로그램 단축키만 화면 속 화면에서 사용할 수 있습니다.',
    pictureInPictureUnsupported:
      'Firefox는 이 확장 프로그램이 사용하는 자막 보존 화면 속 화면 창을 지원하지 않습니다.',
    pipControls: {
      timeline: '재생 타임라인',
      rewind: '{seconds}초 되감기',
      forward: '{seconds}초 빨리감기',
      play: '재생',
      pause: '일시정지',
      mute: '음소거',
      unmute: '음소거 해제',
      volume: '볼륨',
      subtitles: '자막',
      subtitlesEnabled: '자막',
      back: '뒤로',
      subtitleFontSize: '글자 크기',
      subtitleSmall: '작게',
      subtitleMedium: '보통',
      subtitleLarge: '크게',
      subtitleBackground: '자막 배경',
      subtitleBackgroundNone: '없음',
      subtitleBackgroundTranslucent: '반투명',
      subtitleBackgroundDark: '어둡게',
    },
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
    restore: '복원',
    cancel: '취소',
    save: '저장',
    conflict: '이 단축키는 이미 “{action}”에서 사용 중입니다.',
    noConflict: '충돌이 없습니다.',
    replacedNetflixKeys: 'Netflix 키 대체: {keys}',
    willReplaceNetflixKeys: '저장하면 Netflix 기본 키가 비활성화됩니다: {keys}',
    actions: {
      playPause: '재생 / 일시정지(길게 눌러 배속)',
      seekBackward: '되감기',
      seekForward: '빨리감기',
      volumeUp: '볼륨 올리기',
      volumeDown: '볼륨 내리기',
      mute: '음소거',
      toggleSubtitles: '자막 전환',
      fullscreen: '전체 화면',
      pictureInPicture: '화면 속 화면',
      skipIntro: '인트로 건너뛰기',
      speedUp: '재생 속도 올리기',
      speedDown: '재생 속도 내리기',
      setPreferredSpeed: '자주 쓰는 배속 적용',
      speedReset: '재생 속도 초기화',
    },
  },
}

export const getCopy = (locale: Locale): Copy => COPY[locale]
