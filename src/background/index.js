// ── State persistence (Fix 1: survives SW termination) ───────────────────
// In-memory cache (fast reads, lost on SW termination)
import { clearChunks } from '../utils/idb.js'

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
// Fix 2: Set status immediately to prevent double-click race condition
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

  // Fix 4: Catch debugger attach conflicts
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
  chrome.runtime.sendMessage({ type: 'START_CAPTURE', tabId })

  const state = await getState()
  // Notify content script
  chrome.tabs.sendMessage(tabId, { type: 'RECORDING_STARTED', startTime: state.startTime })

  chrome.action.setTitle({ title: 'VCAP: Recording… (click to stop)' })
  chrome.action.setBadgeText({ text: 'REC' })
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
}

// ── Stop ──────────────────────────────────────────────────────────────────
async function stopRecording() {
  const state = await getState()
  const { tabId } = state

  // Fix 3: Wrap detach in try/catch — tab may already be closed
  try {
    await chrome.debugger.detach({ tabId })
  } catch (err) {
    console.warn('[vcap] Debugger detach failed (tab may be closed):', err.message)
  }

  // Continue cleanup regardless of detach result
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' })
  } catch (err) {
    console.warn('[vcap] Could not reach offscreen document:', err.message)
  }

  chrome.tabs.sendMessage(tabId, { type: 'RECORDING_STOPPED' })

  chrome.action.setTitle({ title: 'VCAP: Click to start recording' })
  chrome.action.setBadgeText({ text: '' })

  await setState({ status: 'stopped' })
  const finalState = await getState()

  // Save session data to chrome.storage.session for preview tab to read
  await chrome.storage.session.set({
    vcapSession: {
      steps: finalState.steps,
      notes: finalState.notes,
      apiErrors: finalState.apiErrors,
      consoleErrors: finalState.consoleErrors,
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
      // Fix 6: Cap array growth
      if (state.apiErrors.length < MAX_ENTRIES) {
        await setState({ apiErrors: [...state.apiErrors, entry] })
      }
      pendingRequests.delete(params.requestId)
    }
  }
})

// ── Messages from Content Script, Offscreen & Preview Tab ────────────────
// Fix 5: Validate sender to ignore external messages
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== chrome.runtime.id) return
  handleMessage(msg)
})

async function handleMessage(msg) {
  const state = await getState()

  // NEW_RECORDING from preview tab: clear everything and start fresh
  if (msg.type === 'NEW_RECORDING') {
    if (state.status === 'recording') return // already recording
    await resetState()
    await setState({ status: 'recording' })
    // Clear old video chunks from IndexedDB
    try { await clearChunks() } catch (_) {}
    // Clear previous session from storage
    await chrome.storage.session.remove('vcapSession')
    // Get the active tab to record
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

  // Fix 6: Cap array growth at MAX_ENTRIES
  if (msg.type === 'DOM_EVENT' && state.steps.length < MAX_ENTRIES) {
    await setState({ steps: [...state.steps, msg.payload] })
  }
  if (msg.type === 'NOTE_ADDED' && state.notes.length < MAX_ENTRIES) {
    await setState({ notes: [...state.notes, msg.payload] })
  }
  if (msg.type === 'CONSOLE_ERROR' && state.consoleErrors.length < MAX_ENTRIES) {
    await setState({ consoleErrors: [...state.consoleErrors, msg.payload] })
  }
}

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
