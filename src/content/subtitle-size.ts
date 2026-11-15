import { subtitleSizePercent } from '@/shared/subtitle-size-shortcuts'
import type { SubtitleSize } from '@/shared/shortcut-types'

const STYLE_ID = 'shortcut-override-subtitle-size'
const SIZE_ATTRIBUTE = 'data-shortcut-override-subtitle-size'

// Keep this stylesheet in the source document. PiP uses its own typography
// settings, and cloning captions must not apply the source scale a second time.
export const applySubtitleSize = (targetDoc: Document, size: SubtitleSize): void => {
  if (subtitleSizePercent(size) === 100) {
    targetDoc.documentElement.removeAttribute(SIZE_ATTRIBUTE)
    targetDoc.getElementById(STYLE_ID)?.remove()
    return
  }

  let style = targetDoc.getElementById(STYLE_ID)
  if (!style) {
    style = targetDoc.createElement('style')
    style.id = STYLE_ID
    targetDoc.documentElement.append(style)
  }
  // Resize the caption contents so Netflix's outer positioning and centering
  // transforms still operate on the resulting text dimensions. Scaling the
  // positioned container itself would also scale its translation and shift it.
  style.textContent = `html[${SIZE_ATTRIBUTE}] :is(
    .player-timedtext-text-container > span,
    .player-timedtext:not(:has(.player-timedtext-text-container)) > span,
    [data-uia="subtitle-text"]:not(:has(.player-timedtext-text-container)) > span
  ) { zoom: ${subtitleSizePercent(size) / 100} !important; }`
  targetDoc.documentElement.setAttribute(SIZE_ATTRIBUTE, String(size))
}
