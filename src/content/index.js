import { startCollecting, stopCollecting, getStepsAndClear } from './eventCollector.js'
import { showBadge, hideBadge } from './floatingUI.js'
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
