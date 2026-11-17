import { cn } from '@/lib/utils'

// Copy explicitly defines paragraphs and flat lists. Do not infer sentence
// boundaries at runtime: punctuation and decimal values vary by language.
export function HelpText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean)

  return <div className={cn('max-w-[72ch] space-y-3 text-sm leading-7 wrap-break-word', className)}>
    {blocks.map((block, index) => {
      const lines = block.split('\n')
      const ordered = lines.every(line => /^\d+\.\s+/.test(line))
      const bullets = lines.every(line => /^-\s+/.test(line))
      if (ordered || bullets) {
        const List = ordered ? 'ol' : 'ul'
        return <List key={index} className={cn('space-y-2 pl-5', ordered ? 'list-decimal' : 'list-disc')}>
          {lines.map((line, item) => <li key={item}>{line.replace(ordered ? /^\d+\.\s+/ : /^-\s+/, '')}</li>)}
        </List>
      }
      return <p key={index} className="whitespace-pre-line">{block}</p>
    })}
  </div>
}
