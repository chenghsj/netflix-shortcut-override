import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GlobeIcon } from 'lucide-react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/app-ui/tooltip'
import { ChoiceCombobox } from '@/components/choice-combobox'
import { OtherProjectsSelect } from '@/components/other-projects-select'
import { EXTERNAL_LINKS } from '@/shared/external-links'

afterEach(() => vi.restoreAllMocks())

const options = [
  { value: 'auto', label: 'Auto' },
  { value: 'en', label: 'EN', title: 'English' },
]

function focusAsKeyboard(element: HTMLElement) {
  const matches = element.matches.bind(element)
  vi.spyOn(element, 'matches').mockImplementation(selector =>
    selector === ':focus-visible' ? true : matches(selector),
  )
  act(() => element.focus())
}

describe('ChoiceCombobox icon trigger', () => {
  it('describes the current value without a tooltip and selects from the menu', async () => {
    const onChange = vi.fn()
    const warn = vi.spyOn(console, 'warn')
    render(
      <TooltipProvider>
        <ChoiceCombobox value="en" label="Language" options={options} onChange={onChange}
          triggerIcon={<GlobeIcon aria-hidden="true" />} />
      </TooltipProvider>,
    )
    const trigger = screen.getByRole('combobox', { name: 'Language' })
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
    expect(trigger).toHaveAccessibleDescription('EN')
    expect(trigger).toHaveTextContent('EN')
    focusAsKeyboard(trigger)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(trigger).toHaveAccessibleDescription('EN')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await screen.findByRole('option', { name: 'Auto' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'Auto' }))
    expect(onChange).toHaveBeenCalledWith('auto')
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
    expect(warn).not.toHaveBeenCalled()
  })

  it('returns focus to the single trigger when Escape closes the menu', async () => {
    render(
      <TooltipProvider>
        <ChoiceCombobox value="auto" label="Language" options={options} onChange={vi.fn()}
          triggerIcon={<GlobeIcon aria-hidden="true" />} />
      </TooltipProvider>,
    )
    const trigger = screen.getByRole('combobox', { name: 'Language' })
    fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('retains the default text trigger and does not add a tooltip', async () => {
    render(
      <TooltipProvider>
        <ChoiceCombobox value="auto" label="Language" options={options} onChange={vi.fn()} />
      </TooltipProvider>,
    )
    const trigger = screen.getByRole('combobox', { name: 'Language' })
    expect(trigger).toHaveTextContent('Auto')
    focusAsKeyboard(trigger)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })
})

describe('OtherProjectsSelect icon trigger', () => {
  it('dismisses its tooltip before opening and still navigates from the existing menu', async () => {
    render(
      <TooltipProvider>
        <OtherProjectsSelect iconOnly label="Other products" ariaLabel="Other products"
          streamDanmakuLabel="Stream Danmaku" streamDanmakuTitle="Open Stream Danmaku" />
      </TooltipProvider>,
    )
    const trigger = screen.getByRole('combobox', { name: 'Other products' })
    focusAsKeyboard(trigger)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Other products')
    fireEvent.click(trigger)
    const project = await screen.findByRole('option', { name: 'Stream Danmaku' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.click(project)
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: EXTERNAL_LINKS.streamDanmakuChromeWebStore })
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
