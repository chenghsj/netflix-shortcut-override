import { describe, expect, it } from 'vitest'

import { isPipDocument, markPipDocument } from './pip-document'

describe('PiP document', () => {
  it('recognizes a document after marking it as PiP', () => {
    const targetDoc = document.implementation.createHTMLDocument()
    expect(isPipDocument(targetDoc)).toBe(false)

    markPipDocument(targetDoc)

    expect(isPipDocument(targetDoc)).toBe(true)
  })
})
