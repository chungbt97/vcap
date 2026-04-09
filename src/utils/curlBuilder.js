import { sanitizeHeaders, sanitizeBody } from './sanitize.js'

/**
 * Convert a captured API error entry into a cURL command string.
 * @param {{ method, url, requestHeaders, requestBody, status, timestamp }} entry
 * @returns {string}
 */
export function buildCurl(entry) {
  const { method, requestHeaders = {}, requestBody } = entry
  try {
    const parsed = new URL(entry.url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '# Invalid URL: only http and https are supported'
    }
  } catch {
    return '# Invalid URL: only http and https are supported'
  }
  const url = entry.url
  const safeHeaders = sanitizeHeaders(requestHeaders)
  const safeBody = requestBody ? sanitizeBody(requestBody) : null

  const headerFlags = Object.entries(safeHeaders)
    .map(([k, v]) => {
      const safeV = v.replace(/'/g, "'\\''")
      return `-H '${k}: ${safeV}'`
    })
    .join(' \\\n  ')

  const bodyFlag = safeBody
    ? `\\\n  --data '${JSON.stringify(safeBody)}'`
    : ''

  return [
    `curl -X ${method} '${url}'`,
    headerFlags ? `  ${headerFlags}` : '',
    bodyFlag,
  ]
    .filter(Boolean)
    .join(' \\\n')
    .trim()
}
