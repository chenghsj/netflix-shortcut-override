import { RestoreButton } from '@/components/reset-button'
import { RESET_SCOPE_COPY } from '@/shared/reset-scopes'
import { GripVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { DragHandle } from '@/components/drag-handle'
import { ShortcutRecordingArea } from '@/components/shortcut-recording-area'
import { Alert, AlertTitle } from '@/components/app-ui/alert'
import { Button } from '@/components/app-ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/app-ui/dialog'
import { Input } from '@/components/app-ui/input'
import { Label } from '@/components/app-ui/label'
import { Separator } from '@/components/app-ui/separator'
import { getCopy } from '@/shared/i18n'
import { getShortcutLabels } from '@/shared/seek-shortcuts'
import { keyBindingFromEvent } from '@/shared/shortcut-bindings'
import { getSubtitleSizeEditLimit, isSubtitleSizePercent, SUBTITLE_SIZE_COPY, SUBTITLE_SIZE_LIMITS } from '@/shared/subtitle-size-shortcuts'
import type { Locale, ShortcutSettings } from '@/shared/shortcut-types'
import { useNumericLabelDrag } from '@/shared/use-numeric-label-drag'
import { useDragPreview } from '@/shared/use-drag-preview'
import { useDragReorder } from '@/shared/use-drag-reorder'
import type { useSubtitleSizeEditor } from './use-subtitle-size-editor'

function SubtitleSizeLabel({ htmlFor, value, onValueChange, children }: {
  htmlFor: string; value: string; onValueChange: (value: string) => void; children: string
}) {
  const dragLabelProps = useNumericLabelDrag({
    value, onValueChange, min: SUBTITLE_SIZE_LIMITS.min, max: SUBTITLE_SIZE_LIMITS.max, step: 1,
  })
  return <Label {...dragLabelProps} htmlFor={htmlFor}
    className="w-16 shrink-0 cursor-ew-resize touch-pan-y select-none" style={{ cursor: 'ew-resize' }}>{children}</Label>
}

export function SubtitleSizeDialog({ editor, settings, locale }: {
  editor: ReturnType<typeof useSubtitleSizeEditor>; settings: ShortcutSettings; locale: Locale
}) {
  const { dialog } = editor
  const copy = getCopy(locale)
  const sizeCopy = SUBTITLE_SIZE_COPY[locale]
  const firstInput = useRef<HTMLInputElement>(null)
  const keyboardGrip = useRef<HTMLButtonElement | null>(null)
  const { setDragPreview, removeDragPreview } = useDragPreview()
  const sorting = useDragReorder({
    keys: dialog?.sizes.map(size => size.id) ?? [], scope: dialog,
    onReorder: (id, from, to) => {
      const target = dialog?.sizes[to]
      if (target) editor.moveSize(id, target.id, to > from ? 'after' : 'before')
    },
    onFinish: removeDragPreview,
  })
  useLayoutEffect(() => {
    keyboardGrip.current?.focus({ preventScroll: true })
    keyboardGrip.current = null
  }, [dialog?.sizes])
  return <Dialog open={Boolean(dialog)} onOpenChange={open => { if (!open) editor.close() }}>
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg" onOpenAutoFocus={event => { event.preventDefault(); firstInput.current?.focus() }} onCloseAutoFocus={editor.restoreFocus}>
      <DialogHeader className="shrink-0"><DialogTitle>{sizeCopy.edit}</DialogTitle><DialogDescription>{dialog?.kind === 'fixed' ? sizeCopy.fixedDescription : sizeCopy.description} {copy.shortcutOptional}</DialogDescription></DialogHeader>
      <div className="-mx-2 flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto px-2 pt-1 pb-2">
        <fieldset className="min-w-0 space-y-3" aria-describedby="subtitle-size-range">
          <legend className="mb-2 text-sm font-medium">{sizeCopy.sizes}</legend>
          <p id="subtitle-size-range" className="text-xs leading-relaxed text-muted-foreground">{dialog?.kind === 'cycle'
            ? sizeCopy.cycleRange.replace('{count}', String(getSubtitleSizeEditLimit(dialog.saved.sizes))) : sizeCopy.range}</p>
          <p id="subtitle-size-order-help" className="sr-only">{sizeCopy.keyboardHint}</p>
          <ol {...sorting.listProps} className="grid gap-2">
            {dialog?.sizes.map((size, index) => <li key={size.id}
              style={sorting.getRowStyle(size.id)}
              className="relative flex min-w-0 items-center gap-1.5 sm:gap-2">
              {dialog.kind === 'cycle' && <DragHandle><button type="button" draggable
                aria-label={sizeCopy.reorder.replace('{index}', String(index + 1))} aria-describedby="subtitle-size-order-help" aria-keyshortcuts="ArrowUp ArrowDown" title={sizeCopy.dragHint}
                onDragStart={event => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', 'subtitle-size')
                  const row = event.currentTarget.closest('li')!
                  setDragPreview(event, row)
                  sorting.start(event, size.id)
                }}
                onKeyDown={event => {
                  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
                  event.preventDefault()
                  const target = dialog.sizes[index + (event.key === 'ArrowUp' ? -1 : 1)]
                  if (!target) return
                  keyboardGrip.current = event.currentTarget
                  editor.moveSize(size.id, target.id, event.key === 'ArrowUp' ? 'before' : 'after')
                }}><GripVerticalIcon aria-hidden="true" className="pointer-events-none size-4" /></button></DragHandle>}
              <SubtitleSizeLabel htmlFor={`subtitle-size-value-${size.id}`} value={size.value} onValueChange={value => editor.setSize(size.id, value)}>
                {`${sizeCopy.size}${dialog.kind === 'cycle' ? ` ${index + 1}` : ''}`}
              </SubtitleSizeLabel>
              <Input ref={index === 0 ? firstInput : undefined} id={`subtitle-size-value-${size.id}`} type="number" className="w-20 shrink-0 sm:w-24"
                min={SUBTITLE_SIZE_LIMITS.min} max={SUBTITLE_SIZE_LIMITS.max} step={1} value={size.value}
                aria-invalid={!size.value.trim() || !isSubtitleSizePercent(Number(size.value)) || dialog.sizes.some(other => other.id !== size.id && Number(other.value) === Number(size.value))}
                aria-describedby={!editor.validSizes ? 'subtitle-size-error' : 'subtitle-size-range'}
                onChange={event => editor.setSize(size.id, event.target.value)} />
              <span aria-hidden="true">%</span>
              <span className="min-w-0 flex-1 text-xs text-muted-foreground"><span className="hidden sm:inline">{Number(size.value) === 100 ? sizeCopy.original : ''}</span></span>
              {dialog.kind === 'cycle' && <Button variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground" disabled={dialog.sizes.length <= 2}
                aria-label={sizeCopy.removeSize.replace('{index}', String(index + 1))} onClick={() => editor.removeSize(size.id)}><Trash2Icon /></Button>}
            </li>)}
          </ol>
          {dialog?.kind === 'cycle' && <Button variant="outline" disabled={dialog.sizes.length >= SUBTITLE_SIZE_LIMITS.count} onClick={editor.addSize}><PlusIcon data-icon="inline-start" />{sizeCopy.addSize}</Button>}
          {!editor.validSizes && dialog && <p id="subtitle-size-error" role="alert" className="text-sm text-destructive">{sizeCopy.invalid}</p>}
        </fieldset>
        <Separator />
        <div className="space-y-2">
          <Label id="subtitle-size-key-label">{copy.key}</Label>
          <ShortcutRecordingArea binding={dialog?.key} placeholder={copy.pressKey} idlePlaceholder={copy.shortcutPlaceholder} aria-labelledby="subtitle-size-key-label"
            onClear={() => editor.capture(null)} clearLabel={copy.clearShortcut}
            tabIndex={0} aria-invalid={Boolean(editor.conflict)} aria-describedby={editor.conflict ? 'subtitle-size-conflict' : undefined}
            onClick={event => event.currentTarget.focus()} onKeyDown={event => {
              if (event.key === 'Tab' || event.key === 'Escape' || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return
              event.preventDefault(); event.stopPropagation(); editor.capture(keyBindingFromEvent(event))
            }} />
        </div>
        {editor.conflict && <Alert id="subtitle-size-conflict" variant="destructive"><AlertTitle>{copy.conflict.replace('{action}', getShortcutLabels(settings, locale)[editor.conflict])}</AlertTitle></Alert>}
        {editor.stale && <Alert variant="destructive"><AlertTitle>{sizeCopy.changed}</AlertTitle></Alert>}
        {editor.storageFull && <Alert variant="destructive"><AlertTitle>{copy.settingsStorageFull}</AlertTitle></Alert>}
      </div>
      <DialogFooter className="shrink-0 sm:justify-between">
        <RestoreButton onClick={editor.restore}
          label={dialog?.action === 'cycleSubtitleSize' ? RESET_SCOPE_COPY[locale].sizeDefaultsLabel : copy.restore}
          description={dialog?.action === 'cycleSubtitleSize' ? RESET_SCOPE_COPY[locale].sizeDefaults : RESET_SCOPE_COPY[locale].restoreDraft} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={editor.close}>{copy.cancel}</Button><Button disabled={!editor.canSave} onClick={editor.save}>{copy.save}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
