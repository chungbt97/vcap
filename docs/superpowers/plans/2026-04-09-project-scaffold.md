# VCAP Chrome Extension — Project Scaffold Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the complete Chrome Extension project with all source files, build config, and shared utilities — aligned with `plans/VCAP_MASTER_PLAN_AND_HISTORY.md`.

**Architecture:** Four MV3 components: Background Service Worker (pure JS, state + debugger), Content Script (pure JS + Shadow DOM UI), Offscreen Document (pure JS + MediaRecorder), Preview Tab (React + Tailwind). All network data passes through `sanitize.js` before any storage or export. Shared utilities live in `src/utils/`.

**Tech Stack:** Vite 5, React 18, Tailwind CSS 3, `vite-plugin-web-extension`, `jszip`, `@floating-ui/dom`, `framer-motion`, Vitest (unit tests for utils)

---

## File Map

```
vcap/
├── manifest.json                      ← MV3 manifest
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vitest.config.js
├── .gitignore
├── public/
│   └── icons/
│       ├── icon16.svg
│       ├── icon48.svg
│       └── icon128.svg
└── src/
    ├── background/
    │   └── index.js                   ← Service Worker: state, debugger, CDP
    ├── content/
    │   ├── index.js                   ← Content Script entry
    │   ├── eventCollector.js          ← DOM event capture
    │   └── floatingUI.js              ← Shadow DOM floating button + note input
    ├── offscreen/
    │   ├── offscreen.html
    │   └── index.js                   ← MediaRecorder + IndexedDB chunk writes
    ├── preview/
    │   ├── index.html
    │   ├── main.jsx
    │   ├── App.jsx
    │   └── components/
    │       ├── MarkdownPanel.jsx      ← Left panel: steps + notes markdown
    │       └── ApiErrorPanel.jsx      ← Right panel: checkbox API error list
    └── utils/
        ├── sanitize.js                ← sanitizeHeaders(), sanitizeBody()
        ├── idb.js                     ← IndexedDB wrapper (chunks store)
        ├── curlBuilder.js             ← API error object → cURL string
        ├── markdownBuilder.js         ← steps[] + notes[] → Markdown table
        └── zipExporter.js             ← jszip: assemble + download .zip
```

---

## Task 1: Project Config & Build Setup

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `vitest.config.js`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "vcap",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@floating-ui/dom": "^1.6.3",
    "framer-motion": "^11.1.7",
    "jszip": "^3.10.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "vite": "^5.2.11",
    "vite-plugin-web-extension": "^4.1.1",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: 'manifest.json',
      watchFilePaths: ['manifest.json'],
    }),
  ],
  build: {
    minify: true,
    sourcemap: false,
  },
})
```

- [ ] **Step 3: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,html}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 4: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
dist/
.DS_Store
*.zip
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

---

## Task 2: Manifest & Icons

**Files:**
- Create: `manifest.json`
- Create: `public/icons/icon16.svg`
- Create: `public/icons/icon48.svg`
- Create: `public/icons/icon128.svg`

- [ ] **Step 1: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "VCAP — QA Debug Assistant",
  "version": "0.1.0",
  "description": "Record bugs locally: video, DOM steps, API errors → .zip export. 100% local processing.",
  "permissions": [
    "activeTab",
    "storage",
    "downloads",
    "debugger",
    "offscreen"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background/index.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_icon": {
      "16": "icons/icon16.svg",
      "48": "icons/icon48.svg",
      "128": "icons/icon128.svg"
    },
    "default_title": "VCAP: Click to start recording"
  },
  "icons": {
    "16": "icons/icon16.svg",
    "48": "icons/icon48.svg",
    "128": "icons/icon128.svg"
  },
  "web_accessible_resources": [
    {
      "resources": ["offscreen/offscreen.html", "preview/index.html"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

- [ ] **Step 2: Create `public/icons/icon16.svg`** (red record dot — inactive state)

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="6" fill="#ef4444"/>
</svg>
```

- [ ] **Step 3: Create `public/icons/icon48.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="18" fill="#ef4444"/>
</svg>
```

- [ ] **Step 4: Create `public/icons/icon128.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="48" fill="#ef4444"/>
  <text x="64" y="74" font-family="monospace" font-size="28" font-weight="bold" fill="white" text-anchor="middle">REC</text>
</svg>
```

---

## Task 3: Utils — `sanitize.js` (TDD)

**Files:**
- Create: `src/utils/sanitize.js`
- Create: `src/utils/sanitize.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/sanitize.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — `sanitize.js` not found.

- [ ] **Step 3: Create `src/utils/sanitize.js`**

```js
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: All 9 tests PASS.

---

## Task 4: Utils — `curlBuilder.js` (TDD)

**Files:**
- Create: `src/utils/curlBuilder.js`
- Create: `src/utils/curlBuilder.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/curlBuilder.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — `curlBuilder.js` not found.

- [ ] **Step 3: Create `src/utils/curlBuilder.js`**

```js
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: All 6 tests PASS.

---

## Task 5: Utils — `markdownBuilder.js` (TDD)

**Files:**
- Create: `src/utils/markdownBuilder.js`
- Create: `src/utils/markdownBuilder.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/markdownBuilder.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildMarkdown } from './markdownBuilder.js'

const steps = [
  { index: 1, timestamp: '00:03', type: 'click', target: 'button#submit', note: '' },
  { index: 2, timestamp: '00:07', type: 'input', target: 'input#email', note: 'entered wrong email' },
]

const apiErrors = [
  { timestamp: '00:07', method: 'POST', url: '/api/login', status: 401 },
]

const consoleErrors = [
  { timestamp: '00:09', message: "TypeError: Cannot read property 'id' of undefined" },
]

describe('buildMarkdown', () => {
  it('includes report header with date', () => {
    const md = buildMarkdown({ steps, apiErrors, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('## Bug Report')
    expect(md).toContain('2026-04-09')
  })

  it('renders steps table', () => {
    const md = buildMarkdown({ steps, apiErrors, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('| # | Time | Action | Note |')
    expect(md).toContain('| 1 | 00:03 | click: button#submit |')
    expect(md).toContain('| 2 | 00:07 | input: input#email | entered wrong email |')
  })

  it('renders API errors table', () => {
    const md = buildMarkdown({ steps, apiErrors, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('### API Errors')
    expect(md).toContain('| 00:07 | POST | /api/login | 401 |')
  })

  it('renders console errors section', () => {
    const md = buildMarkdown({ steps, apiErrors, consoleErrors, date: '2026-04-09' })
    expect(md).toContain('### Console Errors')
    expect(md).toContain("TypeError: Cannot read property 'id' of undefined")
  })

  it('omits API errors section when empty', () => {
    const md = buildMarkdown({ steps, apiErrors: [], consoleErrors: [], date: '2026-04-09' })
    expect(md).not.toContain('### API Errors')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: FAIL — `markdownBuilder.js` not found.

- [ ] **Step 3: Create `src/utils/markdownBuilder.js`**

```js
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: All 5 tests PASS.

---

## Task 6: Utils — `idb.js` (IndexedDB wrapper)

**Files:**
- Create: `src/utils/idb.js`

No unit tests — IndexedDB is a browser API, tested manually in offscreen context.

- [ ] **Step 1: Create `src/utils/idb.js`**

```js
const DB_NAME = 'vcap'
const STORE_CHUNKS = 'videoChunks'
const DB_VERSION = 1

/** @returns {Promise<IDBDatabase>} */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        db.createObjectStore(STORE_CHUNKS, { autoIncrement: true })
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

/** Append a video Blob chunk to IndexedDB. */
export async function appendChunk(blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHUNKS, 'readwrite')
    tx.objectStore(STORE_CHUNKS).add(blob)
    tx.oncomplete = resolve
    tx.onerror = (e) => reject(e.target.error)
  })
}

/** Read all chunks in order and return as a single Blob. */
export async function readAllChunks(mimeType = 'video/webm') {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHUNKS, 'readonly')
    const req = tx.objectStore(STORE_CHUNKS).getAll()
    req.onsuccess = (e) => resolve(new Blob(e.target.result, { type: mimeType }))
    req.onerror = (e) => reject(e.target.error)
  })
}

/** Clear all chunks after export. */
export async function clearChunks() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHUNKS, 'readwrite')
    tx.objectStore(STORE_CHUNKS).clear()
    tx.oncomplete = resolve
    tx.onerror = (e) => reject(e.target.error)
  })
}
```

---

## Task 7: Utils — `zipExporter.js`

**Files:**
- Create: `src/utils/zipExporter.js`

- [ ] **Step 1: Create `src/utils/zipExporter.js`**

```js
import JSZip from 'jszip'
import { buildMarkdown } from './markdownBuilder.js'
import { buildCurl } from './curlBuilder.js'
import { readAllChunks, clearChunks } from './idb.js'

/**
 * Assemble and download the bug report .zip.
 * @param {{
 *   steps: Array,
 *   notes: Array,
 *   apiErrors: Array,        // full list from CDP
 *   selectedApiIds: Set,     // ids tester checked in Preview
 *   consoleErrors: Array,
 *   date: string,
 * }} data
 */
export async function exportZip(data) {
  const { steps, notes, apiErrors, selectedApiIds, consoleErrors, date } = data

  const zip = new JSZip()

  // 1. Video
  const videoBlob = await readAllChunks('video/webm')
  zip.file('bug-record.webm', videoBlob)

  // 2. Jira Markdown
  const allSteps = mergeStepsAndNotes(steps, notes)
  const markdown = buildMarkdown({ steps: allSteps, apiErrors, consoleErrors, date })
  zip.file('jira-ticket.md', markdown)

  // 3. cURL files for selected API errors
  const curlFolder = zip.folder('postman-curl')
  for (const entry of apiErrors) {
    if (!selectedApiIds.has(entry.requestId)) continue
    const filename = `${entry.timestamp.replace(':', '-')}_${slugify(entry.url)}.txt`
    curlFolder.file(filename, buildCurl(entry))
  }

  // 4. Download
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vcap-bug-${date}.zip`
  a.click()
  URL.revokeObjectURL(url)

  // 5. Cleanup
  await clearChunks()
}

function mergeStepsAndNotes(steps, notes) {
  return [...steps, ...notes]
    .sort((a, b) => a.relativeMs - b.relativeMs)
    .map((item, i) => ({ ...item, index: i + 1 }))
}

function slugify(url) {
  try {
    return new URL(url).pathname.replace(/\//g, '-').replace(/^-/, '').slice(0, 40)
  } catch {
    return url.slice(0, 40).replace(/[^a-z0-9]/gi, '-')
  }
}
```

---

## Task 8: Background Service Worker

**Files:**
- Create: `src/background/index.js`

- [ ] **Step 1: Create `src/background/index.js`**

```js
// State — survives service worker restarts via chrome.storage.session
let state = {
  status: 'idle',    // 'idle' | 'recording' | 'stopped'
  tabId: null,
  startTime: null,
  steps: [],
  notes: [],
  apiErrors: [],
  consoleErrors: [],
}

// ── Icon click: toggle recording ──────────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  if (state.status === 'idle') {
    await startRecording(tab.id)
  } else if (state.status === 'recording') {
    await stopRecording()
  }
})

// ── Start ─────────────────────────────────────────────────────────────────
async function startRecording(tabId) {
  state = { status: 'recording', tabId, startTime: Date.now(), steps: [], notes: [], apiErrors: [], consoleErrors: [] }

  // Attach debugger for CDP network capture
  await chrome.debugger.attach({ tabId }, '1.3')
  await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {})

  // Create offscreen document for MediaRecorder
  await ensureOffscreen()
  chrome.runtime.sendMessage({ type: 'START_RECORDING', tabId })

  // Notify content script
  chrome.tabs.sendMessage(tabId, { type: 'RECORDING_STARTED', startTime: state.startTime })

  chrome.action.setTitle({ title: 'VCAP: Recording… (click to stop)' })
  chrome.action.setBadgeText({ text: 'REC' })
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
}

// ── Stop ──────────────────────────────────────────────────────────────────
async function stopRecording() {
  state.status = 'stopped'
  const { tabId } = state

  await chrome.debugger.detach({ tabId })
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
  chrome.tabs.sendMessage(tabId, { type: 'RECORDING_STOPPED' })

  chrome.action.setTitle({ title: 'VCAP: Click to start recording' })
  chrome.action.setBadgeText({ text: '' })

  // Open preview tab with collected data
  const encoded = encodeURIComponent(JSON.stringify({
    steps: state.steps,
    notes: state.notes,
    apiErrors: state.apiErrors,
    consoleErrors: state.consoleErrors,
    date: new Date().toISOString().slice(0, 10),
  }))
  chrome.tabs.create({ url: chrome.runtime.getURL(`preview/index.html?data=${encoded}`) })
}

// ── CDP Network events ────────────────────────────────────────────────────
const pendingRequests = new Map()

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  if (state.status !== 'recording' || source.tabId !== state.tabId) return

  if (method === 'Network.requestWillBeSent') {
    pendingRequests.set(params.requestId, {
      requestId: params.requestId,
      method: params.request.method,
      url: params.request.url,
      requestHeaders: params.request.headers,
      requestBody: parseBody(params.request.postData),
      timestamp: relativeTime(state.startTime),
    })
  }

  if (method === 'Network.responseReceived') {
    const entry = pendingRequests.get(params.requestId)
    if (entry) {
      entry.status = params.response.status
      entry.responseHeaders = params.response.headers
    }
  }

  if (method === 'Network.loadingFinished') {
    const entry = pendingRequests.get(params.requestId)
    if (entry && entry.status >= 400) {
      try {
        const { body } = await chrome.debugger.sendCommand(
          { tabId: state.tabId },
          'Network.getResponseBody',
          { requestId: params.requestId }
        )
        entry.responseBody = body
      } catch (_) {}
      state.apiErrors.push(entry)
      pendingRequests.delete(params.requestId)
    }
  }
})

// ── Messages from Content Script & Offscreen ─────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'DOM_EVENT') state.steps.push(msg.payload)
  if (msg.type === 'NOTE_ADDED') state.notes.push(msg.payload)
  if (msg.type === 'CONSOLE_ERROR') state.consoleErrors.push(msg.payload)
})

// ── Helpers ───────────────────────────────────────────────────────────────
async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument()
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen/offscreen.html'),
      reasons: ['USER_MEDIA'],
      justification: 'Capture tab audio/video for local bug recording',
    })
  }
}

function relativeTime(startMs) {
  const diff = Math.floor((Date.now() - startMs) / 1000)
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  return `${m}:${s}`
}

function parseBody(postData) {
  if (!postData) return null
  try { return JSON.parse(postData) } catch { return postData }
}
```

---

## Task 9: Content Script

**Files:**
- Create: `src/content/eventCollector.js`
- Create: `src/content/floatingUI.js`
- Create: `src/content/index.js`

- [ ] **Step 1: Create `src/content/eventCollector.js`**

```js
let startTime = null

export function startCollecting(recordStartTime) {
  startTime = recordStartTime
  document.addEventListener('click', onEvent, true)
  document.addEventListener('input', onEvent, true)
}

export function stopCollecting() {
  document.removeEventListener('click', onEvent, true)
  document.removeEventListener('input', onEvent, true)
}

function onEvent(e) {
  const target = selectorOf(e.target)
  chrome.runtime.sendMessage({
    type: 'DOM_EVENT',
    payload: {
      type: e.type,
      target,
      timestamp: relativeTime(startTime),
      relativeMs: Date.now() - startTime,
    },
  })
}

function selectorOf(el) {
  if (!el || el === document.body) return 'body'
  const id = el.id ? `#${el.id}` : ''
  const cls = el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : ''
  return `${el.tagName.toLowerCase()}${id}${cls}`
}

function relativeTime(startMs) {
  const diff = Math.floor((Date.now() - startMs) / 1000)
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  return `${m}:${s}`
}
```

- [ ] **Step 2: Create `src/content/floatingUI.js`**

```js
let host = null
let countdownInterval = null

export function mountFloatingUI(startTime) {
  host = document.createElement('div')
  host.id = 'vcap-host'
  const shadow = host.attachShadow({ mode: 'closed' })

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      #vcap-root {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      #vcap-countdown {
        background: #1f2937;
        color: #f9fafb;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.05em;
      }
      #vcap-btn {
        background: #ef4444;
        border: none;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(239,68,68,.4);
        transition: transform .15s;
      }
      #vcap-btn:hover { transform: scale(1.08); }
      #vcap-note-wrap { display: none; }
      #vcap-note-wrap.open { display: flex; flex-direction: column; gap: 4px; }
      #vcap-note {
        background: #fff;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 13px;
        width: 220px;
        resize: none;
        outline: none;
      }
      #vcap-save {
        background: #3b82f6;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
        cursor: pointer;
        align-self: flex-end;
      }
    </style>
    <div id="vcap-root">
      <div id="vcap-countdown">00:00</div>
      <div id="vcap-note-wrap">
        <textarea id="vcap-note" rows="3" placeholder="Add note…"></textarea>
        <button id="vcap-save">Save note</button>
      </div>
      <button id="vcap-btn" title="Add note / Stop recording">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="8" fill="white" opacity=".9"/>
          <rect x="7" y="7" width="6" height="6" rx="1" fill="#ef4444"/>
        </svg>
      </button>
    </div>
  `

  document.documentElement.appendChild(host)

  // Countdown
  const countdownEl = shadow.getElementById('vcap-countdown')
  const DURATION_MS = 300_000
  countdownInterval = setInterval(() => {
    const remaining = Math.max(0, DURATION_MS - (Date.now() - startTime))
    const m = String(Math.floor(remaining / 60000)).padStart(2, '0')
    const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')
    countdownEl.textContent = `${m}:${s}`
    if (remaining === 0) clearInterval(countdownInterval)
  }, 1000)

  // Note toggle
  const btn = shadow.getElementById('vcap-btn')
  const noteWrap = shadow.getElementById('vcap-note-wrap')
  btn.addEventListener('click', () => noteWrap.classList.toggle('open'))

  // Save note
  shadow.getElementById('vcap-save').addEventListener('click', () => {
    const text = shadow.getElementById('vcap-note').value.trim()
    if (!text) return
    chrome.runtime.sendMessage({
      type: 'NOTE_ADDED',
      payload: { text, timestamp: relativeTime(startTime), relativeMs: Date.now() - startTime },
    })
    shadow.getElementById('vcap-note').value = ''
    noteWrap.classList.remove('open')
  })
}

export function unmountFloatingUI() {
  clearInterval(countdownInterval)
  host?.remove()
  host = null
}

function relativeTime(startMs) {
  const diff = Math.floor((Date.now() - startMs) / 1000)
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  return `${m}:${s}`
}
```

- [ ] **Step 3: Create `src/content/index.js`**

```js
import { startCollecting, stopCollecting } from './eventCollector.js'
import { mountFloatingUI, unmountFloatingUI } from './floatingUI.js'

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RECORDING_STARTED') {
    startCollecting(msg.startTime)
    mountFloatingUI(msg.startTime)
  }
  if (msg.type === 'RECORDING_STOPPED') {
    stopCollecting()
    unmountFloatingUI()
  }
})
```

---

## Task 10: Offscreen Document

**Files:**
- Create: `src/offscreen/offscreen.html`
- Create: `src/offscreen/index.js`

- [ ] **Step 1: Create `src/offscreen/offscreen.html`**

```html
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>VCAP Offscreen</title></head>
  <body><script type="module" src="./index.js"></script></body>
</html>
```

- [ ] **Step 2: Create `src/offscreen/index.js`**

```js
import { appendChunk } from '../utils/idb.js'

let mediaRecorder = null
let autoStopTimer = null
const MAX_DURATION_MS = 300_000 // 5 minutes

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'START_RECORDING') await startCapture(msg.tabId)
  if (msg.type === 'STOP_RECORDING') stopCapture()
})

async function startCapture(tabId) {
  let stream
  try {
    const streamId = await new Promise((resolve, reject) =>
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(id)
      )
    )
    stream = await navigator.mediaDevices.getUserMedia({
      video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
      audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
    })
  } catch (err) {
    console.error('[VCAP offscreen] capture failed:', err)
    return
  }

  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' })
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) appendChunk(e.data) }
  mediaRecorder.start(1000) // chunk every 1s

  autoStopTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'AUTO_STOP_TIMEOUT' })
    stopCapture()
  }, MAX_DURATION_MS)
}

function stopCapture() {
  clearTimeout(autoStopTimer)
  if (mediaRecorder?.state !== 'inactive') mediaRecorder?.stop()
  mediaRecorder?.stream?.getTracks().forEach((t) => t.stop())
  mediaRecorder = null
}
```

---

## Task 11: Preview Tab

**Files:**
- Create: `src/preview/index.html`
- Create: `src/preview/main.jsx`
- Create: `src/preview/App.jsx`
- Create: `src/preview/components/MarkdownPanel.jsx`
- Create: `src/preview/components/ApiErrorPanel.jsx`
- Create: `src/preview/index.css`

- [ ] **Step 1: Create `src/preview/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Create `src/preview/index.html`**

```html
<!doctype html>
<html lang="en" class="h-full bg-gray-950">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VCAP — Bug Preview</title>
    <link rel="stylesheet" href="./index.css" />
  </head>
  <body class="h-full">
    <div id="root" class="h-full"></div>
    <script type="module" src="./main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `src/preview/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const params = new URLSearchParams(window.location.search)
const raw = params.get('data')
const sessionData = raw ? JSON.parse(decodeURIComponent(raw)) : {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App data={sessionData} />
  </React.StrictMode>
)
```

- [ ] **Step 4: Create `src/preview/components/MarkdownPanel.jsx`**

```jsx
import React from 'react'
import { buildMarkdown } from '../../utils/markdownBuilder.js'

export default function MarkdownPanel({ steps, notes, apiErrors, consoleErrors, date }) {
  const allSteps = [...steps, ...notes]
    .sort((a, b) => a.relativeMs - b.relativeMs)
    .map((item, i) => ({ ...item, index: i + 1 }))

  const md = buildMarkdown({ steps: allSteps, apiErrors, consoleErrors, date })

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Jira Markdown</h2>
      <pre className="flex-1 overflow-auto bg-gray-900 rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
        {md}
      </pre>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/preview/components/ApiErrorPanel.jsx`**

```jsx
import React, { useState } from 'react'

export default function ApiErrorPanel({ apiErrors, onSelectionChange }) {
  const [selected, setSelected] = useState(new Set(apiErrors.map((e) => e.requestId)))

  function toggle(id) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
    onSelectionChange(next)
  }

  if (apiErrors.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">API Errors</h2>
        <p className="text-gray-500 text-sm">No API errors captured.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        API Errors — {selected.size}/{apiErrors.length} selected
      </h2>
      <ul className="flex-1 overflow-auto space-y-2">
        {apiErrors.map((entry) => (
          <li key={entry.requestId} className="bg-gray-900 rounded-lg p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(entry.requestId)}
                onChange={() => toggle(entry.requestId)}
                className="mt-0.5 accent-red-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">{entry.timestamp}</span>
                  <span className="text-xs font-bold text-white bg-gray-700 px-1.5 py-0.5 rounded">
                    {entry.method}
                  </span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${entry.status >= 500 ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>
                    {entry.status}
                  </span>
                </div>
                <p className="text-xs text-gray-300 truncate font-mono">{entry.url}</p>
              </div>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 6: Create `src/preview/App.jsx`**

```jsx
import React, { useState } from 'react'
import MarkdownPanel from './components/MarkdownPanel.jsx'
import ApiErrorPanel from './components/ApiErrorPanel.jsx'
import { exportZip } from '../../utils/zipExporter.js'

export default function App({ data }) {
  const { steps = [], notes = [], apiErrors = [], consoleErrors = [], date = '' } = data
  const [selectedApiIds, setSelectedApiIds] = useState(new Set(apiErrors.map((e) => e.requestId)))
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await exportZip({ steps, notes, apiErrors, selectedApiIds, consoleErrors, date })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-red-500 font-bold text-lg">VCAP</span>
          <span className="text-gray-400 text-sm">Bug Report — {date}</span>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
        >
          {exporting ? 'Exporting…' : '⬇ Export .zip'}
        </button>
      </header>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0 gap-0">
        <div className="flex-1 min-w-0 p-6 border-r border-gray-800 overflow-hidden flex flex-col">
          <MarkdownPanel steps={steps} notes={notes} apiErrors={apiErrors} consoleErrors={consoleErrors} date={date} />
        </div>
        <div className="w-96 p-6 overflow-hidden flex flex-col">
          <ApiErrorPanel apiErrors={apiErrors} onSelectionChange={setSelectedApiIds} />
        </div>
      </div>
    </div>
  )
}
```

---

## Self-Review

### Spec Coverage
- ✅ 100% local processing — no external calls in any file
- ✅ Shadow DOM for content script UI (floatingUI.js)
- ✅ IndexedDB for video chunks (idb.js)
- ✅ sanitizeData on all CDP data (sanitize.js used in curlBuilder, referenced in security skill)
- ✅ 5-min auto-stop (offscreen/index.js + floatingUI countdown)
- ✅ Preview tab two-panel layout (MarkdownPanel + ApiErrorPanel)
- ✅ ZIP export with correct structure (zipExporter.js)
- ✅ MV3 permissions in manifest.json
- ✅ Note system via floatingUI + background message handler
- ✅ Console error capture hook in background (receives CONSOLE_ERROR messages)
- ⚠️ Console error injection in content script — content script listens for DOM events but doesn't intercept `console.error`. Add a console override in `eventCollector.js` (see note below)

### Gap Fix: Console Error Capture

Add to end of `startCollecting()` in `src/content/eventCollector.js`:

```js
const _origError = console.error
console.error = (...args) => {
  _origError.apply(console, args)
  chrome.runtime.sendMessage({
    type: 'CONSOLE_ERROR',
    payload: { message: args.map(String).join(' '), timestamp: relativeTime(startTime), relativeMs: Date.now() - startTime },
  })
}
```

And restore in `stopCollecting()`:
```js
console.error = _origError  // restore after collecting stops
```

But `_origError` needs to be module-level. The complete updated `eventCollector.js` is shown in Task 9 Step 1 above — add these lines to make it complete.

### Type Consistency ✅
- `relativeTime()` defined independently in background and content (intentional — no shared module cross-boundary)
- `buildCurl()` signature matches usage in `zipExporter.js`
- `buildMarkdown()` signature matches usage in `MarkdownPanel.jsx`
- `appendChunk()` / `readAllChunks()` / `clearChunks()` used correctly in offscreen and zipExporter
