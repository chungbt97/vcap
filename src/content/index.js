import { startCollecting, stopCollecting, getStepsAndClear } from './eventCollector.js'
import { showBadge, hideBadge } from './floatingUI.js'

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_RECORDING') {
    startCollecting()
    showBadge()
  }

  if (msg.type === 'STOP_RECORDING') {
    stopCollecting()
    hideBadge()
    const { steps, consoleErrors } = getStepsAndClear()
    sendResponse({ steps, consoleErrors })
    return true
  }
})
