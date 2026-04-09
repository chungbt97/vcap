import { describe, it, expect, vi, beforeEach } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'

vi.mock('./idb.js', () => ({
  readAllChunks: vi.fn(),
  clearChunks: vi.fn(),
}))

vi.mock('./markdownBuilder.js', () => ({
  buildMarkdown: vi.fn(() => '## Bug Report'),
}))

vi.mock('./curlBuilder.js', () => ({
  buildCurl: vi.fn((err) => `curl -X ${err.method} '${err.url}'`),
}))

import { readAllChunks, clearChunks } from './idb.js'
import { buildMarkdown } from './markdownBuilder.js'
import { exportSession } from './zipExporter.js'

const makeVideoBlob = (bytes = new Uint8Array([1, 2, 3])) => ({
  arrayBuffer: async () => bytes.buffer,
})

const SESSION = {
  steps: [{ index: 1, timestamp: '0s', type: 'click', target: 'button' }],
  apiErrors: [{ method: 'GET', url: 'https://example.com/api', status: 500, timestamp: '1s', requestHeaders: {} }],
  consoleErrors: [],
  date: '2026-04-09',
}

let capturedBlob
let capturedFilename

beforeEach(() => {
  vi.clearAllMocks()
  capturedBlob = null
  capturedFilename = null

  readAllChunks.mockResolvedValue(makeVideoBlob())
  clearChunks.mockResolvedValue(undefined)
  buildMarkdown.mockReturnValue('## Bug Report — 2026-04-09')

  globalThis.URL = {
    createObjectURL: (blob) => {
      capturedBlob = blob
      return 'blob:fake-url'
    },
  }

  globalThis.chrome = {
    downloads: {
      download: vi.fn(({ filename }) => { capturedFilename = filename }),
    },
  }
})

async function getZipEntries() {
  const buf = await capturedBlob.arrayBuffer()
  return unzipSync(new Uint8Array(buf))
}

describe('exportSession', () => {
  it('creates a ZIP containing recording.webm', async () => {
    await exportSession(SESSION)
    const entries = await getZipEntries()
    expect(Object.keys(entries)).toContain('recording.webm')
    expect(entries['recording.webm']).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('creates a ZIP containing report.md with markdown content', async () => {
    await exportSession(SESSION)
    const entries = await getZipEntries()
    expect(Object.keys(entries)).toContain('report.md')
    expect(strFromU8(entries['report.md'])).toBe('## Bug Report — 2026-04-09')
  })

  it('creates api-errors/error-1.sh for each API error', async () => {
    await exportSession(SESSION)
    const entries = await getZipEntries()
    expect(Object.keys(entries)).toContain('api-errors/error-1.sh')
    expect(strFromU8(entries['api-errors/error-1.sh'])).toContain('curl')
  })

  it('calls chrome.downloads.download with a blob: URL', async () => {
    await exportSession(SESSION)
    expect(chrome.downloads.download).toHaveBeenCalledOnce()
    const [{ url, filename }] = chrome.downloads.download.mock.calls[0]
    expect(url).toMatch(/^blob:/)
    expect(filename).toBe('vcap-2026-04-09.zip')
  })

  it('calls clearChunks() after export', async () => {
    await exportSession(SESSION)
    expect(clearChunks).toHaveBeenCalledOnce()
  })
})
