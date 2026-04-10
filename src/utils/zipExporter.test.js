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
  size: bytes.length,
  arrayBuffer: async () => bytes.buffer,
})

const SESSION = {
  steps: [{ index: 1, timestamp: '00:01', type: 'click', target: 'button', url: 'http://localhost/' }],
  apiErrors: [{ requestId: 'r1', method: 'GET', url: 'https://api.example.com/v1/users', status: 500, timestamp: '00:02', requestHeaders: {} }],
  consoleErrors: [],
  notes: [],
  date: '2026-04-09T14:30:00',
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
    revokeObjectURL: vi.fn(),
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
  // [Phase 4] Updated filename tests
  it('creates a ZIP containing bug-record.webm (not recording.webm)', async () => {
    await exportSession(SESSION)
    const entries = await getZipEntries()
    expect(Object.keys(entries)).toContain('bug-record.webm')
    expect(Object.keys(entries)).not.toContain('recording.webm')
    expect(entries['bug-record.webm']).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('creates a ZIP containing jira-ticket.md (not report.md)', async () => {
    await exportSession(SESSION)
    const entries = await getZipEntries()
    expect(Object.keys(entries)).toContain('jira-ticket.md')
    expect(Object.keys(entries)).not.toContain('report.md')
    expect(strFromU8(entries['jira-ticket.md'])).toBe('## Bug Report — 2026-04-09')
  })

  it('creates postman-curl/ folder (not api-errors/)', async () => {
    await exportSession(SESSION)
    const entries = await getZipEntries()
    const keys = Object.keys(entries)
    const hasCurlFile = keys.some(k => k.startsWith('postman-curl/'))
    const hasOldFolder = keys.some(k => k.startsWith('api-errors/'))
    expect(hasCurlFile).toBe(true)
    expect(hasOldFolder).toBe(false)
  })

  it('names cURL files as [timestamp]_[METHOD]-[apiname].txt', async () => {
    await exportSession(SESSION)
    const entries = await getZipEntries()
    const keys = Object.keys(entries)
    const curlFile = keys.find(k => k.startsWith('postman-curl/'))
    // Format: [timestamp]_[METHOD]-[path-segments].txt
    // e.g. postman-curl/00-02_GET-v1-users.txt
    expect(curlFile).toBeDefined()
    expect(curlFile).toMatch(/^postman-curl\/\d{2}-\d{2}_GET-.+\.txt$/)
  })

  it('ZIP filename uses bug-report- prefix with timestamp', async () => {
    await exportSession(SESSION)
    expect(capturedFilename).toMatch(/^bug-report-/)
    expect(capturedFilename).toMatch(/\.zip$/)
    expect(capturedFilename).not.toMatch(/[/:*?"\\<>|]/)
  })

  it('does NOT create postman-curl/ folder when no API errors', async () => {
    await exportSession({ ...SESSION, apiErrors: [] })
    const entries = await getZipEntries()
    const keys = Object.keys(entries)
    expect(keys.some(k => k.startsWith('postman-curl/'))).toBe(false)
    expect(keys).toContain('bug-record.webm')
    expect(keys).toContain('jira-ticket.md')
  })

  it('calls chrome.downloads.download with a blob: URL', async () => {
    await exportSession(SESSION)
    expect(chrome.downloads.download).toHaveBeenCalledOnce()
    const [{ url }] = chrome.downloads.download.mock.calls[0]
    expect(url).toMatch(/^blob:/)
  })

  it('calls clearChunks() after export', async () => {
    await exportSession(SESSION)
    expect(clearChunks).toHaveBeenCalledOnce()
  })

  it('revokes the blob URL after download', async () => {
    const revokeSpy = vi.fn()
    globalThis.URL.revokeObjectURL = revokeSpy
    await exportSession(SESSION)
    expect(revokeSpy).toHaveBeenCalledOnce()
  })

  it('throws if no recording was captured (empty blob)', async () => {
    readAllChunks.mockResolvedValueOnce({ size: 0, arrayBuffer: async () => new ArrayBuffer(0) })
    await expect(exportSession(SESSION)).rejects.toThrow('No recording captured')
  })

  it('still calls clearChunks() when export throws', async () => {
    readAllChunks.mockResolvedValueOnce({ size: 0, arrayBuffer: async () => new ArrayBuffer(0) })
    await expect(exportSession(SESSION)).rejects.toThrow()
    expect(clearChunks).toHaveBeenCalledOnce()
  })

  it('throws if session is empty (no date, no steps, no errors)', async () => {
    await expect(exportSession({ steps: [], apiErrors: [], consoleErrors: [], date: '' }))
      .rejects.toThrow('No session data available')
  })

  it('sanitizes special characters in date for filename', async () => {
    await exportSession({ ...SESSION, date: '2026/04/09 12:00:00' })
    const [{ filename }] = chrome.downloads.download.mock.calls[0]
    expect(filename).not.toMatch(/[/:*?"\\<>|]/)
    expect(filename).toMatch(/^bug-report-/)
  })
})
