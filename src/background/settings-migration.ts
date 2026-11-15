import { initializeSettingsCompatibility, initializeUiStyleDefault } from '@/shared/storage'

export const registerSettingsMigration = () => {
  void initializeSettingsCompatibility().catch(error => {
    console.error('Unable to preserve settings compatibility', error)
  })
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
