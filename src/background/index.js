import { clearChunks } from '../utils/idb.js'
import { MSG } from '../shared/messages.js'
import { sanitizeApiError } from '../utils/sanitize.js'

// ── State persistence (survives SW termination) ───────────────────────────
let _state = null

const DEFAULT_STATE = {
  status: 'idle',    // 'idle' | 'recording' | 'stopping' | 'stopped'
  tabId: null,
  startTime: null,
  steps: [],
  notes: [],
  apiErrors: [],
  consoleErrors: [],
}

const MAX_ENTRIES = 5000

async function getState() {
  if (_state) return _state
  const { vcapState } = await chrome.storage.session.get('vcapState')
  _state = vcapState ?? { ...DEFAULT_STATE }
  return _state
}

async function setState(patch) {
  _state = { ..._state, ...patch }
  await chrome.storage.session.set({ vcapState: _state })
}

async function resetState() {
  _state = { ...DEFAULT_STATE }
  await chrome.storage.session.set({ vcapState: _state })
}

// ── Icon click: toggle recording ──────────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  const state = await getState()
  if (state.status === 'idle') {
    await setState({ status: 'recording' })
    try {
      await startRecording(tab.id)
    } catch (err) {
      await setState({ status: 'idle' })
      console.error('[vcap] Failed to start recording:', err)
    }
  } else if (state.status === 'recording') {
    await setState({ status: 'stopping' })
    try {
      await stopRecording()
    } catch (err) {
      await setState({ status: 'recording' })
      console.error('[vcap] Failed to stop recording:', err)
    }
  }
})

// ── Start ─────────────────────────────────────────────────────────────────
async function startRecording(tabId) {
  await setState({ tabId, startTime: Date.now(), steps: [], notes: [], apiErrors: [], consoleErrors: [] })

  // Attach Chrome Debugger for network capture
  try {
    await chrome.debugger.attach({ tabId }, '1.3')
  } catch (err) {
    await setState({ status: 'idle' })
    const msg = err.message?.includes('Cannot attach')
      ? 'Another tool (DevTools/Lighthouse) is using the debugger on this tab. Close it and try again.'
      : `Failed to start recording: ${err.message}`
    chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon48.svg', title: 'VCAP', message: msg })
    return
  }

  await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {})

  // Create offscreen document for MediaRecorder
  await ensureOffscreen()

  // [Phase 0 Q4 + Phase 1 fix] Get a tabCapture stream ID from Background context.
  // In MV3, chrome.tabCapture.getMediaStreamId() must be called from Background (Service Worker),
  // then the streamId is forwarded to the Offscreen document which calls getUserMedia() with it.
  let streamId = null
  try {
    streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(id)
        }
      })
    })
  } catch (err) {
    console.warn('[vcap] tabCapture.getMediaStreamId failed, recording may not capture the right tab:', err.message)
  }

  // Forward streamId (and tabId) to Offscreen so it can call getUserMedia with the correct stream
  chrome.runtime.sendMessage({ type: MSG.START_CAPTURE, tabId, streamId })

  // [Phase 1 fix] Use canonical MSG constant — was 'RECORDING_STARTED' (wrong)
  const state = await getState()
  chrome.tabs.sendMessage(tabId, { type: MSG.START_RECORDING, startTime: state.startTime })

  chrome.action.setTitle({ title: 'VCAP: Recording… (click to stop)' })
  chrome.action.setBadgeText({ text: 'REC' })
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
}

// ── Stop ──────────────────────────────────────────────────────────────────
// [Phase 1 fix] stopRecording() no longer opens preview directly.
// Preview is opened only after CAPTURE_DONE is received from Offscreen.
async function stopRecording() {
  const state = await getState()
  const { tabId } = state

  // Detach debugger (tab may already be closed)
  try {
    await chrome.debugger.detach({ tabId })
  } catch (err) {
    console.warn('[vcap] Debugger detach failed (tab may be closed):', err.message)
  }

  // Tell Offscreen to stop MediaRecorder
  try {
    await chrome.runtime.sendMessage({ type: MSG.STOP_CAPTURE })
  } catch (err) {
    console.warn('[vcap] Could not reach offscreen document:', err.message)
  }

  // [Phase 1 fix] Use canonical MSG constant — was 'RECORDING_STOPPED' (wrong)
  // Content script batch-sends its collected events in response (see content/index.js)
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: MSG.STOP_RECORDING })
    if (response?.steps?.length) {
      const current = await getState()
      const merged = [...current.steps, ...response.steps].slice(0, MAX_ENTRIES)
      const mergedConsole = [...current.consoleErrors, ...(response.consoleErrors || [])].slice(0, MAX_ENTRIES)
      await setState({ steps: merged, consoleErrors: mergedConsole })
    }
  } catch (err) {
    console.warn('[vcap] Could not collect events from content script:', err.message)
  }

  await setState({ status: 'stopped' })

  chrome.action.setTitle({ title: 'VCAP: Click to start recording' })
  chrome.action.setBadgeText({ text: '' })

  // NOTE: Preview tab is NOT opened here.
  // It is opened in the CAPTURE_DONE handler after Offscreen confirms all chunks are saved.
}

// ── Persist session + open preview (called after CAPTURE_DONE) ────────────
async function finalizeSession() {
  const state = await getState()
  await chrome.storage.session.set({
    vcapSession: {
      steps: state.steps,
      notes: state.notes,
      apiErrors: state.apiErrors,
      consoleErrors: state.consoleErrors,
      date: new Date().toISOString(),
    }
  })
  chrome.tabs.create({ url: chrome.runtime.getURL('src/preview/index.html') })
}

// ── CDP Network events ────────────────────────────────────────────────────
const pendingRequests = new Map()

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  const state = await getState()
  if (state.status !== 'recording' || source.tabId !== state.tabId) return

  if (method === 'Network.requestWillBeSent') {
    pendingRequests.set(params.requestId, {
      requestId: params.requestId,
      method: params.request.method,
      url: params.request.url,
      requestHeaders: params.request.headers,   // sanitized in Phase 3
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
      // [Phase 3] Sanitize at capture time — before writing to session state
      const safeEntry = sanitizeApiError(entry)
      if (state.apiErrors.length < MAX_ENTRIES) {
        await setState({ apiErrors: [...state.apiErrors, safeEntry] })
      }
      pendingRequests.delete(params.requestId)
    }
  }
})

// ── Messages from Content Script, Offscreen & Preview Tab ────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== chrome.runtime.id) return
  handleMessage(msg)
})

async function handleMessage(msg) {
  const state = await getState()

  // ── Preview Tab: start a brand-new recording ──────────────────────────
  if (msg.type === MSG.NEW_RECORDING) {
    if (state.status === 'recording') return
    await resetState()
    await setState({ status: 'recording' })
    try { await clearChunks() } catch (_) {}
    await chrome.storage.session.remove('vcapSession')
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (activeTab) {
      try {
        await startRecording(activeTab.id)
      } catch (err) {
        await setState({ status: 'idle' })
        console.error('[vcap] NEW_RECORDING failed:', err)
      }
    }
    return
  }

  // ── [Phase 1 fix] Offscreen lifecycle handlers ─────────────────────────

  if (msg.type === MSG.CAPTURE_DONE) {
    // Offscreen: MediaRecorder stopped cleanly, all chunks flushed to IDB
    console.log('[vcap] CAPTURE_DONE received — finalizing session')
    await finalizeSession()
    return
  }

  if (msg.type === MSG.CAPTURE_FAILED) {
    // Offscreen: tabCapture / getDisplayMedia was denied or failed
    console.error('[vcap] CAPTURE_FAILED:', msg.error)
    await setState({ status: 'idle' })
    chrome.action.setBadgeText({ text: '' })
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.svg',
      title: 'VCAP — Recording Failed',
      message: msg.error || 'Screen capture was denied or failed. Please try again.',
    })
    return
  }

  if (msg.type === MSG.CAPTURE_ERROR) {
    // Offscreen: non-fatal chunk error (e.g. IDB quota exceeded)
    console.error('[vcap] CAPTURE_ERROR:', msg.error)
    // If quota exceeded, the offscreen will auto-stop → CAPTURE_DONE will follow
    // No state reset needed here; just log for debug
    return
  }

  // ── Content Script real-time events (Phase 2 uses DOM_EVENT_BATCH) ─────
  if (msg.type === MSG.DOM_EVENT && state.steps.length < MAX_ENTRIES) {
    await setState({ steps: [...state.steps, msg.payload] })
  }
  if (msg.type === MSG.NOTE_ADDED && state.notes.length < MAX_ENTRIES) {
    await setState({ notes: [...state.notes, msg.payload] })
  }
  if (msg.type === MSG.CONSOLE_ERROR && state.consoleErrors.length < MAX_ENTRIES) {
    await setState({ consoleErrors: [...state.consoleErrors, msg.payload] })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument()
  if (!existing) {
    await chrome.offscreen.createDocument({
      // [Phase 1 fix] Path matches manifest.json web_accessible_resources declaration
      // vite-plugin-web-extension outputs offscreen.html to: dist/src/offscreen/offscreen.html
      // manifest declares: "src/offscreen/offscreen.html" → resolved at runtime correctly
      url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
      reasons: ['USER_MEDIA'],
      justification: 'Capture current tab video for local bug recording',
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
