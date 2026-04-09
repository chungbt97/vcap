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
