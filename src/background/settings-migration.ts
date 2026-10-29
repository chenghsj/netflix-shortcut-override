import { initializeUiStyleDefault } from '@/shared/storage'

export const registerSettingsMigration = () => {
  const initialize = (reason?: 'install' | 'update') => {
    void initializeUiStyleDefault(reason).catch(error => {
      console.error('Unable to initialize appearance preference', error)
    })
  }
  chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install' || details.reason === 'update') initialize(details.reason)
  })
  initialize()
}
