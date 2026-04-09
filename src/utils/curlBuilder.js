import { sanitizeHeaders, sanitizeBody } from './sanitize.js'

/**
 * Convert a captured API error entry into a cURL command string.
 * @param {{ method, url, requestHeaders, requestBody, status, timestamp }} entry
 * @returns {string}
 */
export function buildCurl(entry) {
  const { method, url, requestHeaders = {}, requestBody } = entry
  const safeHeaders = sanitizeHeaders(requestHeaders)
  const safeBody = requestBody ? sanitizeBody(requestBody) : null

  const headerFlags = Object.entries(safeHeaders)
    .map(([k, v]) => `-H '${k}: ${v}'`)
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
