// Capture original before any override
const _origError = console.error

let startTime = null
let steps = []
let consoleErrors = []
let stepIndex = 0

export function startCollecting() {
  startTime = Date.now()
  steps = []
  consoleErrors = []
  stepIndex = 0

  document.addEventListener('click', onEvent, true)
  document.addEventListener('change', onEvent, true)
  document.addEventListener('submit', onEvent, true)

  console.error = (...args) => {
    _origError.apply(console, args)
    consoleErrors.push({ timestamp: relativeTime(), message: args.join(' ') })
  }
}

export function stopCollecting() {
  document.removeEventListener('click', onEvent, true)
  document.removeEventListener('change', onEvent, true)
  document.removeEventListener('submit', onEvent, true)
  console.error = _origError
}

export function getSteps() {
  return steps
}

export function getConsoleErrors() {
  return consoleErrors
}

function onEvent(e) {
  const el = e.target
  const target = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
  const note = el.getAttribute('aria-label') || el.title || ''
  steps.push({
    index: ++stepIndex,
    timestamp: relativeTime(),
    type: e.type,
    target,
    note,
  })
}

function relativeTime() {
  const diff = Math.floor((Date.now() - startTime) / 1000)
  const m = String(Math.floor(diff / 60)).padStart(2, '0')
  const s = String(diff % 60).padStart(2, '0')
  return `${m}:${s}`
}
