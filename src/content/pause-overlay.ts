const STYLE_ID = 'shortcut-override-pause-overlay'

export const applyPauseOverlayVisibility = (targetDoc: Document, hide: boolean): void => {
  if (!hide) {
    targetDoc.getElementById(STYLE_ID)?.remove()
    return
  }
  if (targetDoc.getElementById(STYLE_ID)) return

  // Netflix inserts this idle information layer and its dark backdrop after
  // pausing. CSS also covers later insertions and replacement watch players,
  // independent of whether Netflix, a shortcut or PiP requested the pause.
  const style = targetDoc.createElement('style')
  style.id = STYLE_ID
  style.textContent = `:is(.watch-video, [data-uia="watch-video"]) :is(
    .watch-video--evidence-overlay-container,
    [data-uia="evidence-overlay"]
  ) { display: none !important; }`
  targetDoc.documentElement.append(style)
}
