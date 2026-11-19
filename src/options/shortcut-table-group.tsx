import { ChevronDownIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/app-ui/collapsible'
import { Table, TableBody, TableCell, TableRow } from '@/components/app-ui/table'
import { cn } from '@/lib/utils'
import { featureId } from '@/shared/feature-management'
import type { ShortcutTarget } from '@/shared/shortcut-routing'

export const shortcutRowId = (target: ShortcutTarget) => `shortcut-row-${featureId(target)}`

export function ShortcutRow({ target, className, ...props }: ComponentProps<typeof TableRow> & { target: ShortcutTarget }) {
  return <TableRow {...props} id={shortcutRowId(target)} tabIndex={-1}
    className={cn('focus:bg-accent focus:outline-2 focus:-outline-offset-2 focus:outline-ring', className)} />
}

export function ShortcutGroupToggle({ label, open, children = label, className, ...props }: ComponentProps<'button'> & {
  label: string
  open: boolean
}) {
  return <button {...props} type="button" aria-label={label} aria-expanded={open}
    className={cn('flex min-h-11 min-w-0 flex-1 items-center gap-2 self-stretch px-3 py-2 text-left font-semibold focus-visible:outline-none', className)}>
    <ChevronDownIcon aria-hidden="true" className={cn('size-4 shrink-0 transition-transform motion-reduce:transition-none', !open && '-rotate-90')} />
    <span>{children}</span>
  </button>
}

export function ShortcutTableGroup({ label, title = label, open, onOpenChange, controls, children, columns = [45, 20, 15, 20], tableHeader, emptyState, collapsible = true }: {
  label: string
  title?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  controls?: ReactNode | ((expand: () => void) => ReactNode)
  children: ReactNode
  columns?: readonly number[]
  tableHeader?: ReactNode
  emptyState?: ReactNode
  collapsible?: boolean
}) {
  return <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
    <TableCell colSpan={4} className="p-0 whitespace-normal">
      <Collapsible open={open} onOpenChange={onOpenChange} asChild>
        <div role="group" aria-label={label}>
          <div className={cn('app-shortcut-group-header flex flex-wrap items-center border-border transition-colors hover:bg-accent has-focus-visible:bg-accent has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring motion-reduce:transition-none', open && 'border-b')}>
            {collapsible ? <CollapsibleTrigger asChild>
              <ShortcutGroupToggle label={label} open={open} className="px-2 font-medium">{title}</ShortcutGroupToggle>
            </CollapsibleTrigger> : <h4 className="flex min-h-11 flex-1 items-center px-3 py-2 font-semibold">{title}</h4>}
            {controls && <div className="flex flex-wrap items-center gap-3 px-3 py-2">{typeof controls === 'function' ? controls(() => onOpenChange(true)) : controls}</div>}
          </div>
          <CollapsibleContent forceMount className="data-[state=open]:animate-none data-[state=closed]:animate-none">
            <div hidden={!open}>
              {emptyState != null ? <div className="px-3 py-4 ps-8 text-sm leading-relaxed text-muted-foreground">{emptyState}</div> : <Table aria-label={label} className="table-fixed [&_td:first-child]:ps-8 [&_th:first-child]:ps-8" data-nested="true">
                <colgroup>{columns.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
                {tableHeader}
                <TableBody>{children}</TableBody>
              </Table>}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </TableCell>
  </TableRow>
}
