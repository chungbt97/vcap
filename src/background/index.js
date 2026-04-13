import { clearChunks, clearScreenshots, appendScreenshot } from '../utils/idb.js'
import { MSG } from '../shared/messages.js'
import { sanitizeApiError } from '../utils/sanitize.js'
import config from '../../vcap.config.js'

// ── State persistence (survives SW termination) ───────────────────────────
let _state = null

const DEFAULT_STATE = {
  status: 'idle',         // 'idle' | 'countdown' | 'recording' | 'stopping' | 'stopped'
  tabId: null,
  tabTitle: null,         // ← FB#1: display in popup
  countdownTarget: null,  // ← FB#4: epoch ms when countdown ends (SW-safe)
  startTime: null,
  steps: [],
  notes: [],
  apiRequests: [],
  consoleErrors: [],
  screenshotCount: 0,
}

const MAX_ENTRIES = config.MAX_ENTRIES || 5000
const MAX_SESSIONS = 5  // keep last N sessions in history

// ── Countdown interval (module-level, reset on SW restart) ────────────────
let _countdownInterval = null

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
  // ← FB#1: Fetch tab title so popup can display which tab is being recorded
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  const tabTitle = tab?.title || 'Unknown Tab'

  await setState({ tabId, tabTitle, startTime: Date.now(), steps: [], notes: [], apiRequests: [], consoleErrors: [], screenshotCount: 0 })

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

  // Guard: offscreen may not be ready yet — ignore "Receiving end does not exist"
  try {
    chrome.runtime.sendMessage({ type: MSG.START_CAPTURE, tabId, streamId })
  } catch (err) {
    console.warn('[vcap] Could not reach offscreen for START_CAPTURE:', err.message)
  }

  // Ensure content script is alive before sending START_RECORDING.
  // If the extension was reloaded or the tab was open before install, the script
  // won't be running — inject it programmatically so DOM collection works.
  await ensureContentScript(tabId)

  const state = await getState()
  // Fire-and-forget: content script may legitimately be absent on restricted pages.
  chrome.tabs.sendMessage(tabId, { type: MSG.START_RECORDING, startTime: state.startTime })
    .catch((err) => console.warn('[vcap] START_RECORDING not delivered:', err.message))

  // ← FB#1: Per-tab badge — only appears on the recording tab's icon
  chrome.action.setTitle({ title: 'VCAP: Recording… (click to stop)' })
  chrome.action.setBadgeText({ tabId, text: 'REC' })
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#E3450A' })

  // ← FB#3 / FB#6A: Dynamic context menu — only visible while recording
  // Parent item "Vcap Flash Action" with two children
  chrome.contextMenus.create({
    id: 'vcap-flash-action',
    title: '⚡ Vcap Flash Action',
    contexts: ['all'],
  })
  chrome.contextMenus.create({
    id: 'vcap-add-note',
    parentId: 'vcap-flash-action',
    title: '📝 Add Note',
    contexts: ['all'],
  })
  chrome.contextMenus.create({
    id: 'vcap-take-screenshot',
    parentId: 'vcap-flash-action',
    title: '📸 Take a screenshot',
    contexts: ['all'],
  })
}

// ── Stop ──────────────────────────────────────────────────────────────────
async function stopRecording() {
  const state = await getState()
  const { tabId } = state

  // ← FB#6A: Remove parent context menu — children are removed automatically
  chrome.contextMenus.remove('vcap-flash-action').catch(() => {})

  // Detach debugger immediately so Chrome info bar can dismiss ASAP.
  requestDebuggerDetachFast(tabId)

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

  // ← FB#1: Per-tab badge clear
  chrome.action.setTitle({ title: 'VCAP: Click to start recording' })
  chrome.action.setBadgeText({ tabId, text: '' })
}

async function detachDebuggerSafe(tabId) {
  if (!tabId) return
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await chrome.debugger.detach({ tabId })
    } catch (err) {
      console.warn('[vcap] Debugger detach attempt failed:', err.message)
    }

    const detached = await isDebuggerDetached(tabId)
    if (detached) return
    await new Promise((r) => setTimeout(r, 80))
  }

  console.warn('[vcap] Debugger may still be attached after retries')
}

function requestDebuggerDetachFast(tabId) {
  if (!tabId) return

  // Fire first detach immediately (non-blocking) for fastest UI dismissal.
  chrome.debugger.detach({ tabId }).catch((err) => {
    console.warn('[vcap] Immediate debugger detach failed:', err.message)
  })

  // Fallback verification/retry in background, off critical stop path.
  setTimeout(() => {
    detachDebuggerSafe(tabId).catch(() => {})
  }, 120)
}

async function isDebuggerDetached(tabId) {
  try {
    const targets = await chrome.debugger.getTargets()
    const pageTarget = targets.find((t) => t.type === 'page' && t.tabId === tabId)
    return !pageTarget?.attached
  } catch (_) {
    return true
  }
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
  // Next.js RSC internal requests
  /[?&]_?rsc=/i,
  // Next.js internal data requests
  /\/_next\/data\//i,
  // Next.js static assets
  /\/_next\/static\//i,
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
    const entry = {
      requestId: params.requestId,
      method: params.request.method,
      url: params.request.url,
      requestHeaders: params.request.headers,
      requestBody: parseBody(params.request.postData),
      timestamp: relativeTime(state.startTime),
    }
    enrichGraphQLInfo(entry)  // ← FB#2
    pendingRequests.set(params.requestId, entry)
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
      // ← FB#2: also fetch body for GraphQL 200 (may contain errors[] field)
      if (entry.status >= 400 || entry.status === 0 || entry.isGraphQL) {
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

chrome.debugger.onDetach.addListener(async (source) => {
  const state = await getState()
  if (source.tabId !== state.tabId) return

  if (state.tabId) {
    chrome.action.setBadgeText({ tabId: state.tabId, text: '' })
  }
  chrome.action.setTitle({ title: 'VCAP: Click to start recording' })

  if (state.status === 'recording' || state.status === 'stopping') {
    await setState({ status: 'stopped' })
  }
})

// ── FB#1: Tab title sync — update tabTitle when the recording tab navigates ──
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return
  const state = await getState()
  if (state.status !== 'recording' || state.tabId !== tabId) return
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (tab?.title) await setState({ tabTitle: tab.title })
})

// ── FB#3 / FB#6A: Context menu clicks ────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // "📝 Add Note" — send SHOW_NOTE_DIALOG to content script
  if (info.menuItemId === 'vcap-add-note') {
    const state = await getState()
    if (state.status !== 'recording') return
    chrome.tabs.sendMessage(tab.id, { type: MSG.SHOW_NOTE_DIALOG }).catch(() => {})
    return
  }

  // "📸 Take a screenshot" — capture + save to IDB (same as TAKE_SCREENSHOT handler)
  if (info.menuItemId === 'vcap-take-screenshot') {
    const state = await getState()
    if (state.status !== 'recording') return
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const timestamp = state.startTime ? relativeTime(state.startTime) : '00:00'
      await appendScreenshot({ blob, timestamp, tabId: tab.id })
      const newCount = (state.screenshotCount || 0) + 1
      await setState({ screenshotCount: newCount })
    } catch (err) {
      console.error('[vcap] context menu screenshot failed:', err)
    }
  }
})

// ── Messages ──────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return

  // [A3] QUERY_STATUS — content script startup check + popup state query
  if (msg.type === MSG.QUERY_STATUS) {
    getState().then((state) => {
      sendResponse({
        status: state.status,
        startTime: state.startTime,
        screenshotCount: state.screenshotCount,
        tabTitle: state.tabTitle,        // ← FB#1
        tabId: state.tabId,              // ← FB#1
        countdownTarget: state.countdownTarget, // ← FB#4
      })
    })
    return true
  }

  // [C4] START_RECORDING_REQUEST — from Popup
  if (msg.type === MSG.START_RECORDING_REQUEST) {
    ;(async () => {
      const state = await getState()
      // ← FB#4: Guard against starting while countdown is in progress
      if (state.status === 'recording' || state.status === 'countdown') {
        sendResponse({ ok: false, error: 'Already recording or countdown in progress' })
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

  // [C4] TAKE_SCREENSHOT — captureVisibleTab → convert → save to IDB (recording)
  //                       or download directly to Downloads (not recording)
  if (msg.type === MSG.TAKE_SCREENSHOT) {
    ;(async () => {
      try {
        const state = await getState()
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' })

        if (state.status === 'recording') {
          // ── Recording: save to IDB → will be included in ZIP export ──────
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const timestamp = state.startTime ? relativeTime(state.startTime) : '00:00'
          const tabId = state.tabId || msg.tabId
          await appendScreenshot({ blob, timestamp, tabId })
          const newCount = (state.screenshotCount || 0) + 1
          await setState({ screenshotCount: newCount })
          sendResponse({ ok: true, screenshotCount: newCount })
        } else {
          // ← FB#6B: Not recording — download directly to Downloads folder
          const d = new Date()
          const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
          chrome.downloads.download({
            url: dataUrl,
            filename: `vcap-screenshot_${ts}.png`,
            saveAs: false,
          })
          sendResponse({ ok: true, screenshotCount: state.screenshotCount || 0 })
        }
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

  // ← FB#4: START_COUNTDOWN — popup sends this immediately before window.close()
  if (msg.type === MSG.START_COUNTDOWN) {
    ;(async () => {
      const { totalSeconds = 5 } = msg
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!activeTab) { sendResponse({ ok: false }); return }

      const countdownTarget = Date.now() + totalSeconds * 1000
      await setState({ status: 'countdown', tabId: activeTab.id, countdownTarget })
      resumeCountdown(activeTab.id, totalSeconds)
      sendResponse({ ok: true })
    })()
    return true
  }

  // ← FB#4: CANCEL_COUNTDOWN — popup cancels the countdown
  if (msg.type === MSG.CANCEL_COUNTDOWN) {
    ;(async () => {
      const state = await getState()
      if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null }
      if (state.tabId) chrome.action.setBadgeText({ tabId: state.tabId, text: '' })
      chrome.action.setTitle({ title: 'VCAP: Click to start recording' })
      await resetState()
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
    // ← FB#1: Per-tab badge clear
    if (state.tabId) chrome.action.setBadgeText({ tabId: state.tabId, text: '' })
    await setState({ status: 'idle' })
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

  // ← FB#3: Enrich note with relative timestamp before storing
  if (msg.type === MSG.NOTE_ADDED && state.notes.length < MAX_ENTRIES) {
    const note = { ...msg.payload, relativeTimestamp: relativeTime(state.startTime) }
    await setState({ notes: [...state.notes, note] })
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

/**
 * ensureContentScript — Guarantee the content script is running on a tab before
 * trying to send it messages. This handles two failure scenarios:
 *
 *   1. Extension was reloaded/updated — content scripts in existing tabs are
 *      destroyed and NOT automatically re-injected. The service worker is fresh
 *      but the tab still has the old (dead) context.
 *
 *   2. Tab opened before the extension was installed — content script never ran.
 *
 * Strategy:
 *   - Send a lightweight QUERY_STATUS ping.
 *   - If the ping succeeds (any response or empty response) → content script is alive.
 *   - If it throws "Receiving end does not exist" → inject programmatically via
 *     chrome.scripting.executeScript, then wait a tick for the script to register
 *     its message listener before we send START_RECORDING.
 */
async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: MSG.QUERY_STATUS })
    // Content script responded — it is alive.
  } catch (_) {
    // Content script not present — inject it now.
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/index.js'],
      })
      // Give the injected script a tick to register its chrome.runtime.onMessage listener
      await new Promise((r) => setTimeout(r, 100))
    } catch (injectErr) {
      // Can't inject (e.g. chrome:// pages, extension pages, PDF viewer).
      // Recording will proceed without DOM step collection.
      console.warn('[vcap] Could not inject content script:', injectErr.message)
    }
  }
}

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

// ── FB#2: GraphQL enrichment helpers ─────────────────────────────────────

function extractOperationType(query) {
  if (!query) return 'query'
  const match = query.trim().match(/^(query|mutation|subscription)\b/i)
  return match ? match[1].toLowerCase() : 'query'
}

function extractOperationName(query) {
  if (!query) return 'Anonymous'
  const match = query.trim().match(/^(?:query|mutation|subscription)\s+(\w+)/i)
  return match ? match[1] : 'Anonymous'
}

function enrichGraphQLInfo(entry) {
  const body = entry.requestBody
  if (!body || typeof body !== 'object') return

  // Single operation
  if (body.query) {
    entry.isGraphQL = true
    entry.gqlOperationName = body.operationName || extractOperationName(body.query)
    entry.gqlOperationType = extractOperationType(body.query)
    entry.gqlQuery = body.query
    entry.gqlVariables = body.variables
    return
  }

  // Apollo batched queries (array body)
  if (Array.isArray(body) && body.length > 0 && body[0]?.query) {
    entry.isGraphQL = true
    entry.gqlBatch = true
    entry.gqlOperations = body.map((op) => ({
      operationName: op.operationName || extractOperationName(op.query),
      operationType: extractOperationType(op.query),
    }))
    // Use first operation name as display name, suffix count for batched
    entry.gqlOperationName = entry.gqlOperations[0]?.operationName +
      (entry.gqlOperations.length > 1 ? ` +${entry.gqlOperations.length - 1}` : '')
    entry.gqlOperationType = entry.gqlOperations[0]?.operationType
  }
}

// ── FB#4: Countdown helper ────────────────────────────────────────────────

function resumeCountdown(tabId, remaining) {
  if (_countdownInterval) clearInterval(_countdownInterval)

  // Show initial badge per-tab (amber)
  chrome.action.setBadgeText({ tabId, text: String(remaining) })
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#ffa110' })
  chrome.action.setTitle({ title: `VCAP: Starting in ${remaining}s…` })

  _countdownInterval = setInterval(async () => {
    remaining--
    if (remaining > 0) {
      chrome.action.setBadgeText({ tabId, text: String(remaining) })
      chrome.action.setTitle({ title: `VCAP: Starting in ${remaining}s…` })
    } else {
      clearInterval(_countdownInterval)
      _countdownInterval = null
      chrome.action.setBadgeText({ tabId, text: '' })
      chrome.action.setTitle({ title: 'VCAP' })
      await resetState()
      await setState({ status: 'recording', tabId })
      await chrome.storage.session.remove('vcapSession')
      await startRecording(tabId)
    }
  }, 1000)
}

// ── FB#4: Startup recovery — resume countdown if SW was terminated mid-count ─
;(async () => {
  const state = await getState()
  if (state.status === 'countdown' && state.countdownTarget && state.tabId) {
    const remaining = Math.ceil((state.countdownTarget - Date.now()) / 1000)
    if (remaining <= 0) {
      // SW was terminated after countdown expired → start recording immediately
      await resetState()
      await setState({ status: 'recording', tabId: state.tabId })
      await chrome.storage.session.remove('vcapSession')
      await startRecording(state.tabId)
    } else {
      resumeCountdown(state.tabId, remaining)
    }
  }
})()
