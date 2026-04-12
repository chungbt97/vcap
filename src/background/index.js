import { clearChunks, clearScreenshots, appendScreenshot } from '../utils/idb.js'
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
  apiRequests: [],
  consoleErrors: [],
  screenshotCount: 0,
}

const MAX_ENTRIES = 5000
const MAX_SESSIONS = 5  // keep last N sessions in history

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

// ── [C4] Popup sends START_RECORDING_REQUEST (action.onClicked removed) ────
// NOTE: chrome.action.onClicked is NOT registered here.
// When manifest has a default_popup, Chrome will never fire action.onClicked anyway.

// ── Start ─────────────────────────────────────────────────────────────────
async function startRecording(tabId) {
  await setState({ tabId, startTime: Date.now(), steps: [], notes: [], apiRequests: [], consoleErrors: [], screenshotCount: 0 })

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

  // [H5] Clear IDB at the START of a new recording (not at export end).
  // This allows the user to re-export the previous session as many times as needed.
  try { await clearChunks() } catch (_) {}
  try { await clearScreenshots() } catch (_) {}


  await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {})

  // [E5] Enable Runtime domain — CSP-proof console error + exception capture
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable', {})
  } catch (err) {
    console.warn('[vcap] Runtime.enable failed (non-fatal):', err.message)
  }

  // Create offscreen document for MediaRecorder
  await ensureOffscreen()

  // Get tabCapture stream ID from Background context (MV3 requirement)
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
    console.warn('[vcap] tabCapture.getMediaStreamId failed:', err.message)
  }

  chrome.runtime.sendMessage({ type: MSG.START_CAPTURE, tabId, streamId })

  const state = await getState()
  chrome.tabs.sendMessage(tabId, { type: MSG.START_RECORDING, startTime: state.startTime })

  chrome.action.setTitle({ title: 'VCAP: Recording… (click to stop)' })
  chrome.action.setBadgeText({ text: 'REC' })
  chrome.action.setBadgeBackgroundColor({ color: '#f97300' })
}

// ── Stop ──────────────────────────────────────────────────────────────────
async function stopRecording() {
  const state = await getState()
  const { tabId } = state

  // Detach debugger
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

  // Collect DOM events from content script
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
}

// ── Persist session + open Side Panel (called after CAPTURE_DONE) ─────────
async function finalizeSession() {
  const state = await getState()
  const { vcapTicketName } = await chrome.storage.local.get('vcapTicketName')

  const sessionEntry = {
    steps: state.steps,
    notes: state.notes,
    apiRequests: state.apiRequests,
    consoleErrors: state.consoleErrors,
    screenshotCount: state.screenshotCount,
    date: new Date().toISOString(),
    ticketName: vcapTicketName || '',
  }

  // Save current session for panel to read
  await chrome.storage.session.set({ vcapSession: sessionEntry })

  // Save session to history (keep last MAX_SESSIONS)
  const { vcapSessions = [] } = await chrome.storage.local.get('vcapSessions')
  const updatedSessions = [sessionEntry, ...vcapSessions].slice(0, MAX_SESSIONS)
  await chrome.storage.local.set({ vcapSessions: updatedSessions })

  // [A4 fix] Reset status to 'idle' so second recording works
  await setState({ status: 'idle' })

  // ✅ Side panel is opened via the Popup "Open Full Panel" button (user gesture).
  // chrome.sidePanel.open() cannot be called here — finalizeSession runs from an
  // offscreen CAPTURE_DONE message, which is NOT a user gesture (MV3 restriction).
}

// ── CDP Network events ────────────────────────────────────────────────────
const pendingRequests = new Map()

// [E4] Filter out static file/resource requests — only track API/XHR calls.
// Keeps the Network tab clean and focused on backend communication.
const IGNORED_REQUEST_PATTERNS = [
  /\.(?:js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico|webp|avif|mp4|webm|mp3|wav|ogg|pdf|wasm)(\?|#|$)/i,
  /^chrome-extension:\/\//,
  /^data:/,
  /^blob:/,
  /\/favicon\./i,
  /\/hot-update\./i,        // webpack HMR
  /\/__webpack_hmr/i,
  /\/sockjs-node/i,
  /\/livereload/i,
]

function shouldTrackRequest(url) {
  if (!url) return false
  return !IGNORED_REQUEST_PATTERNS.some((p) => p.test(url))
}

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  const state = await getState()
  if (state.status !== 'recording' || source.tabId !== state.tabId) return

  if (method === 'Network.requestWillBeSent') {
    // [E4] Only track API/XHR calls — skip static assets
    if (!shouldTrackRequest(params.request.url)) return
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
    if (entry) {
      if (entry.status >= 400 || entry.status === 0) {
        try {
          const { body } = await chrome.debugger.sendCommand(
            { tabId: state.tabId },
            'Network.getResponseBody',
            { requestId: params.requestId }
          )
          entry.responseBody = body
        } catch (_) {}
      }
      const safeEntry = sanitizeApiError(entry)
      if (state.apiRequests.length < MAX_ENTRIES) {
        await setState({ apiRequests: [...state.apiRequests, safeEntry] })
      }
      pendingRequests.delete(params.requestId)
    }
  }

  // [E5] CDP Runtime — exception capture (CSP-proof, no page injection needed)
  if (method === 'Runtime.exceptionThrown') {
    const details = params.exceptionDetails
    const desc =
      details?.exception?.description ||
      details?.exception?.value ||
      details?.text ||
      'Unknown exception'
    const currentState = await getState()
    if (currentState.consoleErrors.length < MAX_ENTRIES) {
      await setState({
        consoleErrors: [
          ...currentState.consoleErrors,
          {
            id: `ce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: relativeTime(currentState.startTime),
            message: String(desc).slice(0, 500),
            source: 'exception',
          },
        ],
      })
    }
  }

  // [E5] CDP Runtime — console API calls (error + warn)
  if (method === 'Runtime.consoleAPICalled') {
    if (params.type !== 'error' && params.type !== 'warning' && params.type !== 'warn') return
    const message = (params.args || [])
      .map((a) => {
        if (a.type === 'string') return a.value
        if (a.description) return a.description
        if (a.value !== undefined) return String(a.value)
        return a.type
      })
      .join(' ')
      .slice(0, 500)
    if (!message) return
    const currentState = await getState()
    if (currentState.consoleErrors.length < MAX_ENTRIES) {
      await setState({
        consoleErrors: [
          ...currentState.consoleErrors,
          {
            id: `ce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: relativeTime(currentState.startTime),
            message,
            source: params.type,  // 'error' | 'warning' | 'warn'
          },
        ],
      })
    }
  }
})

// ── Messages ──────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return

  // [A3] QUERY_STATUS — content script startup check + popup state query
  if (msg.type === MSG.QUERY_STATUS) {
    getState().then((state) => {
      sendResponse({ status: state.status, startTime: state.startTime, screenshotCount: state.screenshotCount })
    })
    return true
  }

  // [C4] START_RECORDING_REQUEST — from Popup
  if (msg.type === MSG.START_RECORDING_REQUEST) {
    ;(async () => {
      const state = await getState()
      if (state.status === 'recording') {
        sendResponse({ ok: false, error: 'Already recording' })
        return
      }
      await resetState()
      await setState({ status: 'recording' })
      // [H5] IDB cleared inside startRecording() — no need here
      await chrome.storage.session.remove('vcapSession')

      // Read ticket name set by popup before sending start request
      const { vcapTicketName } = await chrome.storage.local.get('vcapTicketName')
      void vcapTicketName  // stored in local; finalizeSession reads it

      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!activeTab) {
        await setState({ status: 'idle' })
        sendResponse({ ok: false, error: 'No active tab' })
        return
      }
      try {
        await startRecording(activeTab.id)
        sendResponse({ ok: true })
      } catch (err) {
        await setState({ status: 'idle' })
        sendResponse({ ok: false, error: err.message })
      }
    })()
    return true
  }

  // [C4] STOP_RECORDING_REQUEST — from Popup
  if (msg.type === MSG.STOP_RECORDING_REQUEST) {
    ;(async () => {
      const state = await getState()
      if (state.status !== 'recording') {
        sendResponse({ ok: false, error: 'Not currently recording' })
        return
      }
      await setState({ status: 'stopping' })
      try {
        await stopRecording()
        sendResponse({ ok: true })
      } catch (err) {
        await setState({ status: 'recording' })
        sendResponse({ ok: false, error: err.message })
      }
    })()
    return true
  }

  // [C4] TAKE_SCREENSHOT — captureVisibleTab → convert → save to IDB
  if (msg.type === MSG.TAKE_SCREENSHOT) {
    ;(async () => {
      try {
        const state = await getState()
        const tabId = state.tabId || msg.tabId
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' })
        // Service workers cannot use URL.createObjectURL, but fetch(dataUrl) works fine
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        const timestamp = state.startTime ? relativeTime(state.startTime) : '00:00'
        await appendScreenshot({ blob, timestamp, tabId })
        const newCount = (state.screenshotCount || 0) + 1
        await setState({ screenshotCount: newCount })
        sendResponse({ ok: true, screenshotCount: newCount })
      } catch (err) {
        console.error('[vcap] TAKE_SCREENSHOT failed:', err)
        sendResponse({ ok: false, error: err.message })
      }
    })()
    return true
  }

  // [C4] EXPORT_SESSION — signal stored to session storage; panel/popup reads it and calls exportSession()
  // Background cannot use URL.createObjectURL (MV3 SW limitation), so the actual export
  // happens in the popup or panel context which is a normal HTML page.
  if (msg.type === MSG.EXPORT_SESSION) {
    ;(async () => {
      // Write a trigger to session storage so panel/popup re-exports on change
      await chrome.storage.session.set({ vcapExportTrigger: Date.now() })
      sendResponse({ ok: true })
    })()
    return true
  }

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

  // ── Offscreen lifecycle handlers ──────────────────────────────────────
  if (msg.type === MSG.CAPTURE_DONE) {
    console.log('[vcap] CAPTURE_DONE received — finalizing session')
    await finalizeSession()
    return
  }

  if (msg.type === MSG.CAPTURE_FAILED) {
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
    console.error('[vcap] CAPTURE_ERROR:', msg.error)
    return
  }

  // ── Content Script real-time events ───────────────────────────────────
  if (msg.type === MSG.DOM_EVENT && state.steps.length < MAX_ENTRIES) {
    await setState({ steps: [...state.steps, msg.payload] })
  }
  if (msg.type === MSG.NOTE_ADDED && state.notes.length < MAX_ENTRIES) {
    await setState({ notes: [...state.notes, msg.payload] })
  }
  if (msg.type === MSG.CONSOLE_ERROR && state.consoleErrors.length < MAX_ENTRIES) {
    await setState({ consoleErrors: [...state.consoleErrors, msg.payload] })
  }

  // [H1] FLUSH_EVENTS — periodic sync + beforeunload emergency flush from content script.
  // Accumulates events from content scripts across SPA navigations (tab loses/re-gains page).
  if (msg.type === MSG.FLUSH_EVENTS) {
    if (state.status !== 'recording') return
    const { steps: newSteps = [], consoleErrors: newConsole = [] } = msg.payload || {}
    if (newSteps.length === 0 && newConsole.length === 0) return
    const merged = [...state.steps, ...newSteps].slice(0, MAX_ENTRIES)
    const mergedConsole = [...state.consoleErrors, ...newConsole].slice(0, MAX_ENTRIES)
    await setState({ steps: merged, consoleErrors: mergedConsole })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument()
  if (!existing) {
    await chrome.offscreen.createDocument({
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
