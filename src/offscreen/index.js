import { appendChunk } from '../utils/idb.js'
import { MSG } from '../shared/messages.js'

let mediaRecorder = null
let autoStopTimer = null
let isCapturing = false
const MAX_DURATION_MS = 5 * 60 * 1000 // 5 minutes

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === MSG.START_CAPTURE) {
    // Background passes both tabId and streamId (from chrome.tabCapture.getMediaStreamId)
    startCapture(msg.tabId, msg.streamId)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true // async response
  }
  if (msg.type === MSG.STOP_CAPTURE) {
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

// [Phase 0 Q4 + Phase 1] Use chrome.tabCapture to capture exactly the current tab.
// No display picker is shown to the user — tab is captured transparently.
// Audio is intentionally disabled per Phase 0 Q5 decision: { audio: false }
//
// MV3 tabCapture pattern:
//   1. Background calls chrome.tabCapture.getMediaStreamId({ targetTabId: tabId })
//   2. Background sends streamId to Offscreen inside the START_CAPTURE message
//   3. Offscreen calls getUserMedia with chromeMediaSource: 'tab' + chromeMediaSourceId: streamId
async function startCapture(tabId, streamId) {
  if (isCapturing) {
    console.warn('[vcap/offscreen] Capture already in progress, ignoring START_CAPTURE')
    return
  }
  isCapturing = true
  let stream = null

  try {
    if (streamId) {
      // MV3 tabCapture via getUserMedia — captures the exact tab, no picker shown
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId,
          }
        },
        audio: false, // Phase 0 Q5: no audio for MVP
      })
    } else {
      // Fallback: if Background couldn't get a streamId (e.g., local dev without extension context)
      // This will show the generic display picker — acceptable for development only
      console.warn('[vcap/offscreen] No streamId — falling back to getDisplayMedia (dev mode only)')
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    }

    const mimeType = getSupportedMimeType()
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})

    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size === 0) return
      try {
        await appendChunk(e.data)
      } catch (err) {
        console.error('[vcap/offscreen] appendChunk failed:', err.message)
        chrome.runtime.sendMessage({ type: MSG.CAPTURE_ERROR, error: err.message }).catch(() => {})
        if (err.message.includes('quota exceeded') || err.message.includes('QuotaExceeded')) {
          // Auto-stop gracefully — CAPTURE_DONE will follow via onstop
          stopRecording()
        }
      }
    }

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      isCapturing = false
      // [Phase 1 fix] Signal Background that all chunks are saved — triggers finalizeSession() + preview tab
      chrome.runtime.sendMessage({ type: MSG.CAPTURE_DONE }).catch(() => {})
    }

    mediaRecorder.start(200) // 200ms timeslice for frequent IDB writes
    autoStopTimer = setTimeout(() => stopRecording(), MAX_DURATION_MS)

  } catch (err) {
    isCapturing = false
    console.error('[vcap/offscreen] Capture failed:', err.name, err.message)
    if (stream) stream.getTracks().forEach(t => t.stop())
    // [Phase 1 fix] Signal Background: shows notification + resets state to idle
    chrome.runtime.sendMessage({ type: MSG.CAPTURE_FAILED, error: err.message }).catch(() => {})
    throw err
  }
}

function stopRecording() {
  clearTimeout(autoStopTimer)
  autoStopTimer = null
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop() // triggers onstop → CAPTURE_DONE
  } else {
    isCapturing = false
  }
}
