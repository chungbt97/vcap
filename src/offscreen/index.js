import { appendChunk } from '../utils/idb.js'

let mediaRecorder = null
let autoStopTimer = null
const MAX_DURATION_MS = 5 * 60 * 1000 // 5 minutes

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_CAPTURE') {
    startCapture().then(() => sendResponse({ ok: true }))
    return true // async response
  }
  if (msg.type === 'STOP_CAPTURE') {
    stopRecording()
    sendResponse({ ok: true })
  }
})

async function startCapture() {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })

  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
  mediaRecorder.ondataavailable = async (e) => {
    if (e.data.size > 0) await appendChunk(e.data)
  }
  mediaRecorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop())
    chrome.runtime.sendMessage({ type: 'CAPTURE_DONE' })
  }
  mediaRecorder.start(200) // 200ms timeslice for frequent chunks

  autoStopTimer = setTimeout(() => stopRecording(), MAX_DURATION_MS)
}

function stopRecording() {
  clearTimeout(autoStopTimer)
  autoStopTimer = null
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}
