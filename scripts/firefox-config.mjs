export const FIREFOX_ADDON_ID = 'shortcut-override-for-netflix@chengjj'

export const createFirefoxManifest = manifest => {
  const serviceWorker = manifest.background?.service_worker

  if (!serviceWorker) {
    throw new Error('Chromium manifest is missing background.service_worker.')
  }

  return {
    ...manifest,
    background: {
      scripts: [serviceWorker],
      type: manifest.background.type ?? 'module',
    },
    browser_specific_settings: {
      gecko: {
        id: FIREFOX_ADDON_ID,
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  }
}
