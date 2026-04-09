# VCAP Security & Data Sanitization

All captured data must be sanitized **before** it is stored, displayed, or exported. Never log raw network data.

## `sanitizeData()` — Mandatory Rules

### Headers to strip (remove entirely)
- `Authorization`
- `Cookie`
- `Set-Cookie`
- `X-Auth-Token`
- `X-Api-Key`
- `Proxy-Authorization`

### Body fields to mask (replace value with `"[REDACTED]"`)
Applies to any key matching these names (case-insensitive):
- `password`, `passwd`, `pass`
- `token`, `access_token`, `refresh_token`, `id_token`
- `secret`, `client_secret`
- `api_key`, `apikey`
- `ssn`, `credit_card`, `card_number`, `cvv`
- `private_key`

### Implementation pattern

```js
function sanitizeHeaders(headers = {}) {
  const banned = new Set([
    'authorization', 'cookie', 'set-cookie',
    'x-auth-token', 'x-api-key', 'proxy-authorization'
  ]);
  return Object.fromEntries(
    Object.entries(headers).filter(([k]) => !banned.has(k.toLowerCase()))
  );
}

function sanitizeBody(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  const sensitiveKeys = /^(password|passwd|pass|token|access_token|refresh_token|id_token|secret|client_secret|api_key|apikey|ssn|credit_card|card_number|cvv|private_key)$/i;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      sensitiveKeys.test(k) ? '[REDACTED]' : (typeof v === 'object' ? sanitizeBody(v) : v)
    ])
  );
}
```

## cURL Export Rules

- Sanitized headers and body only — never raw CDP response
- Format: `[HH:MM:SS]_[API-Name].txt` per selected error
- Strip `Cookie` header from cURL output entirely

## Chrome Web Store Compliance

The Privacy Policy must state:
> "Extension uses `chrome.debugger` to capture network errors locally. No scripts are injected or overridden. All sensitive data is automatically sanitized. 100% local processing — no data leaves the user's machine."

`chrome.debugger` requires explicit justification in the store listing.
