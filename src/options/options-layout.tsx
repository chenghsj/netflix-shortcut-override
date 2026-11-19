import { BookOpenIcon, KeyboardIcon, SearchIcon, SettingsIcon, XIcon } from 'lucide-react'
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/app-ui/input-group'
import { Button } from '@/components/app-ui/button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/app-ui/breadcrumb'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/app-ui/card'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/app-ui/sidebar'
import { HELP_UI_COPY } from '@/help/help-copy'
import { getCopy } from '@/shared/i18n'
import { cn } from '@/lib/utils'
import { useSidebarShortcuts } from '@/options/use-sidebar-shortcuts'
import { OPTIONS_LAYOUT_COPY, SETTINGS_SEARCH_COPY, type OptionsPage } from '@/shared/options-navigation'
import type { Locale } from '@/shared/shortcut-types'
import { useSearchShortcut } from '@/shared/use-search-shortcut'

export { OPTIONS_LAYOUT_COPY, type ShortcutCategory, type OptionsPage } from '@/shared/options-navigation'

export type OptionsPageDescriptor = { id: OptionsPage; label: string; group: 'shortcuts' | 'settings' | 'help'; content: ReactNode; afterContent?: ReactNode; afterContentInCard?: boolean; matches?: boolean; afterContentMatches?: boolean; titleHelp?: ReactNode; titleActions?: ReactNode }

type OptionsLayoutProps = {
  locale: Locale
  pages: OptionsPageDescriptor[]
  activePage: OptionsPage
  onPageChange: (page: OptionsPage) => void
  query: string
  onQueryChange: (query: string) => void
  header: ReactNode
  globalControl: ReactNode
  shortcutActions: ReactNode
}

export function OptionsBreadcrumb({ locale, group, label, help }: {
  locale: Locale
  group: OptionsPageDescriptor['group']
  label: string
  help?: ReactNode
}) {
  const root = group === 'shortcuts' ? getCopy(locale).shortcuts : OPTIONS_LAYOUT_COPY[locale].settings
  const Icon = group === 'shortcuts' ? KeyboardIcon : SettingsIcon
  return <Breadcrumb aria-label={root}>
    <BreadcrumbList>
      <BreadcrumbItem className="gap-2"><Icon className="size-4 shrink-0" aria-hidden="true" /><span>{root}</span></BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem><BreadcrumbPage>{label}</BreadcrumbPage>{help}</BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
}

export function OptionsLayout(props: OptionsLayoutProps) {
  return <SidebarProvider className="app-options-layout mx-auto min-h-svh max-w-6xl gap-6 bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    style={{ '--sidebar-width': '13rem' } as CSSProperties}><OptionsLayoutContent {...props} /></SidebarProvider>
}

function OptionsLayoutContent({ locale, pages, activePage, onPageChange, query, onQueryChange, header, globalControl, shortcutActions }: OptionsLayoutProps) {
  const copy = OPTIONS_LAYOUT_COPY[locale]
  const searchCopy = SETTINGS_SEARCH_COPY[locale]
  const appCopy = getCopy(locale)
  const input = useRef<HTMLInputElement>(null)
  const headerRow = useRef<HTMLDivElement>(null)
  const sidebarHeader = useRef<HTMLDivElement>(null)
  const searchShortcut = useSearchShortcut(input)
  const { isMobile, open, setOpenMobile, setOpen } = useSidebar()

  useLayoutEffect(() => {
    const header = headerRow.current
    const sidebar = sidebarHeader.current
    if (isMobile || !header || !sidebar) return

    const alignHeader = () => {
      sidebar.style.height = `${header.getBoundingClientRect().height}px`
    }
    alignHeader()
    const observer = new ResizeObserver(alignHeader)
    observer.observe(header)
    return () => {
      observer.disconnect()
      sidebar.style.removeProperty('height')
    }
  }, [isMobile])

  const searching = Boolean(query.trim())
  const page = pages.find(page => page.id === activePage)!
  const helpPage = pages.find(page => page.group === 'help')
  const readingHelp = page.group === 'help'
  const searchLabel = readingHelp ? HELP_UI_COPY[locale].search : searchCopy.search
  const results = pages.filter(page => page.matches || page.afterContentMatches)
  const showShortcutActions = searching ? results.some(page => page.group === 'shortcuts' && page.matches) : page.group === 'shortcuts'
  const titleActions = !searching && page.titleActions !== undefined ? page.titleActions : showShortcutActions ? shortcutActions : null
  const select = (id: OptionsPage) => {
    onQueryChange('')
    onPageChange(id)
    setOpenMobile(false)
  }
  const sidebarPages = (['shortcuts', 'settings'] as const).flatMap(group => pages.filter(page => page.group === group))
  const navigationPages = [...sidebarPages, ...(helpPage ? [helpPage] : [])]
  const sidebarShortcuts = useSidebarShortcuts(navigationPages.map(page => page.id), select)
  const shortcutHint = (page: OptionsPageDescriptor) => <kbd aria-hidden="true"
    className="ml-auto w-3 shrink-0 text-right font-sans text-xs font-normal text-muted-foreground tabular-nums group-data-[active=true]/menu-button:text-current">
    {sidebarShortcuts.showHints && navigationPages.indexOf(page) + 1}
  </kbd>
  return <>
    <Sidebar collapsible={isMobile ? 'offcanvas' : 'none'}
      className={isMobile ? undefined : cn('sticky top-6 h-[calc(100svh-3rem)] shrink-0 bg-transparent', !open && 'hidden')}>
      <SidebarHeader ref={sidebarHeader} className={cn('shrink-0 px-3', isMobile ? 'pt-2 pb-6' : 'mb-6 justify-center py-2')}>
        {isMobile ? <span className="text-base font-(weight:--ui-title-weight)">{copy.settings}</span>
          : <div onFocus={() => setOpen(true)}>{globalControl}</div>}
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={copy.category}>
          {(['shortcuts', 'settings'] as const).map(group => <SidebarGroup key={group} className="py-0">
            <SidebarGroupLabel className="gap-2 text-sm text-muted-foreground/85 md:h-10">
              {group === 'shortcuts' ? <KeyboardIcon className="size-4 shrink-0" aria-hidden="true" /> : <SettingsIcon className="size-4 shrink-0" aria-hidden="true" />}
              <span>{group === 'shortcuts' ? appCopy.shortcuts : copy.settings}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent className="pl-4"><SidebarMenu className="gap-1 border-l border-muted-foreground/25 pl-2">
              {sidebarPages.filter(page => page.group === group).map(page => <SidebarMenuItem key={page.id}>
                <SidebarMenuButton isActive={!searching && activePage === page.id} aria-current={!searching && activePage === page.id ? 'page' : undefined}
                  aria-keyshortcuts={`${sidebarShortcuts.modifier}+${navigationPages.indexOf(page) + 1}`}
                  onClick={() => select(page.id)}>
                  <span className="min-w-0 flex-1">{page.label}</span>
                  {shortcutHint(page)}
                </SidebarMenuButton>
              </SidebarMenuItem>)}
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>)}
        </nav>
      {helpPage && <div className="mx-2 mt-2 border-t border-border pt-2">
        <SidebarMenu><SidebarMenuItem>
          <SidebarMenuButton isActive={readingHelp} aria-current={readingHelp ? 'page' : undefined}
            aria-keyshortcuts={`${sidebarShortcuts.modifier}+${navigationPages.indexOf(helpPage) + 1}`} onClick={() => select(helpPage.id)}>
            <BookOpenIcon aria-hidden="true" /><span className="min-w-0 flex-1">{helpPage.label}</span>
            {shortcutHint(helpPage)}
          </SidebarMenuButton>
        </SidebarMenuItem></SidebarMenu>
      </div>}
      </SidebarContent>
    </Sidebar>
    <SidebarInset className="min-w-0 bg-background">
      <div className="flex w-full min-w-0 flex-col gap-6">
        <div ref={headerRow} className="flex items-center gap-3">
          <SidebarTrigger aria-label={copy.toggle} className="shrink-0" />
          <div className="min-w-0 flex-1">{header}</div>
        </div>
        {isMobile && <Card size="sm" aria-label={appCopy.enabled}>
          <CardContent>{globalControl}</CardContent>
        </Card>}
        <InputGroup className="h-10">
          <InputGroupAddon><SearchIcon aria-hidden="true" /></InputGroupAddon>
          <InputGroupInput ref={input} id="shortcut-search" type="text" role="searchbox" enterKeyHint="search" value={query} aria-label={searchLabel} placeholder={searchLabel} aria-keyshortcuts={searchShortcut.ariaKeyShortcuts}
            onChange={event => onQueryChange(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') onQueryChange('') }} />
          <InputGroupAddon align="inline-end" className="pr-3 has-[>kbd]:mr-0"><kbd aria-hidden="true" className="whitespace-nowrap font-sans text-xs font-normal text-muted-foreground">{searchShortcut.label}</kbd></InputGroupAddon>
          {query && <InputGroupAddon align="inline-end"><Button variant="ghost" size="icon-sm" aria-label={copy.clear}
            onClick={() => { onQueryChange(''); input.current?.focus() }}><XIcon /></Button></InputGroupAddon>}
        </InputGroup>
        {readingHelp || (!searching && page.group === 'settings') ? page.content : <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle id="shortcuts-heading" className="min-w-0">
              <OptionsBreadcrumb locale={locale} group={searching ? 'settings' : 'shortcuts'} label={searching ? copy.results : page.label} help={!searching && page.titleHelp} />
            </CardTitle>
            {titleActions && <CardAction className="ml-auto shrink-0 self-center">{titleActions}</CardAction>}
          </CardHeader>
          <CardContent className="flex min-w-0 flex-col gap-6">
            {searching ? results.length ? results.map(page => <div key={page.id} className="flex min-w-0 flex-col gap-6">
              {page.matches && page.content}
              {page.afterContentMatches && page.afterContent}
            </div>)
              : <p role="status" className="py-8 text-center text-sm text-muted-foreground">{searchCopy.empty}</p> : page.content}
            {!searching && page.afterContentInCard && page.afterContent}
          </CardContent>
        </Card>}
        {!searching && !page.afterContentInCard && page.afterContent}
      </div>
    </SidebarInset>
  </>
}
