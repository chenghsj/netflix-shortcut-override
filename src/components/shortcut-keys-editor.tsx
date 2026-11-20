import { useId, useRef, type ComponentProps, type KeyboardEvent, type Ref } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/app-ui/button'
import { ShortcutRecordingArea } from './shortcut-recording-area'
import type { ShortcutKeyConflict } from '@/shared/shortcut-assignment'
import { isKeyBinding, keyBindingFromEvent, keyBindingsEqual, MAX_SHORTCUT_KEYS } from '@/shared/shortcut-bindings'
import { getCopy } from '@/shared/i18n'
import type { KeyBinding, Locale } from '@/shared/shortcut-types'

export const MULTI_SHORTCUT_COPY = {
  en: { add: 'Add shortcut', remove: 'Remove shortcut {number}' },
  'zh-TW': { add: '新增快捷鍵', remove: '移除第 {number} 組快捷鍵' },
  'zh-CN': { add: '添加快捷键', remove: '移除第 {number} 组快捷键' },
  ja: { add: 'ショートカットを追加', remove: 'ショートカット {number} を削除' },
  ko: { add: '단축키 추가', remove: '단축키 {number} 삭제' },
  es: { add: 'Agregar atajo', remove: 'Quitar atajo {number}' },
  'pt-BR': { add: 'Adicionar atalho', remove: 'Remover atalho {number}' },
  fr: { add: 'Ajouter un raccourci', remove: 'Retirer le raccourci {number}' },
  de: { add: 'Tastenkürzel hinzufügen', remove: 'Tastenkürzel {number} entfernen' },
  id: { add: 'Tambah pintasan', remove: 'Hapus pintasan {number}' },
} satisfies Record<Locale, { add: string; remove: string }>

const KEY_ERROR_COPY = {
  en: { duplicate: 'This key is already recorded here.', invalid: 'This key could not be recorded.' },
  'zh-TW': { duplicate: '這個按鍵已在此動作中設定。', invalid: '無法錄製這個按鍵。' },
  'zh-CN': { duplicate: '此按键已在此操作中设置。', invalid: '无法录制此按键。' },
  ja: { duplicate: 'このキーはこの操作に登録済みです。', invalid: 'このキーは記録できません。' },
  ko: { duplicate: '이 키는 이 동작에 이미 등록되어 있습니다.', invalid: '이 키를 기록할 수 없습니다.' },
  es: { duplicate: 'Esta tecla ya está asignada a la acción.', invalid: 'No se pudo registrar esta tecla.' },
  'pt-BR': { duplicate: 'Esta tecla já está atribuída à ação.', invalid: 'Não foi possível registrar esta tecla.' },
  fr: { duplicate: 'Cette touche est déjà attribuée à cette action.', invalid: 'Impossible d’enregistrer cette touche.' },
  de: { duplicate: 'Diese Taste ist dieser Aktion bereits zugewiesen.', invalid: 'Diese Taste konnte nicht erfasst werden.' },
  id: { duplicate: 'Tombol ini sudah ditetapkan untuk tindakan ini.', invalid: 'Tombol ini tidak dapat direkam.' },
} satisfies Record<Locale, { duplicate: string; invalid: string }>

type Props = Omit<ComponentProps<typeof ShortcutRecordingArea>, 'binding' | 'onClear' | 'onKeyDown' | 'onChange' | 'ref' | 'placeholder' | 'idlePlaceholder'> & {
  bindings: readonly (KeyBinding | null)[]
  onChange: (keys: (KeyBinding | null)[]) => void
  locale: Locale
  conflicts?: readonly ShortcutKeyConflict[]
  actionLabel: (action: ShortcutKeyConflict['actions'][number]) => string
  ref?: Ref<HTMLDivElement>
}

export function ShortcutKeysEditor({ bindings, onChange, locale, conflicts, actionLabel, ref, ...props }: Props) {
  const copy = getCopy(locale)
  const multi = MULTI_SHORTCUT_COPY[locale]
  const errorCopy = KEY_ERROR_COPY[locale]
  const feedbackId = useId()
  const container = useRef<HTMLDivElement>(null)
  const keys = bindings.length ? bindings : [null]

  const focusRecorder = (index: number) => requestAnimationFrame(() => {
    container.current?.querySelectorAll<HTMLElement>('[data-slot="shortcut-recording"]').item(index)?.focus()
  })
  const updateKey = (index: number, key: KeyBinding | null) =>
    onChange(keys.map((saved, position) => position === index ? key : saved))
  const recordKey = (index: number, event: KeyboardEvent<HTMLDivElement>) => {
    if (['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    updateKey(index, keyBindingFromEvent(event))
  }
  const addShortcut = () => {
    onChange([...keys, null])
    focusRecorder(keys.length)
  }
  const removeShortcut = (index: number) => {
    onChange(keys.filter((_, position) => position !== index))
    focusRecorder(0)
  }

  return (
    <div ref={container} className="flex min-w-0 flex-col gap-2">
      {keys.map((key, index) => {
        const conflict = key && conflicts?.find(issue => keyBindingsEqual(issue.key, key))
        const errors = [
          key && !isKeyBinding(key) && errorCopy.invalid,
          conflict && conflict.duplicate && errorCopy.duplicate,
          conflict && conflict.actions.length > 0 && copy.conflict.replace('{action}',
            new Intl.ListFormat(locale).format(conflict.actions.map(actionLabel))),
        ].filter(Boolean)
        const id = `${feedbackId}-${index}`
        return <div key={index} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ShortcutRecordingArea
              {...props}
              ref={index === 0 ? ref : undefined}
              binding={key}
              tabIndex={0}
              aria-invalid={errors.length > 0 || undefined}
              aria-describedby={errors.length ? [props['aria-describedby'], id].filter(Boolean).join(' ') : props['aria-describedby']}
              placeholder={copy.pressKey}
              idlePlaceholder={copy.shortcutPlaceholder}
              onClear={() => updateKey(index, null)}
              clearLabel={props.clearLabel ?? copy.clearShortcut}
              onClick={event => event.currentTarget.focus()}
              onKeyDown={event => recordKey(index, event)}
            />
            {errors.length > 0 && <p id={id} role="alert" className="mt-2 text-sm text-destructive">
              {errors.map((error, index) => <span key={index} className="block">{error}</span>)}
            </p>}
          </div>
          {keys.length > 1 && (
            <Button
              type="button" variant="ghost" size="icon" className="mt-3"
              aria-label={multi.remove.replace('{number}', String(index + 1))}
              onClick={() => removeShortcut(index)}
            ><Trash2Icon /></Button>
          )}
        </div>
      })}
      <Button
        type="button" variant="outline" size="sm" className="mt-1 self-start"
        disabled={keys.length >= MAX_SHORTCUT_KEYS}
        onClick={addShortcut}
      ><PlusIcon />{multi.add}</Button>
    </div>
  )
}
