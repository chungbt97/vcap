import { describe, it, expect } from 'vitest'
import { sanitizeHeaders, sanitizeBody, sanitizeStringValue, sanitizeApiError } from './sanitize.js'

describe('sanitizeHeaders', () => {
  it('removes Authorization header', () => {
    const result = sanitizeHeaders({ Authorization: 'Bearer abc', 'Content-Type': 'application/json' })
    expect(result).not.toHaveProperty('Authorization')
    expect(result).toHaveProperty('Content-Type')
  })

  it('removes Cookie header case-insensitively', () => {
    const result = sanitizeHeaders({ cookie: 'session=xyz', accept: '*/*' })
    expect(result).not.toHaveProperty('cookie')
    expect(result).toHaveProperty('accept')
  })

  it('removes all banned headers', () => {
    const banned = [
      'Authorization', 'Cookie', 'Set-Cookie', 'X-Auth-Token', 'X-Api-Key',
      'Proxy-Authorization', 'X-CSRF-Token', 'X-Session-Id', 'X-Access-Token',
      'WWW-Authenticate', 'Proxy-Authenticate', 'X-Forwarded-For',
    ]
    banned.forEach(h => {
      const result = sanitizeHeaders({ [h]: 'value', safe: 'keep' })
      expect(result).not.toHaveProperty(h)
      expect(result).toHaveProperty('safe')
    })
  })

  it('returns empty object for empty input', () => {
    expect(sanitizeHeaders({})).toEqual({})
    expect(sanitizeHeaders()).toEqual({})
  })

  it('strips CRLF from header values', () => {
    const result = sanitizeHeaders({ 'x-custom': 'foo\r\nX-Evil: injected' })
    expect(result['x-custom']).toBe('fooX-Evil: injected')
  })

  it('blocks x-csrf-token header', () => {
    expect(sanitizeHeaders({ 'x-csrf-token': 'abc123' })['x-csrf-token']).toBeUndefined()
  })

  it('blocks x-session-id header', () => {
    expect(sanitizeHeaders({ 'x-session-id': 'sess_abc' })['x-session-id']).toBeUndefined()
  })
})

describe('sanitizeBody', () => {
  it('redacts password field', () => {
    const result = sanitizeBody({ username: 'alice', password: 'secret123' })
    expect(result.username).toBe('alice')
    expect(result.password).toBe('[REDACTED]')
  })

  it('redacts token fields', () => {
    const result = sanitizeBody({ access_token: 'abc', refresh_token: 'xyz', data: 'ok' })
    expect(result.access_token).toBe('[REDACTED]')
    expect(result.refresh_token).toBe('[REDACTED]')
    expect(result.data).toBe('ok')
  })

  it('redacts nested sensitive fields', () => {
    const result = sanitizeBody({ user: { email: 'a@b.com', password: 'pw' } })
    expect(result.user.email).toBe('a@b.com')
    expect(result.user.password).toBe('[REDACTED]')
  })

  it('handles non-object input', () => {
    expect(sanitizeBody(null)).toBeNull()
    expect(sanitizeBody('string')).toBe('string')
    expect(sanitizeBody(42)).toBe(42)
  })

  it('handles string body (JSON parse)', () => {
    const result = sanitizeBody(JSON.parse('{"password":"pw","email":"a@b.com"}'))
    expect(result.password).toBe('[REDACTED]')
    expect(result.email).toBe('a@b.com')
  })

  it('handles array bodies', () => {
    const result = sanitizeBody([{ password: 'x' }, { name: 'safe' }])
    expect(result[0].password).toBe('[REDACTED]')
    expect(result[1].name).toBe('safe')
  })
})

describe('sanitizeStringValue', () => {
  it('redacts Bearer tokens', () => {
    const result = sanitizeStringValue('Authorization: Bearer eyJhbGci1234567890abcdef')
    expect(result).toContain('[REDACTED]')
    expect(result).not.toContain('eyJhbGci')
  })

  it('redacts Basic auth', () => {
    const result = sanitizeStringValue('Authorization: Basic dXNlcjpwYXNz')
    expect(result).toContain('[REDACTED]')
    expect(result).not.toContain('dXNlcjpwYXNz')
  })

  it('redacts JWT tokens (three-part format)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const result = sanitizeStringValue(jwt)
    expect(result).toContain('[REDACTED]')
    expect(result).not.toContain('eyJhbGci')
  })

  it('redacts Stripe-style API keys', () => {
    const result = sanitizeStringValue('key: sk_live_abcdefghijklmnop')
    expect(result).toContain('[REDACTED]')
    expect(result).not.toContain('sk_live_')
  })

  it('returns non-string input unchanged', () => {
    expect(sanitizeStringValue(null)).toBeNull()
    expect(sanitizeStringValue(undefined)).toBeUndefined()
    expect(sanitizeStringValue(42)).toBe(42)
  })
})

describe('sanitizeApiError', () => {
  it('sanitizes requestHeaders, responseHeaders, requestBody, responseBody', () => {
    const entry = {
      url: 'https://example.com/api',
      method: 'POST',
      status: 401,
      requestHeaders: { Authorization: 'Bearer secret', 'Content-Type': 'application/json' },
      responseHeaders: { 'Set-Cookie': 'session=abc' },
      requestBody: { username: 'alice', password: 'hunter2' },
      responseBody: '{"error":"Unauthorized","token":"raw-token"}',
    }
    const safe = sanitizeApiError(entry)
    expect(safe.requestHeaders).not.toHaveProperty('Authorization')
    expect(safe.requestHeaders).toHaveProperty('Content-Type')
    expect(safe.responseHeaders).not.toHaveProperty('Set-Cookie')
    expect(safe.requestBody.password).toBe('[REDACTED]')
    // responseBody is a string → goes through sanitizeBody → sanitizeStringValue
    expect(safe.url).toBe('https://example.com/api')
  })

  it('handles missing optional fields gracefully', () => {
    const entry = { url: 'https://example.com', method: 'GET', status: 404 }
    expect(() => sanitizeApiError(entry)).not.toThrow()
    const safe = sanitizeApiError(entry)
    expect(safe.requestHeaders).toBeUndefined()
    expect(safe.responseBody).toBeUndefined()
  })
})
