import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getUiStyleOptions, UI_STYLE_DEFINITIONS } from '@/shared/ui-styles'
import { LOCALES } from '@/shared/shortcut-types'

const themes = import.meta.glob('./themes/*.css')

const colors = [
  '--background', '--foreground', '--card', '--card-foreground',
  '--popover', '--popover-foreground', '--primary', '--primary-hover',
  '--primary-foreground', '--secondary', '--secondary-foreground',
  '--muted', '--muted-foreground', '--accent', '--accent-foreground',
  '--destructive', '--destructive-foreground', '--border', '--input', '--ring',
  '--brand-accent', '--brand-accent-foreground',
]
const appearance = [
  '--ui-brand-icon', '--ui-option-radius', '--ui-tabs-radius',
  '--radius', '--shadow-color', '--ui-border-width', '--ui-control-radius',
  '--ui-table-radius', '--ui-popover-radius', '--ui-tooltip-radius',
  '--ui-control-weight', '--ui-title-weight', '--ui-title-icon-size', '--ui-brand-weight', '--ui-strong-weight',
  '--ui-press-x', '--ui-press-y', '--ui-table-header-bg', '--ui-table-header-fg',
  '--ui-solid-button-border',
  '--ui-control-sm-radius', '--ui-control-xs-radius', '--ui-input-radius',
  '--ui-card-radius', '--ui-dialog-radius', '--ui-card-title-weight', '--ui-dialog-title-weight',
  '--ui-key-radius', '--ui-key-border-width', '--ui-key-bg', '--ui-key-fg',
  '--ui-key-font', '--ui-key-weight', '--ui-key-shadow', '--ui-thumb-border-width',
  '--ui-thumb-checked-bg', '--ui-thumb-unchecked-bg', '--ui-input-bg',
  '--ui-switch-width', '--ui-switch-height', '--ui-switch-thumb-size', '--ui-switch-padding',
  '--ui-switch-sm-width', '--ui-switch-sm-height', '--ui-switch-sm-thumb-size',
  '--ui-switch-border-color', '--ui-switch-off-bg',
  '--ui-option-active-bg', '--ui-option-active-fg',
  '--ui-recording-bg', '--ui-dialog-footer-bg', '--ui-dialog-close-radius', '--ui-key-padding-x',
  '--ui-outline-bg', '--ui-outline-hover-bg', '--ui-outline-expanded-bg', '--ui-ghost-hover-bg',
  ...['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'].map(size => `--ui-shadow-${size}`),
]

describe('UI theme contract', () => {
  it.each(['light', 'dark'])('keeps Markdown heading and tab icons visible in %s mode', mode => {
    const root = document.documentElement
    const previousStyle = root.getAttribute('data-ui-style')
    const previousAppUi = document.body.getAttribute('data-app-ui')
    const previousDark = root.classList.contains('dark')
    const stylesheet = document.createElement('style')
    stylesheet.textContent = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'themes', 'markdown.css'), 'utf8')
    const fixture = document.createElement('div')
    fixture.innerHTML = `
      <div data-slot="card-title"><svg id="options-heading-icon"></svg></div>
      <section class="border-2">
        <h2><svg id="popup-heading-icon"></svg></h2>
        <h2><button><span><svg id="collapsible-heading-icon"></svg></span></button></h2>
      </section>
      <button data-slot="tabs-trigger"><svg id="tab-icon"></svg></button>
    `

    try {
      root.dataset.uiStyle = 'markdown'
      root.classList.toggle('dark', mode === 'dark')
      document.body.dataset.appUi = ''
      document.head.append(stylesheet)
      document.body.append(fixture)
      for (const icon of fixture.querySelectorAll('svg')) {
        expect(getComputedStyle(icon).display, icon.id).not.toBe('none')
      }
    } finally {
      fixture.remove()
      stylesheet.remove()
      if (previousStyle === null) root.removeAttribute('data-ui-style')
      else root.setAttribute('data-ui-style', previousStyle)
      if (previousAppUi === null) document.body.removeAttribute('data-app-ui')
      else document.body.setAttribute('data-app-ui', previousAppUi)
      root.classList.toggle('dark', previousDark)
    }
  })

  it.each(LOCALES)('provides distinct nonempty style names in %s', locale => {
    const labels = getUiStyleOptions(locale).map(option => option.label.trim())
    expect(labels.every(Boolean)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('keeps registered themes and automatically loaded stylesheets in sync', () => {
    const ids = UI_STYLE_DEFINITIONS.map(style => style.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(themes).sort()).toEqual(ids.map(id => `./themes/${id}.css`).sort())
  })

  it.each(UI_STYLE_DEFINITIONS)('provides complete light and dark tokens for $id', ({ id }) => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'themes', `${id}.css`), 'utf8')
    const blocks = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    const light = blocks.find(block => block[1].replace(/['"]/g, '').includes(`[data-ui-style=${id}]`) && !block[1].includes('.dark'))
    const dark = blocks.find(block => block[1].replace(/['"]/g, '').includes(`[data-ui-style=${id}]`) && block[1].includes('.dark'))
    expect(light, `${id} needs a light selector`).toBeDefined()
    expect(dark, `${id} needs a dark selector`).toBeDefined()
    for (const token of [...colors, ...appearance]) {
      expect(light?.[2], `${id} is missing ${token}`).toContain(`${token}:`)
    }
    for (const token of [...colors, '--ui-brand-icon']) {
      expect(dark?.[2], `${id} dark is missing ${token}`).toContain(`${token}:`)
    }
  })
})
