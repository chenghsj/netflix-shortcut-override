const PIP_DOCUMENT_MARKER = 'shortcutOverridePip'

export const markPipDocument = (targetDoc: Document): void => {
  targetDoc.documentElement.dataset[PIP_DOCUMENT_MARKER] = 'true'
}

export const isPipDocument = (targetDoc: Document): boolean =>
  targetDoc.documentElement.dataset[PIP_DOCUMENT_MARKER] === 'true'
