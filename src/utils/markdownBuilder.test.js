import { describe, it, expect } from 'vitest'
import { buildMarkdown } from './markdownBuilder.js'

const steps = [
  { index: 1, timestamp: '00:03', type: 'click', target: 'button#submit', note: '' },
  { index: 2, timestamp: '00:07', type: 'input', target: 'input#email', value: 'test@example.com', note: 'entered wrong email' },
  { index: 3, timestamp: '00:10', type: 'input', target: 'input#name', value: 'John', labelText: 'Full Name', note: '' },
]

// [B3] Renamed from apiErrors → apiRequests — now tracks all requests
const apiRequests = [
  { timestamp: '00:07', method: 'POST', url: '/api/login', status: 401 },
]

const consoleErrors = [
  { timestamp: '00:09', message: "TypeError: Cannot read property 'id' of undefined" },
]

describe('buildMarkdown', () => {
  it('includes report header with date', () => {
    const md = buildMarkdown({ steps, apiRequests, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('## Bug Report')
    expect(md).toContain('2026-04-09')
  })

  it('renders steps table with Value column', () => {
    const md = buildMarkdown({ steps, apiRequests, consoleErrors, date: '2026-04-09' })
    // New column headers
    expect(md).toContain('| # | Time | Action | Value | Note |')
    // click: no value shown
    expect(md).toContain('| 1 | 00:03 | click: button#submit |  |')
    // input without label: no labelText prefix
    expect(md).toContain('| 2 | 00:07 | input: input#email | test@example.com | entered wrong email |')
    // input with labelText: shows "type (Label): target"
    expect(md).toContain('| 3 | 00:10 | input (Full Name): input#name | John |')
  })

  it('renders Network Requests table with status markers', () => {
    const md = buildMarkdown({ steps, apiRequests, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('### Network Requests')
    // Row should contain ❌ marker (401 is error), method and URL
    expect(md).toContain('❌')
    expect(md).toContain('401')
    expect(md).toContain('POST')
    expect(md).toContain('/api/login')
  })

  it('renders console errors section', () => {
    const md = buildMarkdown({ steps, apiRequests, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('### Console Errors')
    expect(md).toContain("TypeError: Cannot read property 'id' of undefined")
  })

  it('omits Network Requests section when empty', () => {
    const md = buildMarkdown({ steps, apiRequests: [], consoleErrors: [], date: '2026-04-09' })
    expect(md).not.toContain('### Network Requests')
    expect(md).not.toContain('### API Errors')
  })

  it('escapes pipe characters in step notes', () => {
    const md = buildMarkdown({
      steps: [{ index: 1, timestamp: '00:01', type: 'click', target: 'btn', note: 'pipe | here' }],
      apiRequests: [],
      consoleErrors: [],
      date: '2026-04-09'
    })
    expect(md).toContain('pipe \\| here')
  })

  it('handles null apiRequests and consoleErrors gracefully', () => {
    const md = buildMarkdown({ steps: [], apiRequests: null, consoleErrors: null, date: '2026-04-09' })
    expect(md).toBeDefined()
    expect(md).not.toContain('### Network Requests')
  })

  it('escapes pipes in request URLs', () => {
    const md = buildMarkdown({
      steps: [],
      apiRequests: [{ timestamp: '00:01', method: 'GET', url: '/api?q=foo|bar', status: 400 }],
      consoleErrors: [],
      date: '2026-04-09'
    })
    expect(md).toContain('/api?q=foo\\|bar')
  })

  it('renders ✅ marker for 2xx success requests', () => {
    const md = buildMarkdown({
      steps: [],
      apiRequests: [{ timestamp: '00:01', method: 'GET', url: '/api/health', status: 200 }],
      consoleErrors: [],
      date: '2026-04-09'
    })
    expect(md).toContain('✅')
    expect(md).toContain('200')
  })
})
