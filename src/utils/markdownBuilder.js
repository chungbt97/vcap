function escapePipe(str) {
  return String(str ?? '').replace(/\|/g, '\\|')
}

/**
 * Build Jira-compatible Markdown from recorded session data.
 * @param {{ steps, apiErrors, consoleErrors, date }} params
 * @returns {string}
 */
export function buildMarkdown({ steps = [], apiErrors = [], consoleErrors = [], date = '' }) {
  steps = Array.isArray(steps) ? steps : []
  apiErrors = Array.isArray(apiErrors) ? apiErrors : []
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

  if (apiErrors.length > 0) {
    lines.push('### API Errors')
    lines.push('| Time | Method | URL | Status |')
    lines.push('|------|--------|-----|--------|')
    for (const e of apiErrors) {
      lines.push(`| ${escapePipe(e.timestamp)} | ${escapePipe(e.method)} | ${escapePipe(e.url)} | ${e.status} |`)
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
