import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/app-ui/tooltip'

afterEach(() => vi.restoreAllMocks())

function renderTooltip(onFocus?: React.FocusEventHandler<HTMLButtonElement>) {
  const ref: { current: HTMLButtonElement | null } = { current: null }
  render(
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild onFocus={onFocus}>
          <button ref={ref} type="button">Language</button>
        </TooltipTrigger>
        <TooltipContent>Choose a language</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  )
  const trigger = screen.getByRole('button', { name: 'Language' })
  expect(ref.current).toBe(trigger)
  return trigger
}

function setFocusVisible(trigger: HTMLElement, visible: boolean) {
  const matches = trigger.matches.bind(trigger)
  vi.spyOn(trigger, 'matches').mockImplementation(selector =>
    selector === ':focus-visible' ? visible : matches(selector),
  )
}

describe('app tooltip focus', () => {
  it('keeps a trigger focused without opening the tooltip after non-visible focus', () => {
    const trigger = renderTooltip()
    setFocusVisible(trigger, false)

    act(() => trigger.focus())

    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('opens for keyboard-visible focus', async () => {
    const trigger = renderTooltip()
    setFocusVisible(trigger, true)

    act(() => trigger.focus())

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Choose a language')
  })

  it('calls a consumer focus handler and honors its prevented default', () => {
    const onFocus = vi.fn<React.FocusEventHandler<HTMLButtonElement>>(event => event.preventDefault())
    const trigger = renderTooltip(onFocus)
    setFocusVisible(trigger, true)

    act(() => trigger.focus())

    expect(onFocus).toHaveBeenCalledOnce()
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
