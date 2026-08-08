import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { markPipDocument } from '@/content/pip/pip-document'
import { createHintIcon, getHintManager } from './hint-manager'

const testIcon = (attributes: Record<string, string> = {}) => createHintIcon(attributes)

describe('HintManager', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    getHintManager(document).destroy()
    vi.useRealTimers()
  })

  it('keeps one root overlay when switching between hint types', () => {
    const video = document.createElement('video')
    document.body.append(video)
    const manager = getHintManager(document)

    manager.show({ type: 'seek', direction: -1, seconds: 10 })
    const previousHint = document.getElementById('shortcut-override-seek-hint')

    manager.show({ type: 'media', icon: testIcon(), label: '1.25x' })

    expect(previousHint?.style.opacity).toBe('0')
    expect(document.querySelectorAll('#shortcut-override-media-hint')).toHaveLength(1)
    expect(document.querySelectorAll('#shortcut-override-seek-hint')).toHaveLength(0)
  })

  it('reuses the existing root for repeated hints of the same type', () => {
    const manager = getHintManager(document)

    manager.show({ type: 'media', icon: testIcon(), label: '1x' })
    const firstHint = document.getElementById('shortcut-override-media-hint')
    manager.show({ type: 'media', icon: testIcon(), label: '1.25x' })
    const secondHint = document.getElementById('shortcut-override-media-hint')

    expect(secondHint).toBe(firstHint)
    expect(secondHint).toHaveTextContent('1.25x')
  })

  it('updates a visible media hint without restarting its animation', () => {
    const manager = getHintManager(document)
    manager.show({ type: 'media', icon: testIcon({ 'data-icon': 'speed' }), label: '1x' })
    const hint = document.getElementById('shortcut-override-media-hint')
    const icon = hint?.firstElementChild
    const label = hint?.lastElementChild

    manager.show({
      type: 'media',
      icon: testIcon({ 'data-icon': 'speed' }),
      label: '1.25x',
    })

    expect(document.getElementById('shortcut-override-media-hint')).toBe(hint)
    expect(hint?.firstElementChild).toBe(icon)
    expect(hint?.lastElementChild).toBe(label)
    expect(label).toHaveTextContent('1.25x')
    expect(hint?.style.opacity).toBe('1')
    expect(hint?.style.background).toBe('rgba(0, 0, 0, 0.68)')
  })

  it('updates a visible volume hint without restarting its animation', () => {
    const manager = getHintManager(document)
    manager.show({ type: 'volume', icon: testIcon({ 'data-icon': 'up' }), label: '50%' })

    const root = document.getElementById('shortcut-override-volume-hint')
    const circle = root?.firstElementChild
    const label = document.getElementById('shortcut-override-volume-hint-label')

    manager.show({
      type: 'volume',
      icon: testIcon({ 'data-icon': 'down' }),
      label: '45%',
    })

    expect(document.getElementById('shortcut-override-volume-hint')).toBe(root)
    expect(root?.firstElementChild).toBe(circle)
    expect(document.getElementById('shortcut-override-volume-hint-label')).toBe(label)
    expect(label).toHaveTextContent('45%')
    expect(circle?.querySelector('svg')).toHaveAttribute('data-icon', 'down')
    expect(root?.style.opacity).toBe('1')
    expect((circle as HTMLElement | null)?.style.width).toBe('92px')
    expect(label?.style.fontSize).toBe('16px')
  })

  it('updates labeled hints using the PiP document realm', () => {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const pipDoc = iframe.contentDocument
    if (!pipDoc) throw new Error('Expected PiP document')

    pipDoc.body.append(pipDoc.createElement('video'))
    const manager = getHintManager(pipDoc)
    manager.show({ type: 'volume', icon: testIcon({ 'data-icon': 'up' }), label: '50%' })

    const root = pipDoc.getElementById('shortcut-override-volume-hint')
    const circle = root?.firstElementChild
    const label = pipDoc.getElementById('shortcut-override-volume-hint-label')

    manager.show({
      type: 'volume',
      icon: testIcon({ 'data-icon': 'down' }),
      label: '45%',
    })

    expect(pipDoc.getElementById('shortcut-override-volume-hint')).toBe(root)
    expect(root?.firstElementChild).toBe(circle)
    expect(pipDoc.getElementById('shortcut-override-volume-hint-label')).toBe(label)
    expect(label).toHaveTextContent('45%')
    expect(circle?.querySelector('svg')).toHaveAttribute('data-icon', 'down')
    manager.destroy()
    iframe.remove()
  })

  it('renders speed feedback in its own labeled circle', () => {
    const manager = getHintManager(document)

    manager.show({
      type: 'speed',
      icon: testIcon({ 'data-hint-icon': 'speed-up' }),
      label: '1.25x',
    })

    const root = document.getElementById('shortcut-override-speed-hint')
    const circle = root?.firstElementChild as HTMLElement | null
    const label = document.getElementById('shortcut-override-speed-hint-label')
    expect(root).toHaveTextContent('1.25x')
    expect(root?.style.width).toBe('100%')
    expect(root?.style.opacity).toBe('1')
    expect(circle?.style.width).toBe('92px')
    expect(label?.style.fontSize).toBe('16px')
    expect(root?.querySelector('[data-hint-icon="speed-up"]')).toBeInTheDocument()
    expect(document.getElementById('shortcut-override-speed-hint-label')?.style.top).toBe('10%')
    expect(document.getElementById('shortcut-override-volume-hint')).toBeNull()
  })

  it('starts fading a volume hint 360ms after the last update', () => {
    vi.useFakeTimers()
    const manager = getHintManager(document)
    manager.show({ type: 'volume', icon: testIcon(), label: '50%' })
    const hint = document.getElementById('shortcut-override-volume-hint')

    vi.advanceTimersByTime(359)
    expect(hint?.style.opacity).toBe('1')

    vi.advanceTimersByTime(1)
    expect(hint?.style.opacity).toBe('0')
  })

  it('accumulates a visible seek hint in the same direction without restarting it', () => {
    const manager = getHintManager(document)
    manager.show({ type: 'seek', direction: 1, seconds: 10 })
    const hint = document.getElementById('shortcut-override-seek-hint')
    const content = hint?.querySelector('[data-hint-content="seek"]')

    manager.show({ type: 'seek', direction: 1, seconds: 15 })

    expect(document.getElementById('shortcut-override-seek-hint')).toBe(hint)
    expect(hint?.querySelector('[data-hint-content="seek"]')).toBe(content)
    expect(content).toHaveTextContent('+25')
    expect(content?.querySelector('[data-seek-sign]')).toHaveTextContent('+')
    expect(content?.querySelector('[data-seek-value]')).toHaveTextContent('25')
    expect(content?.querySelector('span')?.style.gap).toBe('6px')
    expect(hint?.style.opacity).toBe('1')
  })

  it('continues accumulating a seek hint after the initial fade begins', () => {
    vi.useFakeTimers()
    const manager = getHintManager(document)
    manager.show({ type: 'seek', direction: 1, seconds: 10 })
    const hint = document.getElementById('shortcut-override-seek-hint')

    vi.advanceTimersByTime(500)
    manager.show({ type: 'seek', direction: 1, seconds: 10 })

    expect(hint).toHaveTextContent('+20')
    expect(hint?.style.opacity).toBe('1')
  })

  it('resets the accumulated seek value after the continuation window', () => {
    vi.useFakeTimers()
    const manager = getHintManager(document)
    manager.show({ type: 'seek', direction: 1, seconds: 10 })
    const hint = document.getElementById('shortcut-override-seek-hint')

    vi.advanceTimersByTime(701)
    manager.show({ type: 'seek', direction: 1, seconds: 10 })

    expect(hint).toHaveTextContent('+10')
  })

  it('restarts a seek hint when its direction changes', () => {
    const manager = getHintManager(document)
    manager.show({ type: 'seek', direction: 1, seconds: 10 })
    const hint = document.getElementById('shortcut-override-seek-hint')
    const content = hint?.querySelector('[data-hint-content="seek"]')

    manager.show({ type: 'seek', direction: -1, seconds: 10 })

    expect(hint?.dataset.seekDirection).toBe('-1')
    expect(hint?.querySelector('[data-hint-content="seek"]')).not.toBe(content)
    expect(hint).toHaveTextContent('−10')
    expect(hint?.querySelector('[data-seek-sign]')).toHaveTextContent('−')
    expect(hint?.querySelector<HTMLElement>('[data-seek-sign]')?.style.fontSize).toBe('22px')
  })

  it('removes stale duplicate nodes before rendering a new hint', () => {
    const first = document.createElement('div')
    first.id = 'shortcut-override-seek-hint'
    const second = document.createElement('div')
    second.id = 'shortcut-override-seek-hint'
    document.body.append(first, second)

    getHintManager(document).show({ type: 'seek', direction: 1, seconds: 10 })

    expect(document.querySelectorAll('#shortcut-override-seek-hint')).toHaveLength(1)
  })

  it('keeps timers isolated between the main document and PiP document', () => {
    vi.useFakeTimers()
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const pipDoc = iframe.contentDocument
    if (!pipDoc) throw new Error('Expected PiP document')
    pipDoc.body.append(pipDoc.createElement('video'))

    getHintManager(document).show({ type: 'seek', direction: 1, seconds: 10 })
    vi.advanceTimersByTime(400)
    getHintManager(pipDoc).show({ type: 'seek', direction: -1, seconds: 10 })
    vi.advanceTimersByTime(140)

    expect(document.getElementById('shortcut-override-seek-hint')?.style.opacity).toBe('0')
    expect(pipDoc.getElementById('shortcut-override-seek-hint')?.style.opacity).toBe('1')

    iframe.remove()
  })

  it('scales PiP hints with the window and repositions them after resize', () => {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const pipWindow = iframe.contentWindow
    const pipDoc = iframe.contentDocument
    if (!pipWindow || !pipDoc) throw new Error('Expected PiP document')

    markPipDocument(pipDoc)
    pipDoc.body.append(pipDoc.createElement('video'))
    Object.defineProperties(pipWindow, {
      innerWidth: { configurable: true, value: 320 },
      innerHeight: { configurable: true, value: 180 },
    })

    const manager = getHintManager(pipDoc)
    manager.show({ type: 'playback', icon: testIcon() })
    const hint = pipDoc.getElementById('shortcut-override-playback-hint')

    expect(hint?.style.getPropertyValue('--shortcut-override-hint-scale')).toBe('0.7')
    expect(hint?.style.opacity).toBe('1')
    expect(hint?.style.width).toBe('92px')
    expect(hint?.style.height).toBe('92px')
    expect(hint?.style.background).toBe('rgba(0, 0, 0, 0.68)')
    expect((hint?.firstElementChild as HTMLElement | null)?.style.transform).toBe('scale(0.82)')
    expect(hint?.style.transform).toContain('scale(0.86)')

    Object.defineProperties(pipWindow, {
      innerWidth: { configurable: true, value: 640 },
      innerHeight: { configurable: true, value: 360 },
    })
    pipWindow.dispatchEvent(new Event('resize'))

    expect(hint?.style.getPropertyValue('--shortcut-override-hint-scale')).toBe('1')
    expect(hint?.style.transform).toContain('--shortcut-override-hint-scale')

    manager.destroy()
    iframe.remove()
  })

  it('scales PiP seek hint edge insets with the window', () => {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const pipWindow = iframe.contentWindow
    const pipDoc = iframe.contentDocument
    if (!pipWindow || !pipDoc) throw new Error('Expected PiP document')

    markPipDocument(pipDoc)
    pipDoc.body.append(pipDoc.createElement('video'))
    Object.defineProperties(pipWindow, {
      innerWidth: { configurable: true, value: 320 },
      innerHeight: { configurable: true, value: 180 },
    })

    const manager = getHintManager(pipDoc)
    manager.show({ type: 'seek', direction: -1, seconds: 10 })
    const hint = pipDoc.getElementById('shortcut-override-seek-hint')

    expect(hint?.style.left).toBe('28.9px')
    expect(hint?.style.transform).toContain('scale(0.86)')

    Object.defineProperties(pipWindow, {
      innerWidth: { configurable: true, value: 1_280 },
      innerHeight: { configurable: true, value: 720 },
    })
    pipWindow.dispatchEvent(new Event('resize'))

    expect(hint?.style.left).toBe('41.28px')

    manager.destroy()
    iframe.remove()
  })

  it('renders the PiP space-hold hint below mirrored subtitles', () => {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const pipDoc = iframe.contentDocument
    if (!pipDoc) throw new Error('Expected PiP document')

    markPipDocument(pipDoc)
    pipDoc.body.append(pipDoc.createElement('video'))

    const manager = getHintManager(pipDoc)
    manager.show({ type: 'spaceHold', label: '2x' })

    const hint = pipDoc.getElementById('shortcut-override-space-hold-hint')
    const icon = hint?.lastElementChild as HTMLElement | null
    expect(hint?.style.zIndex).toBe('9')
    expect(hint?.style.minHeight).toBe('32px')
    expect(hint?.style.padding).toBe('6px 14px')
    expect(hint?.style.fontSize).toBe('13px')
    expect(hint?.style.background).toBe('rgba(0, 0, 0, 0.68)')
    expect(icon?.style.transform).toBe('scale(0.9)')
    expect(hint?.style.transform).toContain('scale(0.86)')

    manager.destroy()
    iframe.remove()
  })

  it('scales the shared labeled hint style for PiP volume feedback', () => {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const pipDoc = iframe.contentDocument
    if (!pipDoc) throw new Error('Expected PiP document')

    markPipDocument(pipDoc)
    pipDoc.body.append(pipDoc.createElement('video'))

    const manager = getHintManager(pipDoc)
    manager.show({ type: 'volume', icon: testIcon(), label: '50%' })

    const hint = pipDoc.getElementById('shortcut-override-volume-hint')
    const circle = hint?.firstElementChild as HTMLElement | null
    const label = pipDoc.getElementById('shortcut-override-volume-hint-label')
    expect(circle?.style.width).toBe('92px')
    expect(circle?.style.height).toBe('92px')
    expect(circle?.style.background).toBe('rgba(0, 0, 0, 0.68)')
    expect(circle?.firstElementChild).toHaveStyle({ transform: 'scale(0.82)' })
    expect(circle?.style.transform).toContain('scale(0.86)')
    expect(label?.style.fontSize).toBe('16px')
    expect(label?.style.background).toBe('rgba(0, 0, 0, 0.68)')
    expect(label?.style.transform).toContain('scale(0.86)')

    manager.destroy()
    iframe.remove()
  })

  it('renders the PiP speed hint below mirrored subtitles', () => {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const pipDoc = iframe.contentDocument
    if (!pipDoc) throw new Error('Expected PiP document')

    markPipDocument(pipDoc)
    const videoArea = pipDoc.createElement('div')
    videoArea.append(pipDoc.createElement('video'))
    pipDoc.body.append(videoArea)

    const manager = getHintManager(pipDoc)
    manager.show({ type: 'speed', icon: testIcon(), label: '1.25x' })

    const hint = pipDoc.getElementById('shortcut-override-speed-hint')
    const circle = hint?.firstElementChild as HTMLElement | null
    const icon = circle?.firstElementChild as HTMLElement | null
    const label = pipDoc.getElementById('shortcut-override-speed-hint-label')
    expect(hint?.style.zIndex).toBe('9')
    expect(hint?.parentElement).toBe(videoArea)
    expect(circle?.style.width).toBe('92px')
    expect(circle?.style.height).toBe('92px')
    expect(circle?.style.transform).toContain('scale(0.86)')
    expect(icon?.style.transform).toBe('scale(0.82)')
    expect(label?.style.fontSize).toBe('16px')
    expect(label?.style.minHeight).toBe('38px')
    expect(label?.style.transform).toContain('scale(0.86)')

    manager.destroy()
    iframe.remove()
  })

  it('hides a PiP backward hint after its exit delay', () => {
    vi.useFakeTimers()
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const pipDoc = iframe.contentDocument
    if (!pipDoc) throw new Error('Expected PiP document')
    pipDoc.body.append(pipDoc.createElement('video'))

    getHintManager(pipDoc).show({ type: 'seek', direction: -1, seconds: 10 })
    const hint = pipDoc.getElementById('shortcut-override-seek-hint')
    vi.advanceTimersByTime(540)

    expect(hint?.style.opacity).toBe('0')
    expect(hint?.style.visibility).not.toBe('hidden')
    iframe.remove()
  })

  it('keeps a space-hold hint visible until explicitly hidden', () => {
    const manager = getHintManager(document)
    manager.show({ type: 'spaceHold', label: '2x' })
    const hint = document.getElementById('shortcut-override-space-hold-hint')

    expect(hint?.style.opacity).toBe('1')
    expect(hint?.style.minHeight).toBe('32px')
    expect(hint?.style.padding).toBe('6px 14px')
    expect(hint?.style.fontSize).toBe('13px')
    expect(hint?.style.background).toBe('rgba(0, 0, 0, 0.68)')
    manager.hide()

    expect(hint?.style.opacity).toBe('0')
    expect(document.getElementById('shortcut-override-space-hold-hint')).toBeNull()
  })

  it('keeps seek hints inside the configured edge inset', () => {
    const previousInnerWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1_000 })
    const player = document.createElement('div')
    const video = document.createElement('video')
    player.append(video)
    document.body.append(player)
    const playerRect = {
      width: 980,
      height: 540,
      top: 0,
      right: 980,
      bottom: 540,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect
    const hintRect = {
      width: 140,
      height: 30,
      top: 0,
      right: 0,
      bottom: 30,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect
    const getBoundingClientRect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this === player) return playerRect
        if (this.id === 'shortcut-override-seek-hint') return hintRect
        return { width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
      })

    try {
      const manager = getHintManager(document)
      manager.show({ type: 'seek', direction: -1, seconds: 10 })
      expect(document.getElementById('shortcut-override-seek-hint')?.style.left).toBe('48px')
      manager.show({ type: 'seek', direction: 1, seconds: 10 })
      expect(document.getElementById('shortcut-override-seek-hint')?.style.left).toBe('792px')
    } finally {
      getBoundingClientRect.mockRestore()
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: previousInnerWidth,
      })
    }
  })
})
