function escapePipe(str) {
  return String(str ?? '').replace(/\|/g, '\\|')
}

/**
 * Build Jira-compatible Markdown from recorded session data.
 * @param {{ steps, apiRequests, consoleErrors, date }} params
 * @returns {string}
 */
export function buildMarkdown({ steps = [], apiRequests = [], consoleErrors = [], date = '' }) {
  steps = Array.isArray(steps) ? steps : []
  apiRequests = Array.isArray(apiRequests) ? apiRequests : []
  consoleErrors = Array.isArray(consoleErrors) ? consoleErrors : []
  const lines = []

  lines.push(`## Bug Report — ${date}`, '')
  lines.push('### Steps to Reproduce')
  lines.push('| # | Time | Action | Note |')
  lines.push('|---|------|--------|------|')
  for (const s of steps) {
    lines.push(`| ${s.index} | ${escapePipe(s.timestamp)} | ${escapePipe(s.type)}: ${escapePipe(s.target)} | ${escapePipe(s.note || '')} |`)
  }
  lines.push('')

  if (apiRequests.length > 0) {
    lines.push('### Network Requests')
    lines.push('| Status | Time | Method | URL |')
    lines.push('|--------|------|--------|-----|')
    for (const r of apiRequests) {
      const status = r.status
      const marker = (!status || status === 0 || status >= 400) ? '❌' : '✅'
      lines.push(`| ${marker} ${status || '—'} | ${escapePipe(r.timestamp)} | ${escapePipe(r.method)} | ${escapePipe(r.url)} |`)
    }
    lines.push('')
  }

  if (consoleErrors.length > 0) {
    lines.push('### Console Errors')
    for (const c of consoleErrors) {
      lines.push(`- \`${escapePipe(c.timestamp)}\` ${escapePipe(c.message)}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
