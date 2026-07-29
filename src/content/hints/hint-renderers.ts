import {
  HINT_ENTER_TRANSITION,
  HINT_EXIT_TRANSFORM,
  HINT_EXIT_TRANSITION,
  HINT_HIDDEN_TRANSFORM,
  HINT_VISIBLE_OPACITY,
  HINT_VISIBLE_TRANSFORM,
  MEDIA_HINT_ID,
  PLAYBACK_HINT_ENTER_TRANSITION,
  PLAYBACK_HINT_EXIT_MS,
  PLAYBACK_HINT_EXIT_TRANSFORM,
  PLAYBACK_HINT_EXIT_TRANSITION,
  PLAYBACK_HINT_HIDDEN_TRANSFORM,
  PLAYBACK_HINT_ID,
  PLAYBACK_HINT_TOTAL_DURATION_MS,
  PLAYBACK_HINT_VISIBLE_TRANSFORM,
  SEEK_ACCUMULATION_WINDOW_MS,
  SEEK_HINT_ENTER_TRANSITION,
  SEEK_HINT_EXIT_TRANSITION,
  SEEK_HINT_ID,
  SEEK_HINT_OUTER_TRANSFORM,
  SPACE_HOLD_HINT_ENTER_TRANSITION,
  SPACE_HOLD_HINT_HIDDEN_TRANSFORM,
  SPACE_HOLD_HINT_ID,
  SPACE_HOLD_HINT_VISIBLE_TRANSFORM,
  SPEED_HINT_ID,
  SPEED_HINT_LABEL_ID,
  TRANSIENT_HINT_VISIBLE_DURATION_MS,
  VOLUME_HINT_ID,
  VOLUME_HINT_LABEL_ENTER_TRANSITION,
  VOLUME_HINT_LABEL_EXIT_TRANSFORM,
  VOLUME_HINT_LABEL_EXIT_TRANSITION,
  VOLUME_HINT_LABEL_HIDDEN_TRANSFORM,
  VOLUME_HINT_LABEL_ID,
  VOLUME_HINT_LABEL_VISIBLE_TRANSFORM,
} from './hint-constants'
import { mediaHintIcons, type HintIcon, type HintRequest } from './hint-definitions'
import {
  getHintTransform,
  positionCenteredHint,
  positionLabeledHintLabel,
  positionSeekHint,
  positionSpaceHoldHint,
  setStyles,
  type StyleMap,
} from './hint-layout'

export type SeekSeries = {
  direction: -1 | 1
  seconds: number
  updatedAt: number
}

export type HintRendererContext = {
  readonly renderDoc: Document
  readonly responsive: boolean
  getRoot: () => HTMLElement | null
  createRoot: (id: string, styles: StyleMap) => HTMLElement
  scheduleExit: (delay: number, callback: () => void) => void
}

const getTransform = (context: HintRendererContext, transform: string): string =>
  getHintTransform(context.responsive, transform)

const isHTMLElementInDocument = (
  element: Element | null,
  ownerDocument: Document
): element is HTMLElement => {
  const HTMLElementConstructor = ownerDocument.defaultView?.HTMLElement
  return Boolean(HTMLElementConstructor && element instanceof HTMLElementConstructor)
}

const scheduleMediaExit = (context: HintRendererContext, root: HTMLElement): void => {
  context.scheduleExit(TRANSIENT_HINT_VISIBLE_DURATION_MS, () => {
    root.style.transition = HINT_EXIT_TRANSITION
    root.style.opacity = '0'
    root.style.transform = getTransform(context, HINT_EXIT_TRANSFORM)
  })
}

export const renderMediaHint = (
  context: HintRendererContext,
  request: Extract<HintRequest, { type: 'media' }>
): void => {
  const root = context.getRoot()
  const visibleRoot =
    root?.isConnected && root.id === MEDIA_HINT_ID && root.style.opacity === HINT_VISIBLE_OPACITY
      ? root
      : null
  const existingIcon = visibleRoot?.firstElementChild as HTMLElement | null
  const existingLabel = visibleRoot?.lastElementChild as HTMLElement | null

  if (visibleRoot && existingIcon && existingLabel) {
    existingIcon.innerHTML = request.icon.html
    existingLabel.textContent = request.label
    positionCenteredHint(visibleRoot, context.renderDoc)
    scheduleMediaExit(context, visibleRoot)
    return
  }

  const nextRoot = context.createRoot(MEDIA_HINT_ID, {
    position: 'fixed',
    top: '0',
    left: '0',
    transform: getTransform(context, HINT_HIDDEN_TRANSFORM),
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    gap: '8px',
    padding: '20px 32px',
    borderRadius: '12px',
    background: 'rgba(48,48,48,0.6)',
    color: 'white',
    fontFamily: 'sans-serif',
    pointerEvents: 'none',
    zIndex: '2147483647',
    opacity: '0',
    transition: HINT_ENTER_TRANSITION,
    willChange: 'opacity,transform',
  })
  const icon = context.renderDoc.createElement('div')
  icon.innerHTML = request.icon.html
  icon.style.color = 'white'
  const label = context.renderDoc.createElement('span')
  label.textContent = request.label
  setStyles(label, { fontSize: '13px', fontWeight: '600', letterSpacing: '0.03em' })
  nextRoot.replaceChildren(icon, label)
  positionCenteredHint(nextRoot, context.renderDoc)
  nextRoot.style.visibility = 'visible'
  nextRoot.style.opacity = '0'
  nextRoot.style.transform = getTransform(context, HINT_HIDDEN_TRANSFORM)
  void nextRoot.offsetWidth
  nextRoot.style.opacity = HINT_VISIBLE_OPACITY
  nextRoot.style.transform = getTransform(context, HINT_VISIBLE_TRANSFORM)
  scheduleMediaExit(context, nextRoot)
}

export const renderPlaybackHint = (
  context: HintRendererContext,
  request: Extract<HintRequest, { type: 'playback' }>
): void => {
  const root = context.createRoot(PLAYBACK_HINT_ID, {
    position: 'fixed',
    top: '0',
    left: '0',
    transform: getTransform(context, PLAYBACK_HINT_HIDDEN_TRANSFORM),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100px',
    height: '100px',
    boxSizing: 'border-box',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.68)',
    color: 'white',
    pointerEvents: 'none',
    zIndex: '2147483647',
    opacity: '0',
    transition: PLAYBACK_HINT_ENTER_TRANSITION,
    willChange: 'opacity,transform',
  })
  const icon = context.renderDoc.createElement('div')
  icon.innerHTML = request.icon.html
  setStyles(icon, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '0',
  })
  root.replaceChildren(icon)
  positionCenteredHint(root, context.renderDoc)
  root.style.visibility = 'visible'
  root.style.opacity = '0'
  root.style.transform = getTransform(context, PLAYBACK_HINT_HIDDEN_TRANSFORM)
  void root.offsetWidth
  root.style.opacity = '1'
  root.style.transform = getTransform(context, PLAYBACK_HINT_VISIBLE_TRANSFORM)
  context.scheduleExit(PLAYBACK_HINT_TOTAL_DURATION_MS - PLAYBACK_HINT_EXIT_MS, () => {
    root.style.transition = PLAYBACK_HINT_EXIT_TRANSITION
    root.style.opacity = '0'
    root.style.transform = getTransform(context, PLAYBACK_HINT_EXIT_TRANSFORM)
  })
}

const scheduleLabeledHintExit = (
  context: HintRendererContext,
  root: HTMLElement,
  circle: HTMLElement,
  label: HTMLElement
): void => {
  context.scheduleExit(TRANSIENT_HINT_VISIBLE_DURATION_MS, () => {
    root.style.transition = PLAYBACK_HINT_EXIT_TRANSITION
    root.style.opacity = '0'
    circle.style.transition = PLAYBACK_HINT_EXIT_TRANSITION
    circle.style.transform = getTransform(context, PLAYBACK_HINT_EXIT_TRANSFORM)
    label.style.transition = VOLUME_HINT_LABEL_EXIT_TRANSITION
    label.style.opacity = '0'
    label.style.transform = getTransform(context, VOLUME_HINT_LABEL_EXIT_TRANSFORM)
  })
}

const renderLabeledHint = (
  context: HintRendererContext,
  request: { icon: HintIcon; label: string },
  hintId: string,
  labelId: string,
  zIndex = '2147483647'
): void => {
  const compactPipSpeedHint = context.responsive && hintId === SPEED_HINT_ID
  const root = context.getRoot()
  const visibleRoot = root?.isConnected && root.id === hintId && root.style.opacity === '1' ? root : null
  const existingCircle = visibleRoot?.firstElementChild ?? null
  const existingIcon = existingCircle?.firstElementChild as HTMLElement | null
  const existingLabel = visibleRoot?.querySelector<HTMLElement>(`#${labelId}`)

  if (
    visibleRoot &&
    isHTMLElementInDocument(existingCircle, context.renderDoc) &&
    existingIcon &&
    existingLabel
  ) {
    existingIcon.innerHTML = request.icon.html
    existingLabel.textContent = request.label
    positionCenteredHint(existingCircle, context.renderDoc)
    positionLabeledHintLabel(existingLabel)
    scheduleLabeledHintExit(context, visibleRoot, existingCircle, existingLabel)
    return
  }

  const nextRoot = context.createRoot(hintId, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    background: 'transparent',
    color: 'white',
    pointerEvents: 'none',
    zIndex,
    opacity: '0',
    transition: PLAYBACK_HINT_ENTER_TRANSITION,
    willChange: 'opacity,transform',
  })

  const circle = context.renderDoc.createElement('div')
  setStyles(circle, {
    position: 'absolute',
    top: '0',
    left: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: compactPipSpeedHint ? '86px' : '100px',
    height: compactPipSpeedHint ? '86px' : '100px',
    boxSizing: 'border-box',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.68)',
    color: 'white',
    pointerEvents: 'none',
    opacity: '1',
    transform: getTransform(context, PLAYBACK_HINT_HIDDEN_TRANSFORM),
    transition: PLAYBACK_HINT_ENTER_TRANSITION,
    willChange: 'opacity,transform',
  })
  const icon = context.renderDoc.createElement('div')
  icon.innerHTML = request.icon.html
  setStyles(icon, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '0',
    transform: compactPipSpeedHint ? 'scale(0.82)' : 'none',
    transformOrigin: 'center',
  })
  circle.append(icon)

  const label = context.renderDoc.createElement('div')
  label.id = labelId
  label.textContent = request.label
  setStyles(label, {
    position: 'absolute',
    left: '50%',
    top: '10%',
    transform: getTransform(context, VOLUME_HINT_LABEL_HIDDEN_TRANSFORM),
    transformOrigin: 'top center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    minWidth: compactPipSpeedHint ? '64px' : '74px',
    minHeight: compactPipSpeedHint ? '38px' : '44px',
    padding: compactPipSpeedHint ? '6px 10px' : '8px 12px',
    borderRadius: '4px',
    background: 'rgba(33,33,33,0.92)',
    color: 'white',
    fontFamily: 'Arial,sans-serif',
    fontSize: compactPipSpeedHint ? '16px' : '18px',
    fontWeight: '400',
    lineHeight: compactPipSpeedHint ? '22px' : '24px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: '2147483647',
    opacity: '0',
    transition: VOLUME_HINT_LABEL_ENTER_TRANSITION,
    willChange: 'opacity,transform',
  })
  nextRoot.replaceChildren(circle, label)

  positionCenteredHint(circle, context.renderDoc)
  positionLabeledHintLabel(label)
  nextRoot.style.visibility = 'visible'
  nextRoot.style.opacity = '0'
  circle.style.transform = getTransform(context, PLAYBACK_HINT_HIDDEN_TRANSFORM)
  label.style.opacity = '0'
  label.style.transform = getTransform(context, VOLUME_HINT_LABEL_HIDDEN_TRANSFORM)
  void nextRoot.offsetWidth
  nextRoot.style.opacity = '1'
  circle.style.transform = getTransform(context, PLAYBACK_HINT_VISIBLE_TRANSFORM)
  label.style.opacity = '1'
  label.style.transform = getTransform(context, VOLUME_HINT_LABEL_VISIBLE_TRANSFORM)
  scheduleLabeledHintExit(context, nextRoot, circle, label)
}

export const renderVolumeHint = (
  context: HintRendererContext,
  request: Extract<HintRequest, { type: 'volume' }>
): void => renderLabeledHint(context, request, VOLUME_HINT_ID, VOLUME_HINT_LABEL_ID)

export const renderSpeedHint = (
  context: HintRendererContext,
  request: Extract<HintRequest, { type: 'speed' }>
): void =>
  renderLabeledHint(
    context,
    request,
    SPEED_HINT_ID,
    SPEED_HINT_LABEL_ID,
    context.responsive ? '9' : '2147483647'
  )

const updateSeekLabel = (
  renderDoc: Document,
  label: HTMLElement,
  direction: -1 | 1,
  seconds: number
): void => {
  let sign = label.querySelector<HTMLElement>('[data-seek-sign]')
  let value = label.querySelector<HTMLElement>('[data-seek-value]')

  if (!sign || !value) {
    sign = renderDoc.createElement('span')
    value = renderDoc.createElement('span')
    sign.dataset.seekSign = 'true'
    value.dataset.seekValue = 'true'
    label.replaceChildren(sign, value)
  }

  setStyles(sign, {
    display: 'inline-block',
    fontSize: direction > 0 ? '24px' : '22px',
    lineHeight: '1',
    transform: 'none',
  })
  sign.textContent = direction > 0 ? '+' : '−'
  value.textContent = seconds.toString()
}

const scheduleSeekExit = (context: HintRendererContext, root: HTMLElement): void => {
  context.scheduleExit(TRANSIENT_HINT_VISIBLE_DURATION_MS, () => {
    root.style.transition = SEEK_HINT_EXIT_TRANSITION
    root.style.opacity = '0'
  })
}

export const renderSeekHint = (
  context: HintRendererContext,
  request: Extract<HintRequest, { type: 'seek' }>,
  previousSeries: SeekSeries | null
): SeekSeries => {
  const now = Date.now()
  const continuesSeries =
    previousSeries !== null &&
    previousSeries.direction === request.direction &&
    now - previousSeries.updatedAt <= SEEK_ACCUMULATION_WINDOW_MS
  const seconds = continuesSeries
    ? previousSeries.seconds + Math.abs(request.seconds)
    : Math.abs(request.seconds)
  const nextSeries = { direction: request.direction, seconds, updatedAt: now }

  const root = context.getRoot()
  const visibleRoot =
    continuesSeries &&
    root?.isConnected &&
    root.id === SEEK_HINT_ID &&
    root.dataset.seekDirection === request.direction.toString()
      ? root
      : null
  const existingContent = visibleRoot?.querySelector<HTMLElement>('[data-hint-content="seek"]')
  const existingLabel = existingContent?.querySelector<HTMLElement>('span')

  if (visibleRoot && existingContent && existingLabel) {
    visibleRoot.dataset.seekAccumulatedSeconds = seconds.toString()
    updateSeekLabel(context.renderDoc, existingLabel, request.direction, seconds)
    positionSeekHint(visibleRoot, context.renderDoc, context.responsive, request.direction)
    visibleRoot.style.visibility = 'visible'
    visibleRoot.style.transition = SEEK_HINT_ENTER_TRANSITION
    visibleRoot.style.opacity = '1'
    scheduleSeekExit(context, visibleRoot)
    return nextSeries
  }

  const nextRoot = context.createRoot(SEEK_HINT_ID, {
    position: 'fixed',
    top: '0',
    left: '0',
    transform: getTransform(context, SEEK_HINT_OUTER_TRANSFORM),
    transformOrigin: request.direction > 0 ? 'right center' : 'left center',
    display: 'block',
    color: 'white',
    pointerEvents: 'none',
    zIndex: '2147483647',
    opacity: '0',
    transition: SEEK_HINT_ENTER_TRANSITION,
    willChange: 'opacity',
  })
  nextRoot.dataset.seekDirection = request.direction.toString()
  nextRoot.dataset.seekAccumulatedSeconds = seconds.toString()
  const content = context.renderDoc.createElement('div')
  content.dataset.hintContent = 'seek'
  setStyles(content, {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexDirection: request.direction > 0 ? 'row' : 'row-reverse',
    fontFamily: 'Arial,sans-serif',
    fontSize: '22px',
    fontWeight: '700',
    lineHeight: '28px',
    whiteSpace: 'nowrap',
  })
  const label = context.renderDoc.createElement('span')
  setStyles(label, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '28px',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  })
  updateSeekLabel(context.renderDoc, label, request.direction, seconds)
  const icon = context.renderDoc.createElement('div')
  setStyles(icon, {
    display: 'flex',
    alignItems: 'center',
    lineHeight: '0',
    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))',
  })
  const path = request.direction > 0 ? 'M2 3l9 9-9 9' : 'M13 3l-9 9 9 9'
  icon.innerHTML = `<svg data-hint-icon="${request.direction > 0 ? 'seek-forward' : 'seek-backward'}" data-seek-arrow-count="1" viewBox="0 0 17 24" width="21" height="30" fill="none" stroke="white" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`
  content.append(label, icon)
  nextRoot.replaceChildren(content)
  positionSeekHint(nextRoot, context.renderDoc, context.responsive, request.direction)
  nextRoot.style.visibility = 'visible'
  nextRoot.style.opacity = '0'
  void nextRoot.offsetWidth
  nextRoot.style.opacity = '1'
  scheduleSeekExit(context, nextRoot)
  return nextSeries
}

export const renderSpaceHoldHint = (
  context: HintRendererContext,
  request: Extract<HintRequest, { type: 'spaceHold' }>
): void => {
  const compactPipHint = context.responsive
  const root = context.createRoot(SPACE_HOLD_HINT_ID, {
    position: 'fixed',
    top: '0',
    left: '0',
    transform: getTransform(context, SPACE_HOLD_HINT_HIDDEN_TRANSFORM),
    transformOrigin: 'top center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: compactPipHint ? '4px' : '6px',
    boxSizing: 'border-box',
    minHeight: compactPipHint ? '28px' : '32px',
    padding: compactPipHint ? '4px 9px 4px 10px' : '6px 12px 6px 14px',
    borderRadius: '999px',
    background: 'rgba(33,33,33,0.92)',
    color: 'white',
    fontFamily: 'Arial,sans-serif',
    fontSize: compactPipHint ? '12px' : '14px',
    fontWeight: '600',
    lineHeight: compactPipHint ? '16px' : '20px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: context.responsive ? '9' : '2147483647',
    opacity: '0',
    transition: SPACE_HOLD_HINT_ENTER_TRANSITION,
    willChange: 'opacity,transform',
  })
  const label = context.renderDoc.createElement('span')
  label.textContent = request.label
  const icon = context.renderDoc.createElement('div')
  icon.innerHTML = mediaHintIcons.holdSpeed
  setStyles(icon, {
    display: 'flex',
    alignItems: 'center',
    lineHeight: '0',
    transform: compactPipHint ? 'scale(0.82)' : 'none',
    transformOrigin: 'center',
  })
  root.replaceChildren(label, icon)
  positionSpaceHoldHint(root, context.renderDoc)
  root.style.visibility = 'visible'
  root.style.opacity = '0'
  root.style.transform = getTransform(context, SPACE_HOLD_HINT_HIDDEN_TRANSFORM)
  void root.offsetWidth
  root.style.opacity = '1'
  root.style.transform = getTransform(context, SPACE_HOLD_HINT_VISIBLE_TRANSFORM)
}
