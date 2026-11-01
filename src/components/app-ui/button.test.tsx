import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/app-ui/button'
import { Input } from '@/components/app-ui/input'

describe('application UI adapters', () => {
  it('forwards the native button ref and activation handler', () => {
    const ref = createRef<HTMLButtonElement>()
    const onClick = vi.fn()
    render(<Button ref={ref} onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(ref.current).toBe(button)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('preserves a slotted link without another interactive element', () => {
    const ref = createRef<HTMLAnchorElement>()
    render(<Button asChild className="caller-style"><a ref={ref} href="#help">Help</a></Button>)
    const link = screen.getByRole('link', { name: 'Help' })
    expect(ref.current).toBe(link)
    expect(link).toHaveClass('caller-style')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('forwards consumer styles and native disabled behavior', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick} style={{ height: 40 }}>Disabled</Button>)
    const button = screen.getByRole('button', { name: 'Disabled' })
    expect(button).toHaveStyle({ height: '40px' })
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards input refs and native control props', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} aria-label="Value" defaultValue="1.5" />)
    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Value' }))
    expect(ref.current).toHaveValue('1.5')
  })
})
