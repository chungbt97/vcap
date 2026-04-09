/**
 * Build Jira-compatible Markdown from recorded session data.
 * @param {{ steps, apiErrors, consoleErrors, date }} params
 * @returns {string}
 */
export function buildMarkdown({ steps = [], apiErrors = [], consoleErrors = [], date = '' }) {
  const lines = []

  lines.push(`## Bug Report — ${date}`, '')
  lines.push('### Steps to Reproduce')
  lines.push('| # | Time | Action | Note |')
  lines.push('|---|------|--------|------|')
  for (const s of steps) {
    lines.push(`| ${s.index} | ${s.timestamp} | ${s.type}: ${s.target} | ${s.note || ''} |`)
  }
  lines.push('')

  if (apiErrors.length > 0) {
    lines.push('### API Errors')
    lines.push('| Time | Method | URL | Status |')
    lines.push('|------|--------|-----|--------|')
    for (const e of apiErrors) {
      lines.push(`| ${e.timestamp} | ${e.method} | ${e.url} | ${e.status} |`)
    }
    lines.push('')
  }

  if (consoleErrors.length > 0) {
    lines.push('### Console Errors')
    for (const c of consoleErrors) {
      lines.push(`- \`${c.timestamp}\` ${c.message}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
