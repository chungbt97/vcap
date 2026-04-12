/**
 * page-console-capture.js
 *
 * This file is injected into the PAGE's own JS context via chrome.runtime.getURL()
 * so it is CSP-compliant (no inline script). It intercepts console.error calls
 * and forwards them to the content script via postMessage.
 *
 * Registered in manifest.json under web_accessible_resources.
 */
;(function () {
  const _orig = console.error.bind(console)
  console.error = function (...args) {
    _orig(...args)
    try {
      window.postMessage(
        {
          __vcap__: true,
          type: 'CONSOLE_ERROR',
          message: args
            .map((a) => (typeof a === 'string' ? a : (a && a.message) || String(a)))
            .join(' '),
        },
        '*'
      )
    } catch (_) {}
  }
})()
