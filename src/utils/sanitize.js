const BANNED_HEADERS = new Set([
  'authorization', 'cookie', 'set-cookie',
  'x-auth-token', 'x-api-key', 'proxy-authorization',
])

const SENSITIVE_KEYS = /^(password|passwd|pass|token|access_token|refresh_token|id_token|secret|client_secret|api_key|apikey|ssn|credit_card|card_number|cvv|private_key)$/i

/**
 * Remove sensitive headers from a headers object.
 * @param {Record<string, string>} headers
 * @returns {Record<string, string>}
 */
export function sanitizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).filter(([k]) => !BANNED_HEADERS.has(k.toLowerCase()))
  )
}

/**
 * Recursively redact sensitive fields in a parsed body object.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeBody(obj) {
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) return obj.map(sanitizeBody)
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.test(k) ? '[REDACTED]' : sanitizeBody(v),
    ])
  )
}
