export const FIREFOX_ADDON_ID = 'shortcut-override-for-netflix@chengjj'
export const FIREFOX_UPDATE_MANIFEST_FILENAME =
  'shortcut-override-for-netflix-firefox-updates.json'
export const FIREFOX_PACKAGE_PREFIX = 'shortcut-override-for-netflix-firefox'
export const DEFAULT_GITHUB_REPOSITORY = 'chenghsj/netflix-shortcut-override'

export const getRepository = () => process.env.GITHUB_REPOSITORY || DEFAULT_GITHUB_REPOSITORY

export const getFirefoxUpdateManifestUrl = (repository = getRepository()) =>
  `https://github.com/${repository}/releases/latest/download/${FIREFOX_UPDATE_MANIFEST_FILENAME}`

export const getFirefoxXpiName = version => `${FIREFOX_PACKAGE_PREFIX}-${version}.xpi`

export const getFirefoxXpiUrl = (repository, tag, version) =>
  `https://github.com/${repository}/releases/download/${tag}/${getFirefoxXpiName(version)}`

export const createFirefoxManifest = (manifest, repository = getRepository()) => {
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
        update_url: getFirefoxUpdateManifestUrl(repository),
      },
    },
  }
}

export const createFirefoxUpdateManifest = ({ repository, tag, version }) => ({
  addons: {
    [FIREFOX_ADDON_ID]: {
      updates: [
        {
          version,
          update_link: getFirefoxXpiUrl(repository, tag, version),
        },
      ],
    },
  },
})
