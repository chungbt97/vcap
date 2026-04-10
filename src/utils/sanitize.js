/**
 * VCAP — Data Sanitization Utilities
 *
 * RULE: sanitizeHeaders() and sanitizeBody() MUST be called at capture time
 *       (before writing to chrome.storage.session), not only at export time.
 *
 * Coverage:
 * - HTTP headers: Authorization, Cookie, Set-Cookie, X-Auth-Token, X-API-Key, etc.
 * - Request/response bodies: password, token, secret, api_key, card numbers, etc.
 * - String body: raw token pattern matching (Bearer, Basic, sk_live_, etc.)
 */

const BANNED_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-auth-token',
  'x-api-key',
  'x-access-token',
  'x-secret-token',
  'x-session-id',
  'x-csrf-token',
  'x-forwarded-for',
  'proxy-authorization',
  'www-authenticate',
  'proxy-authenticate',
])

// Keys that should always be redacted regardless of nesting depth
const SENSITIVE_KEYS = /^(password|passwd|pass|token|access_token|refresh_token|id_token|secret|client_secret|api_key|apikey|ssn|credit_card|card_number|cvv|cvc|private_key|auth|bearer|authorization)$/i

// Raw string patterns to redact inside string values (Bearer tokens, API keys, etc.)
const TOKEN_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /Basic\s+[A-Za-z0-9+/]+=*/gi,
  /sk_(live|test)_[A-Za-z0-9]+/gi,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT
]

/**
 * Remove sensitive headers from a headers object.
 * @param {Record<string, string>} headers
 * @returns {Record<string, string>}
 */
export function sanitizeHeaders(headers = {}) {
  return Object.entries(headers)
    .filter(([k]) => !BANNED_HEADERS.has(k.toLowerCase()))
    .reduce((acc, [k, v]) => {
      const safeV = String(v).replace(/[\r\n]/g, '')
      acc[k] = safeV
      return acc
    }, {})
}

/**
 * Recursively redact sensitive fields in a parsed body object or string.
 * @param {unknown} obj
 * @returns {unknown}
 */
export function sanitizeBody(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return sanitizeStringValue(obj)
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitizeBody)
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.test(k) ? '[REDACTED]' : sanitizeBody(v),
    ])
  )
}

/**
 * Sanitize a raw string value — redacts known token patterns.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeStringValue(str) {
  if (typeof str !== 'string') return str
  let result = str
  for (const pattern of TOKEN_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

/**
 * Sanitize a complete API error entry captured from CDP.
 * Call this BEFORE writing to state / chrome.storage.session.
 *
 * @param {{
 *   requestHeaders?: object,
 *   responseHeaders?: object,
 *   requestBody?: unknown,
 *   responseBody?: unknown,
 *   [key: string]: unknown
 * }} entry
 * @returns {object}
 */
export function sanitizeApiError(entry) {
  return {
    ...entry,
    requestHeaders: entry.requestHeaders ? sanitizeHeaders(entry.requestHeaders) : undefined,
    responseHeaders: entry.responseHeaders ? sanitizeHeaders(entry.responseHeaders) : undefined,
    requestBody: entry.requestBody != null ? sanitizeBody(entry.requestBody) : undefined,
    responseBody: entry.responseBody != null ? sanitizeBody(entry.responseBody) : undefined,
  }
}
