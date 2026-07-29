import type { PipControlsCopy } from '@/shared/i18n'
import type { PipSettings } from '@/shared/shortcut-types'

const PIP_CONTROL_MARKER = 'shortcutOverridePipControl'
type SubtitlePanel = 'main' | 'size' | 'background'

type PipSubtitleMenuOptions = {
  pipWindow: Window
  button: HTMLButtonElement
  settings: PipSettings
  copy: PipControlsCopy
  onSettingsChange: (settings: PipSettings) => void
  onOpenChange: (open: boolean, restoreFocus: boolean) => void
  onWindowBlur: () => void
}

const createOptionsPanel = (
  doc: Document,
  panel: Exclude<SubtitlePanel, 'main'>,
  values: readonly string[],
  setting: 'pipSubtitleSize' | 'pipSubtitleBackground'
): HTMLElement => {
  const panelElement = doc.createElement('div')
  panelElement.dataset.pipSubtitlePanel = panel
  panelElement.dataset.active = 'false'
  const panelHeading = doc.createElement('div')
  panelHeading.dataset.pipControl = 'subtitle-panel-heading'
  const back = doc.createElement('button')
  back.type = 'button'
  back.dataset.pipControl = 'subtitle-back'
  back.dataset[PIP_CONTROL_MARKER] = 'true'
  const title = doc.createElement('span')
  title.dataset.pipControl = 'subtitle-panel-title'
  title.dataset.pipSubtitlePanelTitle = panel
  panelHeading.append(back, title)
  const options = doc.createElement('div')
  options.dataset.pipControl = 'subtitle-options'
  options.setAttribute('role', 'radiogroup')
  for (const option of values) {
    const label = doc.createElement('label')
    label.dataset.pipControl = 'subtitle-option'
    const radio = doc.createElement('input')
    radio.type = 'radio'
    radio.name = `shortcut-override-pip-subtitle-${panel}`
    radio.value = option
    radio.dataset[setting] = option
    radio.dataset[PIP_CONTROL_MARKER] = 'true'
    const text = doc.createElement('span')
    if (panel === 'size') text.dataset.pipSubtitleSizeLabel = option
    else text.dataset.pipSubtitleBackgroundLabel = option
    label.append(radio, text)
    options.append(label)
  }
  panelElement.append(panelHeading, options)
  return panelElement
}

const createMenuElement = (doc: Document): HTMLElement => {
  const menu = doc.createElement('div')
  menu.dataset.pipControl = 'subtitle-menu'
  menu.dataset[PIP_CONTROL_MARKER] = 'true'
  menu.dataset.open = 'false'
  menu.dataset.panel = 'main'
  menu.setAttribute('role', 'dialog')

  const mainPanel = doc.createElement('div')
  mainPanel.dataset.pipSubtitlePanel = 'main'
  mainPanel.dataset.active = 'true'
  const headingRow = doc.createElement('div')
  headingRow.dataset.pipControl = 'subtitle-heading-row'
  const heading = doc.createElement('span')
  heading.dataset.pipControl = 'subtitle-heading'
  const toggle = doc.createElement('button')
  toggle.type = 'button'
  toggle.dataset.pipControl = 'subtitle-switch'
  toggle.dataset[PIP_CONTROL_MARKER] = 'true'
  toggle.setAttribute('role', 'switch')
  headingRow.append(heading, toggle)

  const navList = doc.createElement('div')
  navList.dataset.pipControl = 'subtitle-nav-list'
  for (const panel of ['size', 'background'] as const) {
    const button = doc.createElement('button')
    button.type = 'button'
    button.dataset.pipSubtitleNav = panel
    button.dataset[PIP_CONTROL_MARKER] = 'true'
    const label = doc.createElement('span')
    label.dataset.pipSubtitleNavLabel = panel
    const value = doc.createElement('span')
    value.dataset.pipSubtitleNavValue = panel
    button.append(label, value)
    navList.append(button)
  }
  mainPanel.append(headingRow, navList)
  menu.append(
    mainPanel,
    createOptionsPanel(doc, 'size', ['small', 'medium', 'large'], 'pipSubtitleSize'),
    createOptionsPanel(
      doc,
      'background',
      ['none', 'translucent', 'dark'],
      'pipSubtitleBackground'
    )
  )
  return menu
}

class PipSubtitleMenu {
  readonly element: HTMLElement
  private readonly options: PipSubtitleMenuOptions
  private readonly cleanups: Array<() => void> = []
  private settings: PipSettings
  private copy: PipControlsCopy
  private panel: SubtitlePanel = 'main'
  private open = false

  constructor(options: PipSubtitleMenuOptions) {
    this.options = options
    this.settings = options.settings
    this.copy = options.copy
    this.element = createMenuElement(options.pipWindow.document)
  }

  get isOpen(): boolean {
    return this.open
  }

  start(): void {
    const toggle = this.element.querySelector<HTMLButtonElement>(
      '[data-pip-control="subtitle-switch"]'
    )
    this.listen(this.options.button, 'click', () => this.setOpen(!this.open))
    if (toggle) {
      this.listen(toggle, 'click', () => {
        this.emitSettings({
          ...this.settings,
          subtitlesEnabled: !this.settings.subtitlesEnabled,
        })
      })
    }
    for (const nav of this.element.querySelectorAll<HTMLButtonElement>('[data-pip-subtitle-nav]')) {
      this.listen(nav, 'click', () => {
        this.setPanel(nav.dataset.pipSubtitleNav as Exclude<SubtitlePanel, 'main'>, true)
      })
    }
    for (const heading of this.element.querySelectorAll<HTMLElement>(
      '[data-pip-control="subtitle-panel-heading"]'
    )) {
      this.listen(heading, 'click', () => this.setPanel('main', true))
    }
    for (const radio of this.element.querySelectorAll<HTMLInputElement>(
      '[data-pip-subtitle-size]'
    )) {
      this.listen(radio, 'change', () => {
        if (!radio.checked) return
        this.emitSettings({
          ...this.settings,
          subtitleSize: radio.value as PipSettings['subtitleSize'],
        })
        this.setPanel('main', true)
      })
    }
    for (const radio of this.element.querySelectorAll<HTMLInputElement>(
      '[data-pip-subtitle-background]'
    )) {
      this.listen(radio, 'change', () => {
        if (!radio.checked) return
        this.emitSettings({
          ...this.settings,
          subtitleBackground: radio.value as PipSettings['subtitleBackground'],
        })
        this.setPanel('main', true)
      })
    }
    this.listen(this.options.pipWindow.document, 'pointerdown', event => {
      if (!this.open) return
      const target = event.target as Node | null
      if (target && (this.element.contains(target) || this.options.button.contains(target))) return
      this.setOpen(false)
    }, true)
    this.listen(this.options.pipWindow, 'blur', () => {
      if (!this.open) return
      this.options.onWindowBlur()
      this.setOpen(false, false)
    })
    this.update(this.settings, this.copy)
  }

  update(settings: PipSettings, copy: PipControlsCopy): void {
    this.settings = settings
    this.copy = copy
    this.options.button.setAttribute('aria-label', copy.subtitles)
    this.options.button.title = copy.subtitles
    this.options.button.dataset.enabled = settings.subtitlesEnabled.toString()
    this.options.button.setAttribute('aria-pressed', settings.subtitlesEnabled.toString())
    this.sync()
  }

  handleEscape(): boolean {
    if (!this.open) return false
    if (this.panel === 'main') this.setOpen(false)
    else this.setPanel('main', true)
    return true
  }

  destroy(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup()
    this.open = false
    this.panel = 'main'
  }

  private listen(
    target: EventTarget,
    type: string,
    listener: EventListener,
    capture = false
  ): void {
    target.addEventListener(type, listener, capture)
    this.cleanups.push(() => target.removeEventListener(type, listener, capture))
  }

  private emitSettings(settings: PipSettings): void {
    this.update(settings, this.copy)
    this.options.onSettingsChange(settings)
  }

  private sync(): void {
    const { element: menu, copy, settings } = this
    menu.setAttribute('aria-label', copy.subtitles)
    const heading = menu.querySelector<HTMLElement>('[data-pip-control="subtitle-heading"]')
    if (heading) heading.textContent = copy.subtitlesEnabled
    const sizeLabels = {
      small: copy.subtitleSmall,
      medium: copy.subtitleMedium,
      large: copy.subtitleLarge,
    }
    const backgroundLabels = {
      none: copy.subtitleBackgroundNone,
      translucent: copy.subtitleBackgroundTranslucent,
      dark: copy.subtitleBackgroundDark,
    }
    const sizeNav = menu.querySelector<HTMLButtonElement>('[data-pip-subtitle-nav="size"]')
    const backgroundNav = menu.querySelector<HTMLButtonElement>(
      '[data-pip-subtitle-nav="background"]'
    )
    const sizeNavLabel = menu.querySelector<HTMLElement>('[data-pip-subtitle-nav-label="size"]')
    const sizeNavValue = menu.querySelector<HTMLElement>('[data-pip-subtitle-nav-value="size"]')
    const backgroundNavLabel = menu.querySelector<HTMLElement>(
      '[data-pip-subtitle-nav-label="background"]'
    )
    const backgroundNavValue = menu.querySelector<HTMLElement>(
      '[data-pip-subtitle-nav-value="background"]'
    )
    if (sizeNavLabel) sizeNavLabel.textContent = copy.subtitleFontSize
    if (sizeNavValue) sizeNavValue.textContent = sizeLabels[settings.subtitleSize]
    if (backgroundNavLabel) backgroundNavLabel.textContent = copy.subtitleBackground
    if (backgroundNavValue) {
      backgroundNavValue.textContent = backgroundLabels[settings.subtitleBackground]
    }
    sizeNav?.setAttribute('aria-label', `${copy.subtitleFontSize}: ${sizeLabels[settings.subtitleSize]}`)
    backgroundNav?.setAttribute(
      'aria-label',
      `${copy.subtitleBackground}: ${backgroundLabels[settings.subtitleBackground]}`
    )
    for (const panel of ['size', 'background'] as const) {
      const title = menu.querySelector<HTMLElement>(
        `[data-pip-subtitle-panel-title="${panel}"]`
      )
      if (title) {
        title.textContent = panel === 'size' ? copy.subtitleFontSize : copy.subtitleBackground
      }
    }
    for (const back of menu.querySelectorAll<HTMLButtonElement>(
      '[data-pip-control="subtitle-back"]'
    )) {
      back.setAttribute('aria-label', copy.back)
      back.title = copy.back
    }
    for (const size of ['small', 'medium', 'large'] as const) {
      const label = menu.querySelector<HTMLElement>(`[data-pip-subtitle-size-label="${size}"]`)
      const radio = menu.querySelector<HTMLInputElement>(`[data-pip-subtitle-size="${size}"]`)
      if (label) label.textContent = sizeLabels[size]
      if (radio) {
        radio.checked = settings.subtitleSize === size
        radio.setAttribute('aria-label', sizeLabels[size])
      }
    }
    for (const background of ['none', 'translucent', 'dark'] as const) {
      const label = menu.querySelector<HTMLElement>(
        `[data-pip-subtitle-background-label="${background}"]`
      )
      const radio = menu.querySelector<HTMLInputElement>(
        `[data-pip-subtitle-background="${background}"]`
      )
      if (label) label.textContent = backgroundLabels[background]
      if (radio) {
        radio.checked = settings.subtitleBackground === background
        radio.setAttribute('aria-label', backgroundLabels[background])
      }
    }
    const toggle = menu.querySelector<HTMLButtonElement>('[data-pip-control="subtitle-switch"]')
    toggle?.setAttribute('aria-checked', settings.subtitlesEnabled.toString())
    toggle?.setAttribute('aria-label', copy.subtitlesEnabled)
  }

  private setOpen(open: boolean, restoreFocus = true): void {
    this.open = open
    this.element.dataset.open = open.toString()
    this.options.button.setAttribute('aria-expanded', open.toString())
    if (open) this.setPanel('main')
    this.options.onOpenChange(open, restoreFocus)
  }

  private setPanel(panel: SubtitlePanel, restoreFocus = false): void {
    const previousPanel = this.panel
    this.panel = panel
    this.element.dataset.panel = panel
    for (const panelElement of this.element.querySelectorAll<HTMLElement>(
      '[data-pip-subtitle-panel]'
    )) {
      panelElement.dataset.active = (
        panelElement.dataset.pipSubtitlePanel === panel
      ).toString()
    }
    if (!restoreFocus) return
    const focusTarget =
      panel === 'main'
        ? this.element.querySelector<HTMLButtonElement>(
            `[data-pip-subtitle-nav="${previousPanel === 'background' ? 'background' : 'size'}"]`
          )
        : this.element.querySelector<HTMLInputElement>(
            panel === 'size'
              ? `[data-pip-subtitle-size="${this.settings.subtitleSize}"]`
              : `[data-pip-subtitle-background="${this.settings.subtitleBackground}"]`
          )
    focusTarget?.focus({ preventScroll: true })
  }
}

export const createPipSubtitleMenu = (options: PipSubtitleMenuOptions) =>
  new PipSubtitleMenu(options)
