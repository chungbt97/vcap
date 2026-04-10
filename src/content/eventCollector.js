// Capture native methods at module load — resilient against page-level overrides (Sentry, LogRocket, etc.)
const _nativeAdd = EventTarget.prototype.addEventListener.bind(document)
const _nativeRemove = EventTarget.prototype.removeEventListener.bind(document)

let isCollecting = false
let startTime = null
let steps = []
let consoleErrors = []
let stepIndex = 0
let unlistenNavigation = null // cleanup for popstate / history overrides

const _lastEventTime = {}
const THROTTLE_MS = 100        // for click/change/submit
const SCROLL_DEBOUNCE_MS = 300 // debounce scroll events
const INPUT_DEBOUNCE_MS = 400  // debounce input events
let scrollTimer = null
let inputTimers = {}           // keyed by target selector

// ── Page-context console capture ─────────────────────────────────────────
// We inject a script into the PAGE's own JS context so we can intercept actual
// page-level console.error calls (not just errors in the extension content context).
let _pageConsoleInjected = false

function injectPageConsoleCapture() {
  if (_pageConsoleInjected) return
  _pageConsoleInjected = true

  const script = document.createElement('script')
  script.textContent = `
    (function() {
      const _orig = console.error.bind(console);
      console.error = function(...args) {
        _orig(...args);
        try {
          window.postMessage({
            __vcap__: true,
            type: 'CONSOLE_ERROR',
            message: args.map(a => typeof a === 'string' ? a : (a && a.message) || String(a)).join(' '),
          }, '*');
        } catch(_) {}
      };
    })();
  `
  ;(document.head || document.documentElement).appendChild(script)
  script.remove() // cleanup DOM node after execution
}

function _onPageMessage(e) {
  if (e.source !== window) return
  if (!e.data || !e.data.__vcap__ || e.data.type !== 'CONSOLE_ERROR') return
  if (!isCollecting) return
  consoleErrors.push({ timestamp: relativeTime(), message: e.data.message })
}

// ── Public API ────────────────────────────────────────────────────────────

export function startCollecting() {
  if (isCollecting) return  // Idempotent — safe to call twice
  isCollecting = true
  startTime = Date.now()
  steps = []
  consoleErrors = []
  stepIndex = 0

  // Standard DOM events
  _nativeAdd.call(document, 'click', onEvent, true)
  _nativeAdd.call(document, 'change', onEvent, true)
  _nativeAdd.call(document, 'submit', onEvent, true)

  // [Phase 2] Extended events: input (debounced) + scroll (debounced)
  _nativeAdd.call(document, 'input', onInputEvent, true)
  _nativeAdd.call(document, 'scroll', onScrollEvent, true)

  // [Phase 2] Navigation tracking (SPA + traditional)
  unlistenNavigation = patchNavigation()

  // [Phase 2] Page-context console.error capture via postMessage bridge
  injectPageConsoleCapture()
  window.addEventListener('message', _onPageMessage)
}

export function stopCollecting() {
  if (!isCollecting) return  // Idempotent
  isCollecting = false

  _nativeRemove.call(document, 'click', onEvent, true)
  _nativeRemove.call(document, 'change', onEvent, true)
  _nativeRemove.call(document, 'submit', onEvent, true)
  _nativeRemove.call(document, 'input', onInputEvent, true)
  _nativeRemove.call(document, 'scroll', onScrollEvent, true)

  // Cleanup navigation listeners + restore patched methods
  if (unlistenNavigation) {
    unlistenNavigation()
    unlistenNavigation = null
  }

  window.removeEventListener('message', _onPageMessage)

  // Clear pending timers
  clearTimeout(scrollTimer)
  Object.values(inputTimers).forEach(clearTimeout)
  inputTimers = {}
}

export function getStepsAndClear() {
  const result = { steps: [...steps], consoleErrors: [...consoleErrors] }
  steps = []
  consoleErrors = []
  stepIndex = 0
  return result
}

export function getSteps() {
  return steps
}

export function getConsoleErrors() {
  return consoleErrors
}

// ── Event Handlers ────────────────────────────────────────────────────────

function onEvent(e) {
  const el = e.target
  const target = buildSelector(el)

  const now = Date.now()
  if (_lastEventTime[target] && now - _lastEventTime[target] < THROTTLE_MS) return
  _lastEventTime[target] = now

  pushStep({
    type: e.type,
    target,
    value: e.type === 'change' ? sanitizeInputValue(el) : undefined,
    url: window.location.href,
  })
}

function onInputEvent(e) {
  const el = e.target
  const target = buildSelector(el)

  clearTimeout(inputTimers[target])
  inputTimers[target] = setTimeout(() => {
    if (!isCollecting) return
    pushStep({
      type: 'input',
      target,
      value: sanitizeInputValue(el),
      url: window.location.href,
    })
    delete inputTimers[target]
  }, INPUT_DEBOUNCE_MS)
}

function onScrollEvent() {
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    if (!isCollecting) return
    pushStep({
      type: 'scroll',
      target: 'window',
      value: `scrollY: ${Math.round(window.scrollY)}px`,
      url: window.location.href,
    })
  }, SCROLL_DEBOUNCE_MS)
}

// [Phase 2] Patch history.pushState / replaceState to capture SPA navigation
function patchNavigation() {
  const _origPush = history.pushState.bind(history)
  const _origReplace = history.replaceState.bind(history)

  history.pushState = function (...args) {
    _origPush(...args)
    if (isCollecting) {
      pushStep({ type: 'navigate', target: 'pushState', value: String(args[2] || window.location.href), url: window.location.href })
    }
  }

  history.replaceState = function (...args) {
    _origReplace(...args)
    if (isCollecting) {
      pushStep({ type: 'navigate', target: 'replaceState', value: String(args[2] || window.location.href), url: window.location.href })
    }
  }

  const onPopState = () => {
    if (isCollecting) {
      pushStep({ type: 'navigate', target: 'back/forward', value: window.location.href, url: window.location.href })
    }
  }
  window.addEventListener('popstate', onPopState)

  // Return cleanup function
  return () => {
    history.pushState = _origPush
    history.replaceState = _origReplace
    window.removeEventListener('popstate', onPopState)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function pushStep(data) {
  stepIndex++
  steps.push({
    index: stepIndex,
    timestamp: relativeTime(),
    ...data,
  })
}

/**
 * Build a readable CSS-like selector for an element.
 * Prioritizes: id > aria-label/name > tag+class snippet
 */
function buildSelector(el) {
  if (!el || !el.tagName) return 'unknown'
  const tag = el.tagName.toLowerCase()
  if (el.id) return `${tag}#${el.id}`
  const label = el.getAttribute('aria-label') || el.getAttribute('name') || el.title
  if (label) return `${tag}[${label.slice(0, 40)}]`
  const cls = Array.from(el.classList).slice(0, 2).join('.')
  return cls ? `${tag}.${cls}` : tag
}

/**
 * Return a sanitized display value for input elements.
 * Passwords and sensitive inputs are always redacted.
 */
function sanitizeInputValue(el) {
  if (!el) return undefined
  const type = (el.type || '').toLowerCase()
  const name = (el.name || el.id || '').toLowerCase()
  const SENSITIVE = /password|secret|token|credit|card|cvv|ssn/i
  if (type === 'password' || SENSITIVE.test(name)) return '[REDACTED]'
  const v = el.value
  if (!v) return undefined
  return v.slice(0, 100) // cap at 100 chars
}

function relativeTime() {
  const diff = Math.floor((Date.now() - startTime) / 1000)
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  return `${m}:${s}`
}
