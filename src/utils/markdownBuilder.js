function escapePipe(str) {
  return String(str ?? '').replace(/\|/g, '\\|')
}

// Event types that carry a meaningful "value" worth showing in the table
const VALUE_EVENT_TYPES = new Set([
  'click', 'input', 'change', 'checkbox', 'radio', 'select', 'file', 'range',
  'switch', 'keydown', 'navigate',
])

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

  // Track URL groups — insert a new table per page when URL changes
  let lastUrl = null
  const hasMultipleUrls = steps.some((s, i) => i > 0 && s.url && s.url !== steps[0].url)

  if (!hasMultipleUrls) {
    // Single page: single table (no breaking change)
    lines.push('| # | Time | Action | Value | Note |')
    lines.push('|---|------|--------|-------|------|')
  }

  for (const s of steps) {
    // Insert URL divider + new table header when page changes
    if (hasMultipleUrls && s.url && s.url !== lastUrl) {
      lastUrl = s.url
      lines.push('')
      lines.push(`**📍 Page: ${escapePipe(s.url)}**`)
      lines.push('')
      lines.push('| # | Time | Action | Value | Note |')
      lines.push('|---|------|--------|-------|------|')
    }

    // Build action label:
    // - For input/change events that have a labelText, format as "type (Label Name)"
    // - Others: just "type: target"
    const hasLabel = s.labelText && VALUE_EVENT_TYPES.has(s.type)
    const action = hasLabel
      ? `${s.type} (${escapePipe(s.labelText)}): ${escapePipe(s.target)}`
      : `${s.type}: ${escapePipe(s.target)}`

    const value = VALUE_EVENT_TYPES.has(s.type) ? escapePipe(s.value || '') : ''
    lines.push(`| ${s.index} | ${escapePipe(s.timestamp)} | ${action} | ${value} | ${escapePipe(s.note || '')} |`)
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
