import { startCollecting, stopCollecting, getStepsAndClear } from './eventCollector.js'
import { showBadge, hideBadge } from './floatingUI.js'
import { showNoteDialog } from './noteDialog.js'  // ← FB#3
import { MSG } from '../shared/messages.js'

// [Phase 1 fix] Listen for canonical message names.
// Background now sends MSG.START_RECORDING / MSG.STOP_RECORDING (was RECORDING_STARTED / RECORDING_STOPPED).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === MSG.START_RECORDING) {
    startCollecting()
    showBadge()
    // no response needed
  }

  if (msg.type === MSG.STOP_RECORDING) {
    stopCollecting()
    hideBadge()
    // [Phase 1 fix] Return collected events as a batch so Background can merge them
    const { steps, consoleErrors } = getStepsAndClear()
    sendResponse({ steps, consoleErrors })
    return true // keep message channel open for async sendResponse
  }

  // ← FB#3: Background tells content script to open the Add Note dialog
  if (msg.type === MSG.SHOW_NOTE_DIALOG) {
    showNoteDialog()
  }
})

// [A3 fix] Startup check: if content script loads after Background already started recording
// (race condition on slow pages), kick off collection immediately.
chrome.runtime.sendMessage({ type: MSG.QUERY_STATUS }, (res) => {
  if (chrome.runtime.lastError) return // extension context may not be ready — ignore
  if (res?.status === 'recording') {
    startCollecting()
    showBadge()
  }
})

// [H1] Emergency flush before page unload (hard navigation / server redirect / form submit).
// The content script is about to be destroyed — send any buffered events to
// background NOW so they are not lost during SPA navigation between tabs.
window.addEventListener('beforeunload', () => {
  const { steps, consoleErrors } = getStepsAndClear()
  if (steps.length === 0 && consoleErrors.length === 0) return
  try {
    chrome.runtime.sendMessage({
      type: MSG.FLUSH_EVENTS,
      payload: { steps, consoleErrors },
    })
  } catch (_) { /* extension context may already be invalid */ }
})

