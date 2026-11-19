import { ChevronRightIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/app-ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/app-ui/accordion'
import { OPTIONS_PAGE_HASHES } from '@/shared/options-navigation'
import type { Locale } from '@/shared/shortcut-types'
import { HELP_UI_COPY } from './help-copy'
import { createHelpTopics, getHelpCategoryLabel, HELP_CATEGORY_IDS, matchesHelpTopic, type HelpCategory } from './help-topics'
import { SPECIAL_KEY_GUIDE_COPY } from './special-key-copy'
import { HelpText } from './help-text'

export function HelpPage({ locale, query }: {
  locale: Locale
  query: string
}) {
  const copy = HELP_UI_COPY[locale]
  const topics = useMemo(() => createHelpTopics(locale), [locale])
  const searching = Boolean(query.trim())
  const [expanded, setExpanded] = useState<Set<HelpCategory>>(() => new Set())
  const [searchCollapse, setSearchCollapse] = useState<{ query: string; categories: Set<HelpCategory> }>(() => ({ query: '', categories: new Set() }))
  const visibleTopics = topics.filter(topic => matchesHelpTopic(topic, query))
  const categories = HELP_CATEGORY_IDS.filter(category => visibleTopics.some(topic => topic.category === category))
  const isOpen = (category: HelpCategory) => searching
    ? searchCollapse.query !== query || !searchCollapse.categories.has(category) : expanded.has(category)
  const setOpen = (values: string[]) => {
    if (searching) setSearchCollapse({ query, categories: new Set(categories.filter(category => !values.includes(category))) })
    else setExpanded(new Set(categories.filter(category => values.includes(category))))
  }
  const setAllOpen = (open: boolean) => {
    if (searching) setSearchCollapse({ query, categories: new Set(open ? [] : categories) })
    else setExpanded(new Set(open ? HELP_CATEGORY_IDS : []))
  }
  const allExpanded = categories.length > 0 && categories.every(isOpen)

  return <section aria-labelledby="user-guide-heading" className="w-full min-w-0">
    <header className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="user-guide-heading" className="font-heading text-xl font-semibold">{copy.title}</h2>
          {searching && <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted-foreground tabular-nums">
            {copy.results.replace('{count}', String(visibleTopics.length))}
          </p>}
        </div>
        <Button variant="outline" size="sm" className="mr-(--ui-press-x)" disabled={!categories.length} onClick={() => setAllOpen(!allExpanded)}>
          {allExpanded ? copy.collapse : copy.expand}
        </Button>
      </div>
    </header>
    {!visibleTopics.length && <p className="py-10 text-center text-sm text-muted-foreground">{copy.empty}</p>}
    <Accordion type="multiple" value={categories.filter(isOpen)} onValueChange={setOpen}>
      {categories.map(category => {
        const entries = visibleTopics.filter(topic => topic.category === category)
        return <AccordionItem key={category} value={category}>
          <AccordionTrigger className="px-0">
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
              <span>{getHelpCategoryLabel(category, locale)}</span>
              <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">{entries.length}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent forceMount inert={!isOpen(category)} aria-hidden={!isOpen(category)}>
            <div className="flex flex-col gap-8 pt-2">
              {entries.map(topic => <article key={topic.id} aria-labelledby={`help-${topic.id}`} className="flex min-w-0 flex-col gap-3">
                <h4 id={`help-${topic.id}`} className="text-sm font-semibold">{topic.title}</h4>
                <HelpText text={topic.body} />
                {topic.id === 'supportedKeys' && <HelpText text={SPECIAL_KEY_GUIDE_COPY[locale].reserved} className="leading-6" />}
                {topic.page && <a href={OPTIONS_PAGE_HASHES[topic.page]} className="inline-flex items-center gap-1 rounded-sm text-sm font-medium underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                  {copy.settings}<ChevronRightIcon aria-hidden="true" className="size-3.5" />
                </a>}
              </article>)}
            </div>
          </AccordionContent>
        </AccordionItem>
      })}
    </Accordion>
  </section>
}
