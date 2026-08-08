const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

type SvgAttributes = Readonly<Record<string, string | number>>

type SvgChildDefinition = {
  readonly tag: 'path' | 'rect' | 'text'
  readonly attributes?: SvgAttributes
  readonly text?: string
}

export type HintIcon = {
  readonly attributes: SvgAttributes
  readonly children: readonly SvgChildDefinition[]
}

export const createHintIcon = (
  attributes: SvgAttributes = {},
  children: readonly SvgChildDefinition[] = []
): HintIcon => ({ attributes, children })

const setSvgAttributes = (element: Element, attributes: SvgAttributes): void => {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value))
  }
}

export const renderHintIcon = (doc: Document, icon: HintIcon): SVGSVGElement => {
  const svg = doc.createElementNS(SVG_NAMESPACE, 'svg')
  setSvgAttributes(svg, icon.attributes)

  for (const childDefinition of icon.children) {
    const child = doc.createElementNS(SVG_NAMESPACE, childDefinition.tag)
    if (childDefinition.attributes) setSvgAttributes(child, childDefinition.attributes)
    if (childDefinition.text !== undefined) child.textContent = childDefinition.text
    svg.appendChild(child)
  }

  return svg
}

const rewindPath =
  'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z'
const forwardPath =
  'M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z'

const createSeekIcon = (path: string, seconds: number): HintIcon => {
  const label = Math.round(Math.abs(seconds)).toString()
  const fontSize = label.length >= 3 ? 6.5 : 8.5

  return createHintIcon(
    { viewBox: '0 0 24 24', width: 36, height: 36, fill: 'white' },
    [
      { tag: 'path', attributes: { d: path } },
      {
        tag: 'text',
        attributes: {
          'data-seek-label': 'true',
          x: 12,
          y: 16.5,
          'font-size': fontSize,
          'font-family': 'Arial Black, Arial, sans-serif',
          'font-weight': 900,
          'text-anchor': 'middle',
          fill: 'white',
          stroke: 'rgba(0, 0, 0, .9)',
          'stroke-width': 0.9,
          'stroke-linejoin': 'round',
          'paint-order': 'stroke fill',
        },
        text: label,
      },
    ]
  )
}

const createSeekDirectionIcon = (
  path: string,
  direction: 'backward' | 'forward'
): HintIcon =>
  createHintIcon(
    {
      'data-pip-icon': `seek-${direction}`,
      viewBox: '0 0 24 24',
      width: 36,
      height: 36,
      fill: 'white',
      'aria-hidden': 'true',
    },
    [{ tag: 'path', attributes: { d: path } }]
  )

export const mediaHintIcons = {
  play: createHintIcon(
    { viewBox: '0 0 24 24', width: 36, height: 36, fill: 'white' },
    [{ tag: 'path', attributes: { d: 'M8 5v14l11-7z' } }]
  ),
  pause: createHintIcon(
    { viewBox: '0 0 24 24', width: 36, height: 36, fill: 'white' },
    [
      { tag: 'rect', attributes: { x: 6, y: 5, width: 4, height: 14, rx: 2 } },
      { tag: 'rect', attributes: { x: 14, y: 5, width: 4, height: 14, rx: 2 } },
    ]
  ),
  playbackPlay: createHintIcon(
    {
      'data-hint-icon': 'playback-play',
      viewBox: '0 0 24 24',
      width: 56,
      height: 56,
      fill: 'white',
    },
    [
      {
        tag: 'path',
        attributes: {
          transform: 'translate(1.25 0)',
          d: 'M5.2 2.4C4.55 2.03 3.75 2.5 3.75 3.25v17.5c0 .75.8 1.22 1.45.85l15.5-8.75c.67-.38.67-1.34 0-1.72L5.2 2.4z',
        },
      },
    ]
  ),
  playbackPause: createHintIcon(
    {
      'data-hint-icon': 'playback-pause',
      viewBox: '0 0 24 24',
      width: 56,
      height: 56,
      fill: 'white',
    },
    [
      { tag: 'rect', attributes: { x: 5, y: 3, width: 5, height: 18, rx: 1.25 } },
      { tag: 'rect', attributes: { x: 14, y: 3, width: 5, height: 18, rx: 1.25 } },
    ]
  ),
  rewind: (seconds: number) => createSeekIcon(rewindPath, seconds),
  forward: (seconds: number) => createSeekIcon(forwardPath, seconds),
  rewindDirection: createSeekDirectionIcon(rewindPath, 'backward'),
  forwardDirection: createSeekDirectionIcon(forwardPath, 'forward'),
  volume: createHintIcon(
    {
      'data-hint-icon': 'volume-up',
      viewBox: '0 0 24 24',
      width: 48,
      height: 48,
      fill: 'white',
    },
    [
      {
        tag: 'path',
        attributes: {
          d: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
        },
      },
    ]
  ),
  volumeDown: createHintIcon(
    {
      'data-hint-icon': 'volume-down',
      viewBox: '0 0 24 24',
      width: 48,
      height: 48,
      fill: 'white',
    },
    [
      {
        tag: 'path',
        attributes: {
          d: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z',
        },
      },
    ]
  ),
  mute: createHintIcon(
    {
      'data-hint-icon': 'volume-mute',
      viewBox: '0 0 24 24',
      width: 48,
      height: 48,
      fill: 'white',
    },
    [
      {
        tag: 'path',
        attributes: {
          d: 'M12 4L9.91 6.09L12 8.18M4.27 3L3 4.27L7.73 9H3v6h4l5 5v-6.73l4.25 4.26c-.67.51-1.42.93-2.25 1.17v2.07c1.38-.32 2.63-.95 3.68-1.81L19.73 21L21 19.73l-9-9M19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.9 8.9 0 0 0 21 12c0-4.28-3-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71m-2.5 0c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.05-.2.05-.42.05-.63',
        },
      },
    ]
  ),
  speed: createHintIcon(
    {
      viewBox: '0 0 24 24',
      width: 36,
      height: 36,
      fill: 'none',
      stroke: 'white',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [
      { tag: 'path', attributes: { d: 'M4 14a8 8 0 0 1 16 0' } },
      { tag: 'path', attributes: { d: 'M12 14l4-4' } },
      { tag: 'path', attributes: { d: 'M6.5 18h11' } },
    ]
  ),
  holdSpeed: createHintIcon(
    {
      'data-hint-icon': 'hold-speed',
      viewBox: '0 0 24 24',
      width: 18,
      height: 18,
      fill: 'white',
    },
    [
      {
        tag: 'path',
        attributes: {
          d: 'M4 5v14l9-7-9-7zM11 5v14l9-7-9-7z',
          stroke: 'white',
          'stroke-width': 0.8,
          'stroke-linejoin': 'round',
        },
      },
    ]
  ),
  speedUp: createHintIcon(
    {
      'data-hint-icon': 'speed-up',
      viewBox: '0 0 24 24',
      width: 56,
      height: 56,
      fill: 'white',
      stroke: 'white',
      'stroke-width': 1.4,
      'stroke-linejoin': 'round',
    },
    [{ tag: 'path', attributes: { d: 'M5 5v14l8-7-8-7zM14 5v14l8-7-8-7z' } }]
  ),
  speedDown: createHintIcon(
    {
      'data-hint-icon': 'speed-down',
      viewBox: '0 0 24 24',
      width: 56,
      height: 56,
      fill: 'white',
      stroke: 'white',
      'stroke-width': 1.4,
      'stroke-linejoin': 'round',
    },
    [{ tag: 'path', attributes: { d: 'M19 5v14l-8-7 8-7zM10 5v14l-8-7 8-7z' } }]
  ),
  subtitles: createHintIcon(
    {
      'data-hint-icon': 'subtitles',
      'data-pip-icon': 'subtitles',
      viewBox: '0 0 26 24',
      width: 56,
      height: 56,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    [
      {
        tag: 'rect',
        attributes: {
          'data-pip-icon-part': 'subtitle-frame',
          x: 2,
          y: 3,
          width: 22,
          height: 18,
          rx: 3,
        },
      },
      {
        tag: 'path',
        attributes: {
          'data-pip-icon-part': 'subtitle-lines',
          d: 'M6 11.5h7.5M16 11.5h4M6 16.5h3.5M12.5 16.5H20',
        },
      },
    ]
  ),
  fullscreen: createHintIcon(
    {
      viewBox: '0 0 24 24',
      width: 36,
      height: 36,
      fill: 'none',
      stroke: 'white',
      'stroke-width': 2,
    },
    [
      { tag: 'path', attributes: { d: 'M8 3H3v5' } },
      { tag: 'path', attributes: { d: 'M16 3h5v5' } },
      { tag: 'path', attributes: { d: 'M8 21H3v-5' } },
      { tag: 'path', attributes: { d: 'M16 21h5v-5' } },
    ]
  ),
}

export type HintRequest =
  | { type: 'media'; icon: HintIcon; label: string }
  | { type: 'playback'; icon: HintIcon; color?: string }
  | { type: 'volume'; icon: HintIcon; label: string }
  | { type: 'speed'; icon: HintIcon; label: string }
  | { type: 'seek'; direction: -1 | 1; seconds: number }
  | { type: 'spaceHold'; label: string }

export interface HintManager {
  show(request: HintRequest): void
  hide(): void
  destroy(): void
}
