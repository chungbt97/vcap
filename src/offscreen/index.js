import { appendChunk } from '../utils/idb.js'

let mediaRecorder = null
let autoStopTimer = null
let isCapturing = false
const MAX_DURATION_MS = 5 * 60 * 1000 // 5 minutes

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_CAPTURE') {
    startCapture()
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true // async response
  }
  if (msg.type === 'STOP_CAPTURE') {
    stopRecording()
    sendResponse({ ok: true })
  }
})

function getSupportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) return mimeType
  }
  return '' // Let browser choose default
}

async function startCapture() {
  if (isCapturing) {
    console.warn('[vcap/offscreen] Capture already in progress, ignoring START_CAPTURE')
    return
  }
  isCapturing = true
  let stream = null
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })

    const mimeType = getSupportedMimeType()
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size === 0) return
      try {
        await appendChunk(e.data)
      } catch (err) {
        console.error('[vcap/offscreen] appendChunk failed:', err.message)
        chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: err.message }).catch(() => {})
        if (err.message.includes('quota exceeded') || err.message.includes('QuotaExceeded')) {
          stopRecording() // Stop gracefully instead of dropping chunks silently
        }
      }
    }
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      chrome.runtime.sendMessage({ type: 'CAPTURE_DONE' })
    }
    mediaRecorder.start(200) // 200ms timeslice for frequent chunks

    autoStopTimer = setTimeout(() => stopRecording(), MAX_DURATION_MS)
  } catch (err) {
    isCapturing = false
    console.error('[vcap/offscreen] getDisplayMedia failed:', err.name, err.message)
    if (stream) stream.getTracks().forEach(t => t.stop())
    chrome.runtime.sendMessage({ type: 'CAPTURE_FAILED', error: err.message }).catch(() => {})
    throw err
  }
}

function stopRecording() {
  clearTimeout(autoStopTimer)
  autoStopTimer = null
  isCapturing = false
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}
