import type { Locale } from '@/shared/shortcut-types'

export const FEATURE_MANAGEMENT_COPY = {
  en: { manage: 'Manage page features', description: 'Uncheck to hide a feature and disable its shortcuts.\nCheck to show and enable it; conflicting shortcuts stay disabled.', apply: 'Apply', changed: 'Features changed in another view. Cancel and reopen this menu to continue.', show: 'Show {action}', empty: 'No features shown. Use Manage page features to show them.', noShortcuts: 'No shortcuts shown in this category.' },
  'zh-TW': { manage: '管理本頁功能', description: '取消勾選會隱藏功能並停用對應快捷鍵。\n重新勾選會顯示並啟用，但有按鍵衝突的快捷鍵仍會停用。', apply: '套用', changed: '功能已在其他視窗變更，請取消並重新開啟選單。', show: '顯示 {action}', empty: '目前沒有顯示的功能，可從「管理本頁功能」開啟。', noShortcuts: '此分類目前沒有顯示的快捷鍵。' },
  'zh-CN': { manage: '管理本页功能', description: '取消勾选会隐藏功能并停用对应快捷键。\n重新勾选会显示并启用，但有按键冲突的快捷键仍会停用。', apply: '应用', changed: '功能已在其他窗口更改，请取消并重新打开菜单。', show: '显示 {action}', empty: '目前没有显示的功能，可从“管理本页功能”开启。', noShortcuts: '此分类目前没有显示的快捷键。' },
  ja: { manage: 'このページの機能を管理', description: 'チェックを外すと機能を非表示にし、対応するショートカットも無効にします。\n再度チェックすると表示して有効にしますが、キーが競合するショートカットは無効のままです。', apply: '適用', changed: '別の画面で機能が変更されました。キャンセルしてメニューを開き直してください。', show: '{action}を表示する', empty: '表示中の機能がありません。「このページの機能を管理」から表示できます。', noShortcuts: 'このカテゴリに表示中のショートカットがありません。' },
  ko: { manage: '이 페이지 기능 관리', description: '체크를 해제하면 기능이 숨겨지고 해당 단축키도 비활성화됩니다.\n다시 체크하면 표시되고 활성화되지만, 키가 충돌하는 단축키는 비활성 상태로 유지됩니다.', apply: '적용', changed: '다른 화면에서 기능이 변경되었습니다. 취소한 후 메뉴를 다시 여세요.', show: '{action} 표시', empty: '표시된 기능이 없습니다. 이 페이지 기능 관리에서 표시하세요.', noShortcuts: '이 카테고리에 표시된 단축키가 없습니다.' },
} satisfies Record<Locale, Record<string, string>>
