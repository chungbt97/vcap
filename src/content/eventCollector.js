/**
 * eventCollector.js — Full-coverage user interaction tracker
 *
 * Tracked event types:
 *   ✅ click          — all clickable elements (button, a, div[role], etc.)
 *   ✅ input          — text, textarea, number, search, email, url, tel (debounced)
 *   ✅ change         — checkbox ✓/✗, radio, native select, file upload, range
 *   ✅ submit         — form submit
 *   ✅ keydown        — keyboard shortcuts (Enter, Space, Escape, Tab, F-keys) + modifier combos
 *   ✅ focus/blur     — important for form UX flow tracking
 *   ✅ select (text)  — text selection completed (mouseup after selection)
 *   ✅ navigate       — SPA pushState / replaceState / popstate
 *   ✅ custom switch  — ARIA switch / toggle via MutationObserver on aria-checked
 *   ✅ custom select  — ARIA combobox / listbox / option via MutationObserver
 */

// ── Capture native methods at module load ─────────────────────────────────
// Resilient against page-level overrides (Sentry, LogRocket, etc.)
const _nativeDocAdd = EventTarget.prototype.addEventListener.bind(document)
const _nativeDocRemove = EventTarget.prototype.removeEventListener.bind(document)

// ── State ─────────────────────────────────────────────────────────────────
let isCollecting = false
let startTime = null
let steps = []
let consoleErrors = []
let stepIndex = 0
let unlistenNavigation = null

// ── Throttle & debounce ───────────────────────────────────────────────────
const _lastClickTime = {}       // click: 50ms throttle
const _lastKeyTime   = {}       // important keys: 300ms throttle
const _lastChangeTime = {}      // change/checkbox/radio: 50ms throttle
const _lastFocusTime = {}       // focus events: 200ms throttle

const CLICK_THROTTLE_MS  = 50
const CHANGE_THROTTLE_MS = 50
const KEY_THROTTLE_MS    = 300  // keyboard shortcuts
const FOCUS_THROTTLE_MS  = 200

const INPUT_DEBOUNCE_MS  = 400

// inputTimers: { [selector]: { timer, flush } } — flush on stop to not miss last value
let inputTimers = {}

// ── MutationObserver state ────────────────────────────────────────────────
let ariaObserver = null         // watches aria-checked (switch/checkbox) + aria-selected (custom select)
let mutationTimers = {}
const MUTATION_DEBOUNCE_MS = 150

// ── Page-context console fallback ─────────────────────────────────────────
// CDP Runtime.consoleAPICalled is primary (CSP-proof). This is fallback only.
let _pageConsoleInjected = false

function injectPageConsoleCapture() {
  if (_pageConsoleInjected) return
  _pageConsoleInjected = true
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('src/content/page-console-capture.js')
  ;(document.head || document.documentElement).appendChild(script)
  script.onload = () => script.remove()
}

function _onPageMessage(e) {
  if (e.source !== window) return
  if (!e.data?.__vcap__ || e.data.type !== 'CONSOLE_ERROR') return
  if (!isCollecting) return
  consoleErrors.push({ timestamp: relativeTime(), message: e.data.message, source: 'console' })
}

// ── Public API ────────────────────────────────────────────────────────────

export function startCollecting() {
  if (isCollecting) return
  isCollecting = true
  startTime = Date.now()
  steps = []
  consoleErrors = []
  stepIndex = 0

  // ── Core pointer & form events ──
  _nativeDocAdd.call(document, 'click',   onClickEvent,  true)
  _nativeDocAdd.call(document, 'change',  onChangeEvent, true)  // checkbox, radio, select, file, range
  _nativeDocAdd.call(document, 'input',   onInputEvent,  true)  // text/number/textarea (debounced)
  _nativeDocAdd.call(document, 'submit',  onSubmitEvent, true)

  // ── Keyboard tracking ──
  // Only track meaningful shortcuts — NOT every keypress (verbose & PII risk)
  _nativeDocAdd.call(document, 'keydown', onKeydownEvent, true)

  // ── Focus/blur flow tracking ──
  _nativeDocAdd.call(document, 'focusin',  onFocusInEvent,  true)   // use focusin (bubbles via capture)
  _nativeDocAdd.call(document, 'focusout', onFocusOutEvent, true)

  // ── SPA navigation ──
  unlistenNavigation = patchNavigation()

  // ── ARIA observer (custom controls: switch, checkbox, listbox) ──
  startAriaObserver()

  // ── Console fallback ──
  injectPageConsoleCapture()
  window.addEventListener('message', _onPageMessage)
}

export function stopCollecting() {
  if (!isCollecting) return
  isCollecting = false

  _nativeDocRemove.call(document, 'click',    onClickEvent,   true)
  _nativeDocRemove.call(document, 'change',   onChangeEvent,  true)
  _nativeDocRemove.call(document, 'input',    onInputEvent,   true)
  _nativeDocRemove.call(document, 'submit',   onSubmitEvent,  true)
  _nativeDocRemove.call(document, 'keydown',  onKeydownEvent, true)
  _nativeDocRemove.call(document, 'focusin',  onFocusInEvent, true)
  _nativeDocRemove.call(document, 'focusout', onFocusOutEvent, true)

  if (unlistenNavigation) {
    unlistenNavigation()
    unlistenNavigation = null
  }

  window.removeEventListener('message', _onPageMessage)

  // Flush pending input debounce timers — capture last typed value
  Object.values(inputTimers).forEach(({ timer, flush }) => {
    clearTimeout(timer)
    try { flush() } catch (_) {}
  })
  inputTimers = {}

  Object.values(mutationTimers).forEach(clearTimeout)
  mutationTimers = {}

  stopAriaObserver()
}

export function getStepsAndClear() {
  const result = { steps: [...steps], consoleErrors: [...consoleErrors] }
  steps = []
  consoleErrors = []
  stepIndex = 0
  return result
}

export function getSteps()        { return steps }
export function getConsoleErrors() { return consoleErrors }

// ── Event Handlers ────────────────────────────────────────────────────────

/**
 * CLICK — Handles all clickable elements.
 * Skips clicks that are immediately followed by a more meaningful event
 * (change for checkboxes/radio, focusin for inputs) to avoid duplication.
 */
function onClickEvent(e) {
  const el = e.target
  const tag = el.tagName?.toLowerCase()
  const type = (el.type || '').toLowerCase()

  // Skip: checkbox & radio — handled by onChangeEvent with meaningful state
  // Skip: native select — handled by onChangeEvent
  if ((tag === 'input' && (type === 'checkbox' || type === 'radio')) || tag === 'select') return

  const target = buildSelector(el)
  const now = Date.now()
  if (_lastClickTime[target] && now - _lastClickTime[target] < CLICK_THROTTLE_MS) return
  _lastClickTime[target] = now

  pushStep({ type: 'click', target, url: window.location.href })
}

/**
 * CHANGE — Handles:
 *   - Native checkbox  → checked/unchecked
 *   - Native radio     → selected value
 *   - Native <select>  → selected option label
 *   - File input       → filename(s)
 *   - Range input      → numeric value
 *   - Other inputs     → text value (fallback)
 */
function onChangeEvent(e) {
  const el = e.target
  if (!el) return

  const tag  = el.tagName?.toLowerCase()
  const type = (el.type || '').toLowerCase()
  const target = buildSelector(el)

  const now = Date.now()
  if (_lastChangeTime[target] && now - _lastChangeTime[target] < CHANGE_THROTTLE_MS) return
  _lastChangeTime[target] = now

  let eventType = 'change'
  let value

  // ── Checkbox ──
  if (tag === 'input' && type === 'checkbox') {
    eventType = 'checkbox'
    value = el.checked ? '✓ checked' : '✗ unchecked'
  }
  // ── Radio ──
  else if (tag === 'input' && type === 'radio') {
    eventType = 'radio'
    value = el.value || el.labels?.[0]?.textContent?.trim() || 'selected'
  }
  // ── Native Select ──
  else if (tag === 'select') {
    eventType = 'select'
    const selectedOption = el.options[el.selectedIndex]
    value = selectedOption?.text?.trim() || el.value
  }
  // ── File input ──
  else if (tag === 'input' && type === 'file') {
    eventType = 'file'
    const files = Array.from(el.files || []).map(f => f.name)
    value = files.length > 0 ? files.join(', ') : 'no file'
  }
  // ── Range (slider) ──
  else if (tag === 'input' && type === 'range') {
    eventType = 'range'
    value = el.value
  }
  // ── General fallback ──
  else {
    value = sanitizeInputValue(el)
  }

  pushStep({ type: eventType, target, value, url: window.location.href })
}

/**
 * INPUT — Text/textarea/number/search/email/url/tel — debounced 400ms.
 * Stores flush callback so stopCollecting() can capture the last typed value.
 */
function onInputEvent(e) {
  const el = e.target
  const tag  = el.tagName?.toLowerCase()
  const type = (el.type || '').toLowerCase()

  // Only track text-like inputs — checkbox/radio/range handled by onChangeEvent
  const TEXT_TYPES = new Set(['', 'text', 'search', 'email', 'url', 'tel', 'number', 'password', 'textarea'])
  if (tag === 'input' && !TEXT_TYPES.has(type)) return
  if (tag !== 'input' && tag !== 'textarea') return

  const target = buildSelector(el)

  if (inputTimers[target]) clearTimeout(inputTimers[target].timer)

  const flush = () => {
    const value = sanitizeInputValue(el)
    pushStep({ type: 'input', target, value, url: window.location.href })
    delete inputTimers[target]
  }

  inputTimers[target] = { timer: setTimeout(flush, INPUT_DEBOUNCE_MS), flush }
}

/**
 * SUBMIT — Form submission. No throttle (rare & always meaningful).
 */
function onSubmitEvent(e) {
  const el = e.target
  const target = buildSelector(el)
  pushStep({ type: 'submit', target, url: window.location.href })
}

/**
 * KEYDOWN — Track only meaningful keyboard shortcuts.
 * Does NOT log every keypress — avoids PII exposure & noise.
 *
 * Captured:
 *   - Enter, Space (on non-text elements — form submit / button activate)
 *   - Escape (close modal / cancel)
 *   - Tab (navigation between fields)
 *   - Arrow keys (within lists, date pickers, sliders)
 *   - Common shortcuts: Ctrl/Cmd + S, Z, Y, F, A, C, V, X, /
 *   - F1-F12 function keys
 */
const CAPTURED_KEYS = new Set([
  'Enter', 'Escape', 'Tab',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
])
const SHORTCUT_KEYS = new Set(['s', 'z', 'y', 'f', 'a', 'c', 'v', 'x', '/'])

function onKeydownEvent(e) {
  const el = e.target
  const tag  = el.tagName?.toLowerCase()
  const type = (el.type || '').toLowerCase()
  const key  = e.key

  const isModifier = e.ctrlKey || e.metaKey || e.altKey

  // In text inputs: only capture Enter (submit intent) and Escape (cancel)
  // Skip Tab and arrows — too noisy in forms
  const isTextInput = (tag === 'input' && !['checkbox', 'radio', 'range', 'file', 'submit', 'button'].includes(type))
                   || tag === 'textarea'
  if (isTextInput) {
    if (key !== 'Enter' && key !== 'Escape') return
  }

  // Capture specific keys
  const isCapturedKey = CAPTURED_KEYS.has(key)
  const isCapturedShortcut = isModifier && SHORTCUT_KEYS.has(key.toLowerCase())
  if (!isCapturedKey && !isCapturedShortcut) return

  const target = buildSelector(el)
  const keyLabel = isModifier
    ? `${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Cmd+' : ''}${e.altKey ? 'Alt+' : ''}${key}`
    : key

  const now = Date.now()
  const throttleKey = `${target}::${keyLabel}`
  if (_lastKeyTime[throttleKey] && now - _lastKeyTime[throttleKey] < KEY_THROTTLE_MS) return
  _lastKeyTime[throttleKey] = now

  pushStep({ type: 'keydown', target, value: keyLabel, url: window.location.href })
}

/**
 * FOCUS — Track when user moves focus into an interactive element.
 * Helps reconstruct the form-filling flow.
 * Throttled heavily (200ms) to avoid fire on programmatic focus.
 */
function onFocusInEvent(e) {
  const el = e.target
  if (!el) return

  const tag  = el.tagName?.toLowerCase()
  const type = (el.type || '').toLowerCase()

  // Only track genuinely interactive elements — skip decorative divs
  const FOCUS_TAGS = new Set(['input', 'textarea', 'select', 'button', 'a'])
  const hasRole = el.getAttribute?.('role')
  if (!FOCUS_TAGS.has(tag) && !hasRole) return

  // Skip password focus (PII risk for field identity)
  if (type === 'password') return

  const target = buildSelector(el)
  const now = Date.now()
  if (_lastFocusTime[target] && now - _lastFocusTime[target] < FOCUS_THROTTLE_MS) return
  _lastFocusTime[target] = now

  pushStep({ type: 'focus', target, url: window.location.href })
}

/**
 * BLUR — Track when user leaves an important field.
 * Helps pair with focus to show dwell time & form abandon patterns.
 */
function onFocusOutEvent(e) {
  const el = e.target
  if (!el) return

  const tag  = el.tagName?.toLowerCase()
  const type = (el.type || '').toLowerCase()

  // Only track text-like inputs on blur (shows user left without completing)
  const TEXT_INPUT = (tag === 'input' && !['checkbox', 'radio', 'range', 'file', 'submit', 'button'].includes(type))
                  || tag === 'textarea'
  if (!TEXT_INPUT) return
  if (type === 'password') return

  const target = buildSelector(el)
  const value = sanitizeInputValue(el)

  // Only record blur if the field has a value (empty blur = irrelevant)
  if (!value) return

  pushStep({ type: 'blur', target, value, url: window.location.href })
}

// ── SPA Navigation ────────────────────────────────────────────────────────

function patchNavigation() {
  const _origPush    = history.pushState.bind(history)
  const _origReplace = history.replaceState.bind(history)

  history.pushState = function (...args) {
    _origPush(...args)
    if (isCollecting) pushStep({ type: 'navigate', target: 'pushState', value: String(args[2] || window.location.href), url: window.location.href })
  }

  history.replaceState = function (...args) {
    _origReplace(...args)
    if (isCollecting) pushStep({ type: 'navigate', target: 'replaceState', value: String(args[2] || window.location.href), url: window.location.href })
  }

  const onPopState = () => {
    if (isCollecting) pushStep({ type: 'navigate', target: 'back/forward', value: window.location.href, url: window.location.href })
  }
  window.addEventListener('popstate', onPopState)

  return () => {
    history.pushState = _origPush
    history.replaceState = _origReplace
    window.removeEventListener('popstate', onPopState)
  }
}

// ── ARIA Observer — Custom controls ──────────────────────────────────────
/**
 * Watches aria-checked (custom checkbox, switch, toggle) and
 * aria-selected (custom select / tab / listbox option).
 *
 * This catches all custom component patterns:
 *   - React Switch / Toggle → aria-checked changes
 *   - Headless UI Listbox   → aria-selected changes
 *   - Ant Design Select     → aria-selected on option
 *   - MUI Tabs              → aria-selected on tab
 */
function startAriaObserver() {
  if (ariaObserver) return

  ariaObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type !== 'attributes') continue
      const el = m.target
      if (!el || el.nodeType !== Node.ELEMENT_NODE) continue

      const attr = m.attributeName
      const newVal = el.getAttribute(attr)
      const oldVal = m.oldValue

      // Only fire when value actually changed
      if (newVal === oldVal) continue

      const key = `${buildSelector(el)}::${attr}`
      if (mutationTimers[key]) continue

      // Capture a snapshot of el and values at observation time (closure)
      const capturedEl  = el
      const capturedAttr = attr
      const capturedNew  = newVal

      mutationTimers[key] = setTimeout(() => {
        delete mutationTimers[key]
        if (!isCollecting) return

        const target = buildSelector(capturedEl)
        let eventType, value

        if (capturedAttr === 'aria-checked') {
          // Custom checkbox or switch
          const isSwitch = capturedEl.getAttribute('role') === 'switch'
          eventType = isSwitch ? 'switch' : 'checkbox'
          value = capturedNew === 'true' ? '✓ on' : capturedNew === 'false' ? '✗ off' : capturedNew
        } else if (capturedAttr === 'aria-selected') {
          if (capturedNew !== 'true') return  // only fire on selection, not de-selection
          eventType = 'select'
          value = getAriaLabel(capturedEl)
        }

        if (eventType) {
          pushStep({ type: eventType, target, value, url: window.location.href })
        }
      }, MUTATION_DEBOUNCE_MS)
    }
  })

  try {
    ariaObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['aria-checked', 'aria-selected'],
    })
  } catch (_) {
    ariaObserver = null
  }
}

function stopAriaObserver() {
  if (ariaObserver) {
    ariaObserver.disconnect()
    ariaObserver = null
  }
}

/** Get a readable label from an ARIA element (for aria-selected options) */
function getAriaLabel(el) {
  if (!el) return null
  const label = el.getAttribute('aria-label')
  if (label) return label.trim().slice(0, 100)
  const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ')
  return text ? text.slice(0, 100) : null
}

// ── Helpers ───────────────────────────────────────────────────────────────

function pushStep(data) {
  if (!isCollecting) return  // Guard: don't push after stop (flush edge case)
  stepIndex++
  steps.push({
    index: stepIndex,
    timestamp: relativeTime(),
    ...data,
  })
}

/**
 * Build a human-readable selector for an element.
 *
 * Priority:
 *   0. data-testid / data-test-id  → tag[testid=value]
 *   1. id                          → tag#id
 *   2. aria-label / name / title   → tag[label]
 *   3. innerText ≤ 30 chars        → tag ("text")
 *   4. innerText > 30 chars        → tag ("text…")
 *   5. Fallback: tag.class1.class2 (max 2 classes)
 *
 * Walk-up strategy: skip decorative/icon elements (svg, path, img, i, span, etc.)
 * until reaching a semantically meaningful ancestor.
 */
const WALK_UP_TAGS = new Set([
  'svg', 'path', 'img', 'i', 'span', 'em', 'strong', 'b', 'small',
  // SVG shape/structural elements
  'use', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'symbol',
  'ellipse', 'text', 'tspan', 'defs', 'clippath', 'mask',
  'lineargradient', 'radialgradient', 'stop', 'fecomposite',
])

function buildSelector(el) {
  if (!el || !el.tagName) return 'unknown'

  let cur = el
  while (cur && cur !== document.body) {
    const tag = cur.tagName.toLowerCase()

    // Priority 0: data-testid
    const testid = cur.getAttribute?.('data-testid') || cur.getAttribute?.('data-test-id')
    if (testid) return `${tag}[testid=${testid.slice(0, 40)}]`

    // Priority 1: id
    if (cur.id) return `${tag}#${cur.id}`

    // Priority 2: aria-label / name / title / placeholder
    const label = cur.getAttribute?.('aria-label')
      || cur.getAttribute?.('name')
      || cur.title
      || cur.getAttribute?.('placeholder')
    if (label) return `${tag}[${label.slice(0, 40)}]`

    // Priority 3-4: text content
    // Use innerText (rendered text) but fall back to textContent (for SVG etc.)
    const text = (cur.innerText || cur.textContent || '').trim().replace(/\s+/g, ' ')
    if (text && text.length > 0) {
      return text.length <= 30
        ? `${tag} ("${text}")`
        : `${tag} ("${text.slice(0, 30)}...")`
    }

    // No selectable label — walk up only for decorative/icon elements
    if (WALK_UP_TAGS.has(tag)) {
      cur = cur.parentElement
    } else {
      break
    }
  }

  // Fallback: tag + up to 2 meaningful classes (skip Tailwind utility classes if >3 chars)
  const tag = el.tagName.toLowerCase()
  const cls = Array.from(el.classList)
    .filter(c => c.length <= 20)   // skip long generated class names
    .slice(0, 2)
    .join('.')
  return cls ? `${tag}.${cls}` : tag
}

/**
 * Return sanitized value for an input element.
 * Passwords and explicitly sensitive fields are always redacted.
 */
function sanitizeInputValue(el) {
  if (!el) return undefined
  const type = (el.type || '').toLowerCase()
  const name = (el.name || el.id || el.getAttribute?.('aria-label') || '').toLowerCase()
  const SENSITIVE = /password|secret|token|credit|card|cvv|ssn|otp|pin/i
  if (type === 'password' || SENSITIVE.test(name)) return '[REDACTED]'
  const v = el.value
  if (v === undefined || v === null || v === '') return undefined
  return String(v).slice(0, 200)   // cap at 200 chars — was 100
}

function relativeTime() {
  const diff = Math.floor((Date.now() - startTime) / 1000)
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  return `${m}:${s}`
}
