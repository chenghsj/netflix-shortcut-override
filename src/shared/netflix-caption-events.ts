export const CAPTION_REQUEST_EVENT = 'shortcut-override:caption-request'
export const CAPTION_RESPONSE_EVENT = 'shortcut-override:caption-response'

// Strings can cross Firefox's content-script/page boundary without cloneInto().
export function readCaptionEvent(event: Event): Record<string, unknown> | null {
  const detail = (event as CustomEvent<unknown>).detail
  if (typeof detail !== 'string') return null
  try {
    const value: unknown = JSON.parse(detail)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const message = value as Record<string, unknown>
    return message.source === 'shortcut-override' && typeof message.id === 'string'
      ? message : null
  } catch {
    return null
  }
}
