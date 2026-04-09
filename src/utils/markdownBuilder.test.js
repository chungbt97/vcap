import { describe, it, expect } from 'vitest'
import { buildMarkdown } from './markdownBuilder.js'

const steps = [
  { index: 1, timestamp: '00:03', type: 'click', target: 'button#submit', note: '' },
  { index: 2, timestamp: '00:07', type: 'input', target: 'input#email', note: 'entered wrong email' },
]

const apiErrors = [
  { timestamp: '00:07', method: 'POST', url: '/api/login', status: 401 },
]

const consoleErrors = [
  { timestamp: '00:09', message: "TypeError: Cannot read property 'id' of undefined" },
]

describe('buildMarkdown', () => {
  it('includes report header with date', () => {
    const md = buildMarkdown({ steps, apiErrors, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('## Bug Report')
    expect(md).toContain('2026-04-09')
  })

  it('renders steps table', () => {
    const md = buildMarkdown({ steps, apiErrors, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('| # | Time | Action | Note |')
    expect(md).toContain('| 1 | 00:03 | click: button#submit |')
    expect(md).toContain('| 2 | 00:07 | input: input#email | entered wrong email |')
  })

  it('renders API errors table', () => {
    const md = buildMarkdown({ steps, apiErrors, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('### API Errors')
    expect(md).toContain('| 00:07 | POST | /api/login | 401 |')
  })

  it('renders console errors section', () => {
    const md = buildMarkdown({ steps, apiErrors, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('### Console Errors')
    expect(md).toContain("TypeError: Cannot read property 'id' of undefined")
  })

  it('omits API errors section when empty', () => {
    const md = buildMarkdown({ steps, apiErrors: [], consoleErrors: [], date: '2026-04-09' })
    expect(md).not.toContain('### API Errors')
  })
})
