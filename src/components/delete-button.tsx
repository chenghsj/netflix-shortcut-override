import { Trash2Icon } from 'lucide-react'
import { useRef, useState, type ComponentProps } from 'react'
import { Button } from '@/components/app-ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/app-ui/popover'
import { getCopy } from '@/shared/i18n'
import type { Locale } from '@/shared/shortcut-types'

const DELETE_COPY = {
  en: { confirmation: 'Delete?', action: 'Delete' },
  'zh-TW': { confirmation: '確定刪除？', action: '刪除' },
  'zh-CN': { confirmation: '确定删除？', action: '删除' },
  ja: { confirmation: '削除しますか？', action: '削除' },
  ko: { confirmation: '삭제할까요?', action: '삭제' },
} satisfies Record<Locale, { confirmation: string; action: string }>

type DeleteButtonProps = Omit<ComponentProps<typeof Button>, 'aria-label' | 'children' | 'onClick' | 'size'> & {
  locale: Locale
  label: string
  onClick: () => void
}

export function DeleteButton({ locale, label, disabled, onClick, variant = 'ghost', ...props }: DeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const copy = DELETE_COPY[locale]
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button {...props} type="button" variant={variant} size="icon" aria-label={label} disabled={disabled}><Trash2Icon /></Button>
    </PopoverTrigger>
    <PopoverContent side="bottom" align="end" sideOffset={8} collisionPadding={8}
      className="w-48 max-w-[calc(100vw-2rem)]" aria-label={label}
      onOpenAutoFocus={event => {
        event.preventDefault()
        cancelButton.current?.focus()
      }}>
      <p className="text-sm font-medium">{copy.confirmation}</p>
      <div className="flex justify-end gap-2">
        <Button ref={cancelButton} type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>{getCopy(locale).cancel}</Button>
        <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={() => {
          setOpen(false)
          onClick()
        }}>{copy.action}</Button>
      </div>
    </PopoverContent>
  </Popover>
}
