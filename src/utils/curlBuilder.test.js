import { describe, it, expect } from 'vitest'
import { buildCurl } from './curlBuilder.js'

const baseEntry = {
  method: 'POST',
  url: 'https://api.example.com/login',
  requestHeaders: { 'Content-Type': 'application/json', Authorization: 'Bearer secret' },
  requestBody: { username: 'alice', password: 'pw' },
  status: 401,
  timestamp: '00:07',
}

describe('buildCurl', () => {
  it('generates curl with method and url', () => {
    const curl = buildCurl(baseEntry)
    expect(curl).toContain("curl -X POST 'https://api.example.com/login'")
  })

  it('strips Authorization header from output', () => {
    const curl = buildCurl(baseEntry)
    expect(curl).not.toContain('Authorization')
    expect(curl).not.toContain('Bearer secret')
  })

  it('includes safe headers', () => {
    const curl = buildCurl(baseEntry)
    expect(curl).toContain("-H 'Content-Type: application/json'")
  })

  it('redacts password in body', () => {
    const curl = buildCurl(baseEntry)
    expect(curl).not.toContain('pw')
    expect(curl).toContain('[REDACTED]')
  })

  it('includes --data with sanitized body', () => {
    const curl = buildCurl(baseEntry)
    expect(curl).toContain("--data '")
  })

  it('handles GET request with no body', () => {
    const curl = buildCurl({ ...baseEntry, method: 'GET', requestBody: null })
    expect(curl).not.toContain('--data')
    expect(curl).toContain('-X GET')
  })
})
