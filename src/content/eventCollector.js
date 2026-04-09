// Capture native methods at module load — resilient against page-level overrides (Sentry, LogRocket, etc.)
const _nativeAdd = EventTarget.prototype.addEventListener.bind(document)
const _nativeRemove = EventTarget.prototype.removeEventListener.bind(document)
const _origError = console.error

let isCollecting = false
let startTime = null
let steps = []
let consoleErrors = []
let stepIndex = 0

const _lastEventTime = {}
const THROTTLE_MS = 100

export function startCollecting() {
  if (isCollecting) return  // Idempotent — safe to call twice
  isCollecting = true
  startTime = Date.now()
  steps = []
  consoleErrors = []
  stepIndex = 0

  _nativeAdd('click', onEvent, true)
  _nativeAdd('change', onEvent, true)
  _nativeAdd('submit', onEvent, true)

  // Override console.error — only if not already overridden by us
  console.error = (...args) => {
    _origError.apply(console, args)
    consoleErrors.push({ timestamp: relativeTime(), message: args.join(' ') })
  }
}

export function stopCollecting() {
  if (!isCollecting) return  // Idempotent
  isCollecting = false

  _nativeRemove('click', onEvent, true)
  _nativeRemove('change', onEvent, true)
  _nativeRemove('submit', onEvent, true)

  console.error = _origError  // Restore original
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

function onEvent(e) {
  const el = e.target
  const target = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`

  const now = Date.now()
  if (_lastEventTime[target] && now - _lastEventTime[target] < THROTTLE_MS) return
  _lastEventTime[target] = now

  stepIndex++
  const elapsed = startTime ? now - startTime : 0
  const mm = String(Math.floor(elapsed / 60000)).padStart(2, '0')
  const ss = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')

  steps.push({
    index: stepIndex,
    timestamp: `${mm}:${ss}`,
    type: e.type,
    target,
    note: el.getAttribute('aria-label') || el.title || ''
  })
}

function relativeTime() {
  const diff = Math.floor((Date.now() - startTime) / 1000)
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  return `${m}:${s}`
}
