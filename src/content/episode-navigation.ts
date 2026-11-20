import { isVisibleElement } from './dom-utils'

const EPISODE_NAVIGATION_TIMEOUT_MS = 1500
const VISIBILITY_CHECK_INTERVAL_MS = 100

const isShown = (element: HTMLElement): boolean => {
  if (element.closest('[hidden], [aria-hidden="true"], [inert]') || !isVisibleElement(element)) return false

  const view = element.ownerDocument.defaultView
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (view?.getComputedStyle(parent).opacity === '0') return false
  }
  return true
}

const isAvailable = (element: HTMLElement | undefined): element is HTMLElement => Boolean(
  element && !element.matches(':disabled') && !element.closest('[aria-disabled="true"]') && isShown(element),
)

// Netflix exposes a next control and an episode picker, but no previous control.
// Use the picker’s selected episode and adjacent row; never infer IDs or use history.
export const navigateEpisode = (
  targetDoc: Document,
  direction: -1 | 1,
  isCurrent: () => boolean,
): Promise<boolean> => {
  const doc = targetDoc === document ? targetDoc : document
  const watchPath = doc.location.pathname
  const view = doc.defaultView
  if (!view || !/^\/watch\/[^/]+/.test(watchPath)) return Promise.resolve(false)

  return new Promise(resolve => {
    let openedPicker: HTMLElement | undefined
    let expandingEpisode: HTMLElement | undefined
    let finished = false
    const finish = (success: boolean) => {
      if (finished) return
      finished = true
      observer.disconnect()
      view.clearTimeout(timeout)
      view.clearInterval(visibilityTimer)
      // Close only a picker opened by this command, while the command still owns it.
      if (!success && openedPicker && isCurrent() && doc.location.pathname === watchPath) {
        const panes = doc.querySelectorAll<HTMLElement>('[role="listbox"][aria-activedescendant^="selector-episode-option-"]')
        const pane = Array.from(panes).find(isShown) ?? openedPicker
        pane.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
      }
      resolve(success)
    }
    const scan = () => {
      if (!isCurrent() || doc.location.pathname !== watchPath) return finish(false)
      if (direction === 1) {
        const nextControls = doc.querySelectorAll<HTMLElement>('[data-uia="control-next"], [data-uia="next-episode-seamless-button"], [data-uia="next-episode-seamless-button-draining"]')
        const next = Array.from(nextControls).find(isAvailable)
        if (next) {
          finish(true)
          next.click()
          return
        }
      }
      const selectedRows = doc.querySelectorAll<HTMLElement>('[data-uia="episode-pane-item"][aria-selected="true"]')
      const current = Array.from(selectedRows).find(isShown)
      if (current) {
        const episodes = Array.from(current.parentElement?.querySelectorAll<HTMLElement>('[data-uia="episode-pane-item"]') ?? [])
        const adjacent = episodes[episodes.indexOf(current) + direction]
        // The picker can select the current row before its neighbor is ready.
        if (!isAvailable(adjacent)) return
        // Netflix's newer picker selects rows on pointerdown, not click. A
        // closed row first expands its preview; only the next press plays it.
        const preview = adjacent.querySelector<HTMLElement>('[data-uia="episode-pane-item-preview-open"], [data-uia="episode-pane-item-preview-closed"]')
        if (preview) {
          const press = () => adjacent.dispatchEvent(new view.PointerEvent('pointerdown', {
            bubbles: true, cancelable: true, pointerType: 'mouse', button: 0, isPrimary: true,
          }))
          if (preview.dataset.uia === 'episode-pane-item-preview-closed') {
            if (expandingEpisode !== adjacent) {
              expandingEpisode = adjacent
              press()
            }
            return
          }
          finish(true)
          press()
          return
        }
        const playButtons = adjacent.querySelectorAll<HTMLButtonElement>('button.play-button')
        const target = playButtons.length ? Array.from(playButtons).find(isAvailable) : adjacent
        if (!target) return
        finish(true)
        target.click()
        return
      }
      if (openedPicker) return
      const pickers = doc.querySelectorAll<HTMLElement>('[data-uia="control-episodes"]')
      const picker = Array.from(pickers).find(isAvailable)
      if (picker) {
        openedPicker = picker
        picker.click()
      }
    }
    const observer = new MutationObserver(scan)
    observer.observe(doc, {
      subtree: true,
      childList: true,
      attributeFilter: ['aria-selected', 'aria-hidden', 'data-uia', 'disabled', 'aria-disabled', 'hidden', 'inert', 'class', 'style'],
    })
    // CSS transitions can reveal a control without changing the DOM.
    const visibilityTimer = view.setInterval(scan, VISIBILITY_CHECK_INTERVAL_MS)
    const timeout = view.setTimeout(() => finish(false), EPISODE_NAVIGATION_TIMEOUT_MS)
    // Controls can be unmounted while idle. Reveal them through the player UI.
    const root = doc.querySelector<HTMLElement>('.watch-video, [data-uia="player"]')
    if (root) {
      const rect = root.getBoundingClientRect()
      root.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 }))
    }
    scan()
  })
}
