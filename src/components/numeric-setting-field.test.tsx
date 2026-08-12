import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NumericSettingField } from '@/components/numeric-setting-field'
import { TooltipProvider } from '@/components/ui/tooltip'

describe('NumericSettingField', () => {
  it('releases focus on wheel so scrolling cannot change the value', () => {
    const onValueChange = vi.fn()
    render(
      <TooltipProvider>
        <NumericSettingField
          id="speed"
          label="Speed"
          tooltip="Playback speed"
          value="1.5"
          onValueChange={onValueChange}
        />
      </TooltipProvider>
    )
    const input = screen.getByRole('spinbutton', { name: 'Speed' })
    input.focus()

    fireEvent.wheel(input, { deltaY: -100 })

    expect(input).not.toHaveFocus()
    expect(input).toHaveValue(1.5)
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
