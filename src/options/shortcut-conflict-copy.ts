import type { Locale } from '@/shared/shortcut-types'

export const SHORTCUT_CONFLICT_COPY: Record<Locale, {
  title: string
  consequence: string
  changeKey: string
  transfer: string
}> = {
  en: {
    title: '{key} is used by {actions}', consequence: 'This will disable {actions}.',
    changeKey: 'Change key', transfer: 'Use this key',
  },
  'zh-TW': {
    title: '{key} 已由「{actions}」使用', consequence: '這會停用「{actions}」。',
    changeKey: '更換按鍵', transfer: '使用此按鍵',
  },
  'zh-CN': {
    title: '{key} 已由“{actions}”使用', consequence: '这会停用“{actions}”。',
    changeKey: '更换按键', transfer: '使用此按键',
  },
  ja: {
    title: '{key} は「{actions}」で使用されています', consequence: '「{actions}」を無効にします。',
    changeKey: 'キーを変更', transfer: 'このキーを使う',
  },
  ko: {
    title: '{key} 키는 {actions}에서 사용 중입니다', consequence: '{actions} 기능이 비활성화됩니다.',
    changeKey: '키 변경', transfer: '이 키 사용',
  },
  es: {
    title: '{key} ya se usa en {actions}',
    consequence: 'Esto desactivará {actions}.',
    changeKey: 'Cambiar tecla',
    transfer: 'Usar esta tecla',
  },
  'pt-BR': {
    title: '{key} já é usada em {actions}',
    consequence: 'Isso desativará {actions}.',
    changeKey: 'Mudar tecla',
    transfer: 'Usar esta tecla',
  },
  fr: {
    title: '{key} est déjà utilisée par {actions}',
    consequence: 'Cela désactivera {actions}.',
    changeKey: 'Changer de touche',
    transfer: 'Utiliser cette touche',
  },
  de: {
    title: '{key} wird bereits für {actions} verwendet',
    consequence: 'Dadurch wird {actions} deaktiviert.',
    changeKey: 'Taste ändern',
    transfer: 'Diese Taste verwenden',
  },
  id: {
    title: '{key} sudah digunakan oleh {actions}',
    consequence: 'Tindakan ini akan menonaktifkan {actions}.',
    changeKey: 'Ganti tombol',
    transfer: 'Gunakan tombol ini',
  },
}
