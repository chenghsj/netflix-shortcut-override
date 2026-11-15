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
      // Close only a picker opened by this command, while the command still owns it.
      if (!success && openedPicker && isCurrent() && doc.location.pathname === watchPath) {
        const pane = doc.querySelector<HTMLElement>('[role="listbox"][aria-activedescendant^="selector-episode-option-"]') ?? openedPicker
        pane.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
      }
      resolve(success)
    }
    const enabled = (element: HTMLElement | null): element is HTMLElement => Boolean(element &&
      !element.matches(':disabled, [aria-disabled="true"]') && !element.closest('[hidden], [inert]'))
    const scan = () => {
      if (!isCurrent() || doc.location.pathname !== watchPath) return finish(false)
      if (direction === 1) {
        const next = doc.querySelector<HTMLElement>('[data-uia="control-next"], [data-uia="next-episode-seamless-button"], [data-uia="next-episode-seamless-button-draining"]')
        if (enabled(next)) {
          finish(true)
          next.click()
          return
        }
      }
      const current = doc.querySelector<HTMLElement>('[data-uia="episode-pane-item"][aria-selected="true"]')
      if (current && !current.closest('[aria-hidden="true"]')) {
        const episodes = Array.from(current.parentElement?.querySelectorAll<HTMLElement>('[data-uia="episode-pane-item"]') ?? [])
        const adjacent = episodes[episodes.indexOf(current) + direction]
        if (!enabled(adjacent)) return finish(false)
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
        const play = adjacent.querySelector<HTMLButtonElement>('button.play-button')
        const target = enabled(play) ? play : adjacent
        finish(true)
        target.click()
        return
      }
      const picker = doc.querySelector<HTMLElement>('[data-uia="control-episodes"]')
      if (!openedPicker && enabled(picker)) {
        openedPicker = picker
        picker.click()
      }
    }
    const observer = new MutationObserver(scan)
    observer.observe(doc, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected', 'aria-hidden', 'data-uia'] })
    const timeout = view.setTimeout(() => finish(false), 1500)
    // Controls can be unmounted while idle. Reveal them through the player UI.
    const root = doc.querySelector<HTMLElement>('.watch-video, [data-uia="player"]')
    if (root) {
      const rect = root.getBoundingClientRect()
      root.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 }))
    }
    scan()
  })
}
