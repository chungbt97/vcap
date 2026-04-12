import { describe, it, expect, vi, beforeEach } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'

vi.mock('./idb.js', () => ({
  readAllChunks: vi.fn(),
  clearChunks: vi.fn(),
  readAllScreenshots: vi.fn(),
  clearScreenshots: vi.fn(),
}))

vi.mock('./markdownBuilder.js', () => ({
  buildMarkdown: vi.fn(() => '## Bug Report'),
}))

vi.mock('./curlBuilder.js', () => ({
  buildCurl: vi.fn((err) => `curl -X ${err.method} '${err.url}'`),
}))

import { readAllChunks, clearChunks, readAllScreenshots, clearScreenshots } from './idb.js'
import { buildMarkdown } from './markdownBuilder.js'
import { exportSession, buildZipFileName } from './zipExporter.js'

const makeVideoBlob = (bytes = new Uint8Array([1, 2, 3])) => ({
  size: bytes.length,
  arrayBuffer: async () => bytes.buffer,
})

const SESSION = {
  steps: [{ index: 1, timestamp: '00:01', type: 'click', target: 'button', url: 'http://localhost/' }],
  // [B3] Renamed from apiErrors → apiRequests — only selected requests get cURL export
  apiRequests: [{ requestId: 'r1', method: 'GET', url: 'https://api.example.com/v1/users', status: 500, timestamp: '00:02', requestHeaders: {} }],
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
  readAllScreenshots.mockResolvedValue([])
  clearScreenshots.mockResolvedValue(undefined)
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
    expect(curlFile).toBeDefined()
    expect(curlFile).toMatch(/^postman-curl\/\d{2}-\d{2}_GET-.+\.txt$/)
  })

  // [C7] Updated filename tests — new format: {TicketName}_{YYYY-MM-DD}_{HH-mm-ss}.zip
  it('ZIP filename uses vcap_ prefix when no ticketName provided', async () => {
    await exportSession(SESSION)
    expect(capturedFilename).toMatch(/^vcap_/)
    expect(capturedFilename).toMatch(/\.zip$/)
    expect(capturedFilename).not.toMatch(/[/:*?"\\<>|]/)
  })

  it('ZIP filename uses ticketName as prefix when provided', async () => {
    await exportSession({ ...SESSION, ticketName: 'BUG-123' })
    expect(capturedFilename).toMatch(/^BUG-123_/)
    expect(capturedFilename).toMatch(/\.zip$/)
  })

  it('ZIP filename follows {TicketName}_{YYYY-MM-DD}_{HH-mm-ss}.zip format', async () => {
    await exportSession({ ...SESSION, ticketName: 'TICKET-456', date: '2026-04-11T14:30:00' })
    expect(capturedFilename).toBe('TICKET-456_2026-04-11_14-30-00.zip')
  })

  it('does NOT create postman-curl/ folder when no API requests', async () => {
    await exportSession({ ...SESSION, apiRequests: [] })
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

  it('calls clearScreenshots() after export', async () => {
    await exportSession(SESSION)
    expect(clearScreenshots).toHaveBeenCalledOnce()
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
    await expect(exportSession({ steps: [], apiRequests: [], consoleErrors: [], date: '' }))
      .rejects.toThrow('No session data available')
  })

  it('sanitizes special characters in ticketName for filename', async () => {
    await exportSession({ ...SESSION, ticketName: 'BUG 123 / Test?' })
    const [{ filename }] = chrome.downloads.download.mock.calls[0]
    expect(filename).not.toMatch(/[/:*?"\\<>| ]/)
    expect(filename).toMatch(/^BUG-123-Test_/)
  })
})

describe('buildZipFileName', () => {
  it('uses ticketName as prefix', () => {
    expect(buildZipFileName('2026-04-11T14:30:00', 'BUG-123')).toBe('BUG-123_2026-04-11_14-30-00.zip')
  })

  it('falls back to vcap when no ticketName', () => {
    expect(buildZipFileName('2026-04-11T09:05:03', '')).toBe('vcap_2026-04-11_09-05-03.zip')
  })

  it('sanitizes ticket name with spaces and special chars', () => {
    const result = buildZipFileName('2026-04-11T14:30:00', 'My Bug / Test!')
    expect(result).toMatch(/^My-Bug-Test_/)
    expect(result).not.toMatch(/[/ !]/)
  })

  it('truncates very long ticket names at 50 chars', () => {
    const long = 'A'.repeat(60)
    const result = buildZipFileName('2026-04-11T14:30:00', long)
    const prefix = result.split('_')[0]
    expect(prefix.length).toBeLessThanOrEqual(50)
  })
})
