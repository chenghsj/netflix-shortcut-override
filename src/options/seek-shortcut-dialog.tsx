import { RestoreButton } from '@/components/reset-button'
import { RESET_SCOPE_COPY } from '@/shared/reset-scopes'
import { PlayIcon } from 'lucide-react'
import { useRef } from 'react'
import { ShortcutRecordingArea } from '@/components/shortcut-recording-area'
import { Alert, AlertTitle } from '@/components/app-ui/alert'
import { Button } from '@/components/app-ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/app-ui/dialog'
import { Input } from '@/components/app-ui/input'
import { Label } from '@/components/app-ui/label'
import { Separator } from '@/components/app-ui/separator'
import { getCopy } from '@/shared/i18n'
import { getShortcutLabels, SEEK_PAIR_COPY, SEEK_SHORTCUT_COPY } from '@/shared/seek-shortcuts'
import { keyBindingFromEvent } from '@/shared/shortcut-bindings'
import { useNumericLabelDrag } from '@/shared/use-numeric-label-drag'
import type { Locale, ShortcutSettings } from '@/shared/shortcut-types'
import type { useSeekShortcutEditor } from './use-seek-shortcut-editor'

const EDITOR_COPY: Record<Locale, { description: string; changed: string }> = {
  en: { description: 'Set the jump value. Shortcuts are optional.', changed: 'Settings changed. Reopen this editor.' },
  'zh-TW': { description: '設定跳轉值，快捷鍵可留空。', changed: '設定已變更，請重新開啟視窗。' },
  'zh-CN': { description: '设置跳转值，快捷键可留空。', changed: '设置已更改，请重新打开窗口。' },
  ja: { description: '移動する値を設定します。キーは任意です。', changed: '設定が変わりました。編集画面を開き直してください。' },
  ko: { description: '이동할 값을 설정하세요. 단축키는 선택 사항입니다.', changed: '설정이 변경되었습니다. 편집 창을 다시 여세요.' },
}

export function SeekShortcutDialog({ editor, settings, locale }: {
  editor: ReturnType<typeof useSeekShortcutEditor>
  settings: ShortcutSettings
  locale: Locale
}) {
  const copy = getCopy(locale)
  const pairCopy = SEEK_PAIR_COPY[locale]
  const seekCopy = SEEK_SHORTCUT_COPY[locale]
  const labels = getShortcutLabels(settings, locale)
  const numberInput = useRef<HTMLInputElement>(null)
  const { dialog } = editor
  const actions = editor.actions.toReversed()
  const step = editor.percentage ? 5 : 1
  const dragLabelProps = useNumericLabelDrag({
    value: dialog?.value ?? '', onValueChange: editor.setValue, min: editor.min, max: editor.max, step,
  })
  const numberLabel = editor.percentage ? seekCopy.percentage : seekCopy.seconds
  const actionLabel = (index: number) => editor.percentage ? copy.key : index === 0 ? seekCopy.forward : seekCopy.backward
  return <Dialog open={Boolean(dialog)} onOpenChange={open => { if (!open) editor.close() }}>
    <DialogContent onOpenAutoFocus={event => { event.preventDefault(); numberInput.current?.focus() }} onCloseAutoFocus={editor.restoreFocus}>
      <DialogHeader>
        <DialogTitle>{copy.recordTitle}</DialogTitle>
        <DialogDescription>{EDITOR_COPY[locale].description}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Label {...dragLabelProps} htmlFor="seek-dialog-value" className="cursor-ew-resize touch-pan-y select-none" style={{ cursor: 'ew-resize' }}>{numberLabel}</Label>
            <p id="seek-dialog-range" className="text-xs text-muted-foreground">{editor.min}–{editor.max} {editor.percentage ? '%' : pairCopy.unit}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Input ref={numberInput} id="seek-dialog-value" type="number" className="w-28" min={editor.min} max={editor.max} step={step}
              value={dialog?.value ?? ''} onChange={event => editor.setValue(event.target.value)}
              aria-invalid={Boolean(dialog && (!dialog.value.trim() || !Number.isInteger(Number(dialog.value)) || Number(dialog.value) < editor.min || Number(dialog.value) > editor.max))}
              aria-describedby="seek-dialog-range" />
            <span className="text-muted-foreground">{editor.percentage ? '%' : pairCopy.unit}</span>
          </div>
        </div>
        <Separator />
        <div className="grid gap-3">
          {actions.map((action, index) => {
            const label = actionLabel(index)
            const key = dialog?.keys[action]
            const conflict = editor.fieldConflicts[action]
            return <div key={action} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] items-start gap-x-4 gap-y-5">
              <Label id={`seek-key-${index}-label`} className="flex items-center self-center leading-5">
                {label}
              </Label>
              <ShortcutRecordingArea binding={key} placeholder={copy.pressKey} idlePlaceholder={copy.shortcutPlaceholder} aria-labelledby={`seek-key-${index}-label`} tabIndex={0}
                onClear={() => editor.capture(action, null)} clearLabel={`${copy.clearShortcut}: ${label}`}
                aria-invalid={Boolean(conflict)} aria-describedby={conflict ? `seek-key-${index}-feedback` : undefined}
                onClick={event => event.currentTarget.focus()} onKeyDown={event => {
                  if (event.key === 'Tab' || event.key === 'Escape' || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return
                  event.preventDefault()
                  event.stopPropagation()
                  editor.capture(action, keyBindingFromEvent(event))
                }} />
              {conflict && <Alert id={`seek-key-${index}-feedback`} variant="destructive" className="col-span-2">
                <PlayIcon />
                <AlertTitle>{copy.conflict.replace('{action}', actions.includes(conflict) ? actionLabel(actions.indexOf(conflict)) : labels[conflict])}</AlertTitle>
              </Alert>}
            </div>
          })}
        </div>
        {dialog && editor.actions.every(action => dialog.keys[action] && !editor.fieldConflicts[action]) &&
          <Alert role="status"><PlayIcon /><AlertTitle>{copy.noConflict}</AlertTitle></Alert>}
        {editor.stale && <Alert variant="destructive"><PlayIcon /><AlertTitle>{EDITOR_COPY[locale].changed}</AlertTitle></Alert>}
        {editor.storageFull && <Alert variant="destructive"><PlayIcon /><AlertTitle>{copy.settingsStorageFull}</AlertTitle></Alert>}
      </div>
      <DialogFooter className="sm:justify-between">
        <RestoreButton onClick={editor.restore} label={copy.restore} description={RESET_SCOPE_COPY[locale].restoreDraft} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={editor.close}>{copy.cancel}</Button>
          <Button disabled={!editor.canSave} onClick={editor.save}>{copy.save}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
