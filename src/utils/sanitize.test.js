import { describe, it, expect } from 'vitest'
import { sanitizeHeaders, sanitizeBody } from './sanitize.js'

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
    const banned = ['Authorization', 'Cookie', 'Set-Cookie', 'X-Auth-Token', 'X-Api-Key', 'Proxy-Authorization']
    banned.forEach(h => {
      const result = sanitizeHeaders({ [h]: 'value', safe: 'keep' })
      expect(result).not.toHaveProperty(h)
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
    const result = sanitizeHeaders({ 'x-csrf-token': 'abc123' })
    expect(result['x-csrf-token']).toBeUndefined()
  })

  it('blocks x-session-id header', () => {
    const result = sanitizeHeaders({ 'x-session-id': 'sess_abc' })
    expect(result['x-session-id']).toBeUndefined()
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
})
