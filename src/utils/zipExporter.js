import { zipSync, strToU8 } from 'fflate'
import { buildMarkdown } from './markdownBuilder.js'
import { buildCurl } from './curlBuilder.js'
import { readAllChunks, clearChunks, readAllScreenshots, clearScreenshots } from './idb.js'

/**
 * Assemble and download the bug report ZIP.
 *
 * Output structure (C7 convention):
 *   {TicketName}_{YYYY-MM-DD}_{HH-mm-ss}.zip   (or vcap_... if no ticket)
 *   ├── bug-record.webm              ← screen recording (no audio)
 *   ├── jira-ticket.md               ← markdown report
 *   ├── screenshots/
 *   │   ├── shot-001_00-15.png       ← shot-{index}_{mm-ss}.png
 *   │   └── ...
 *   └── postman-curl/
 *       └── [mm-ss]_[METHOD]-[api-name].txt
 *
 * @param {{
 *   steps: Array,
 *   apiRequests: Array,   // only selected ones get cURL
 *   consoleErrors: Array,
 *   notes?: Array,
 *   date: string,
 *   ticketName?: string,   // [C7] used in ZIP filename
 *   screenshots?: Array,   // [C7] { blob, timestamp } objects from IDB (optional override)
 * }} session
 */
export async function exportSession(session) {
  const {
    steps = [],
    apiRequests = [],
    consoleErrors = [],
    notes = [],
    date = '',
    ticketName = '',
    screenshots: screenshotsOverride,
  } = session

  // Guard: require at least some data or a valid session date
  if (!date && steps.length === 0 && apiRequests.length === 0) {
    throw new Error('No session data available. Please record a session before exporting.')
  }

  try {
    // Retrieve video blob from IndexedDB
    const videoBlob = await readAllChunks('video/webm')
    if (!videoBlob || videoBlob.size === 0) {
      throw new Error('No recording captured. Start recording before exporting.')
    }

    // Read screenshots — caller can override (e.g. pass pre-loaded array)
    const screenshots = screenshotsOverride ?? await readAllScreenshots()

    const md = buildMarkdown({ steps, apiRequests, consoleErrors, notes, date })

    const files = {
      'bug-record.webm': new Uint8Array(await videoBlob.arrayBuffer()),
      'jira-ticket.md': strToU8(md),
    }

    // [C7] screenshots/ folder
    if (screenshots.length > 0) {
      for (let i = 0; i < screenshots.length; i++) {
        const shot = screenshots[i]
        // timestamp is relative session time mm:ss → mm-ss
        const ts = String(shot.timestamp || '00:00').replace(/:/g, '-')
        const idx = String(i + 1).padStart(3, '0')
        const fileName = `shot-${idx}_${ts}.png`
        const arrayBuf = await shot.blob.arrayBuffer()
        files[`screenshots/${fileName}`] = new Uint8Array(arrayBuf)
      }
    }

    // [B3] Only export cURL for the apiRequests passed in (caller filters to selected)
    if (apiRequests.length > 0) {
      for (const req of apiRequests) {
        const curlContent = buildCurl(req)
        const fileName = buildCurlFileName(req)
        files[`postman-curl/${fileName}`] = strToU8(curlContent)
      }
    }

    const zipped = zipSync(files)
    const blob = new Blob([zipped], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)

    // [C7] New filename: {TicketName}_{YYYY-MM-DD}_{HH-mm-ss}.zip
    const zipName = buildZipFileName(date, ticketName)
    chrome.downloads.download({ url, filename: zipName })
    URL.revokeObjectURL(url)

  } finally {
    await clearChunks()
    await clearScreenshots()
  }
}

/**
 * Build the ZIP filename per C7 convention.
 * Format: {TicketName}_{YYYY-MM-DD}_{HH-mm-ss}.zip
 *         vcap_{YYYY-MM-DD}_{HH-mm-ss}.zip  (when no ticket)
 *
 * @param {string} date        ISO date string from session.date
 * @param {string} ticketName  Ticket ID / session name (optional)
 * @returns {string}
 */
export function buildZipFileName(date, ticketName = '') {
  const d = new Date(date || Date.now())
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const datePart = `${yyyy}-${mm}-${dd}`
  const timePart = `${hh}-${min}-${ss}`

  // Sanitize ticket name — allow letters, digits, hyphens, underscores
  const safeName = String(ticketName || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  const prefix = safeName || 'vcap'
  return `${prefix}_${datePart}_${timePart}.zip`
}

/**
 * Build a cURL export filename.
 * Format: [mm-ss]_[METHOD]-[api-name].txt
 *
 * @param {{ timestamp?: string, method?: string, url?: string }} req
 * @returns {string}
 */
function buildCurlFileName(req) {
  const ts = String(req.timestamp || '00:00').replace(/:/g, '-')
  const method = String(req.method || 'GET').toUpperCase()

  let apiName = 'request'
  try {
    const urlStr = String(req.url || '')
    let pathname = urlStr
    try {
      pathname = new URL(urlStr).pathname
    } catch (_) {}
    const cleaned = pathname
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .slice(0, 40)
    if (cleaned) apiName = cleaned
  } catch (_) {}

  return `${ts}_${method}-${apiName}.txt`
}
