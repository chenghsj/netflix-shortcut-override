import { useSyncExternalStore } from 'react'

const query = '(max-width: 767px)'
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia?.(query)
  media?.addEventListener('change', onChange)
  return () => media?.removeEventListener('change', onChange)
}
const getSnapshot = () => window.matchMedia?.(query).matches ?? false

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
