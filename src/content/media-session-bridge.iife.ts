import { installMediaSessionBridge } from './media-session-bridge'
import { MEDIA_SESSION_READY_EVENT } from '@/shared/media-session-events'

const page = window as typeof window & { __shortcutOverrideMediaSessionBridge?: AbortController }

// Keep the document's original handler registrations if the script is reinjected.
if (page.__shortcutOverrideMediaSessionBridge?.signal.aborted === false) {
  window.dispatchEvent(new Event(MEDIA_SESSION_READY_EVENT))
} else {
  const lifetime = new AbortController()
  page.__shortcutOverrideMediaSessionBridge = lifetime
  installMediaSessionBridge(lifetime.signal)
}
