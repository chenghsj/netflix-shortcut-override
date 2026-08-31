import { useState } from 'react'
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

  it('adjusts the value by step while dragging the label and commits on release', () => {
    const onDragCommit = vi.fn()

    function Harness() {
      const [value, setValue] = useState('1.5')

      return (
        <TooltipProvider>
          <NumericSettingField
            id="speed"
            label="Speed"
            tooltip="Playback speed"
            min={0.5}
            max={2}
            step={0.25}
            value={value}
            onValueChange={setValue}
            onDragCommit={onDragCommit}
          />
        </TooltipProvider>
      )
    }

    render(<Harness />)
    const label = screen.getByText('Speed')
    const input = screen.getByRole('spinbutton', { name: 'Speed' })

    expect(label).toHaveStyle({ cursor: 'ew-resize' })
    expect(label).toHaveClass('touch-pan-y')
    expect(label).not.toHaveClass('touch-none')

    fireEvent.pointerDown(label, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(label, { clientX: 116, pointerId: 1 })

    expect(input).toHaveValue(2)
    expect(onDragCommit).not.toHaveBeenCalled()

    fireEvent.pointerUp(label, { clientX: 116, pointerId: 1 })

    expect(onDragCommit).toHaveBeenCalledOnce()
  })

  it('restores the starting value when label dragging is cancelled', () => {
    function Harness() {
      const [value, setValue] = useState('10')

      return (
        <TooltipProvider>
          <NumericSettingField
            id="seconds"
            label="Seconds"
            tooltip="Seek distance"
            min={5}
            max={30}
            step={1}
            value={value}
            onValueChange={setValue}
          />
        </TooltipProvider>
      )
    }

    render(<Harness />)
    const label = screen.getByText('Seconds')
    const input = screen.getByRole('spinbutton', { name: 'Seconds' })

    fireEvent.pointerDown(label, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(label, { clientX: 124, pointerId: 1 })
    expect(input).toHaveValue(13)

    fireEvent.pointerCancel(label, { pointerId: 1 })

    expect(input).toHaveValue(10)
  })

  it('does not drag a disabled input label', () => {
    const onValueChange = vi.fn()
    render(
      <TooltipProvider>
        <NumericSettingField
          id="speed"
          label="Speed"
          tooltip="Playback speed"
          step={0.25}
          value="1.5"
          disabled
          onValueChange={onValueChange}
        />
      </TooltipProvider>
    )
    const label = screen.getByText('Speed')

    fireEvent.pointerDown(label, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(label, { clientX: 116, pointerId: 1 })
    fireEvent.pointerUp(label, { clientX: 116, pointerId: 1 })

    expect(onValueChange).not.toHaveBeenCalled()
    expect(label).toHaveAttribute('aria-disabled', 'true')
    expect(label).toHaveClass('cursor-not-allowed')
    expect(label).toHaveStyle({ cursor: 'not-allowed' })
  })
})
