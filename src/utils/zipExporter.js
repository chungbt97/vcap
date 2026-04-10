import { zipSync, strToU8 } from 'fflate'
import { buildMarkdown } from './markdownBuilder.js'
import { buildCurl } from './curlBuilder.js'
import { readAllChunks, clearChunks } from './idb.js'

/**
 * Assemble and download the bug report ZIP.
 *
 * Output structure (per FEATURE.md + Phase 4 contract):
 *   bug-report-[timestamp].zip
 *   ├── bug-record.webm              ← screen recording (no audio)
 *   ├── jira-ticket.md               ← markdown report
 *   └── postman-curl/
 *       └── [HH-MM-SS]_[method]-[api-name].txt   ← one per selected API error
 *
 * @param {{
 *   steps: Array,
 *   apiErrors: Array,
 *   consoleErrors: Array,
 *   notes?: Array,
 *   date: string,
 * }} session
 */
export async function exportSession(session) {
  const { steps = [], apiErrors = [], consoleErrors = [], notes = [], date = '' } = session

  // Guard: require at least some data or a valid session date
  if (!date && steps.length === 0 && apiErrors.length === 0) {
    throw new Error('No session data available. Please record a session before exporting.')
  }

  try {
    // Retrieve video blob from IndexedDB
    const videoBlob = await readAllChunks('video/webm')
    if (!videoBlob || videoBlob.size === 0) {
      throw new Error('No recording captured. Start recording before exporting.')
    }

    const md = buildMarkdown({ steps, apiErrors, consoleErrors, notes, date })

    const files = {
      // [Phase 4] Renamed from 'recording.webm' → 'bug-record.webm' per FEATURE.md
      'bug-record.webm': new Uint8Array(await videoBlob.arrayBuffer()),
      // [Phase 4] Renamed from 'report.md' → 'jira-ticket.md' per FEATURE.md
      'jira-ticket.md': strToU8(md),
    }

    // [Phase 4] Renamed folder api-errors/ → postman-curl/
    //           Renamed files error-N.sh → [Time]_[method]-[api-name].txt
    //           Only create folder if there are API errors to export
    if (apiErrors.length > 0) {
      for (const err of apiErrors) {
        const curlContent = buildCurl(err)
        const fileName = buildCurlFileName(err)
        files[`postman-curl/${fileName}`] = strToU8(curlContent)
      }
    }

    const zipped = zipSync(files)
    const blob = new Blob([zipped], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)

    // [Phase 4] ZIP filename includes full timestamp: bug-report-2026-04-10T14-30-00.zip
    const zipName = buildZipFileName(date)
    chrome.downloads.download({ url, filename: zipName })
    URL.revokeObjectURL(url)

  } finally {
    await clearChunks()
  }
}

/**
 * Build the ZIP filename with timestamp.
 * Format: bug-report-2026-04-10T14-30-00.zip
 * @param {string} date  ISO string from session.date
 * @returns {string}
 */
function buildZipFileName(date) {
  const safe = String(date || new Date().toISOString())
    .replace(/\.\d{3}Z$/, '')   // remove milliseconds
    .replace(/[/:*?"\\<>|]/g, '-')  // sanitize filesystem-unsafe chars
  return `bug-report-${safe}.zip`
}

/**
 * Build a cURL export filename.
 * Format: [HH-MM-SS]_[METHOD]-[api-name].txt
 * Example: 14-30-00_POST-api-users-login.txt
 *
 * @param {{ timestamp?: string, method?: string, url?: string }} err
 * @returns {string}
 */
function buildCurlFileName(err) {
  // Timestamp: relative session time mm:ss → mm-ss
  const ts = String(err.timestamp || '00:00').replace(/:/g, '-')

  // Method
  const method = String(err.method || 'GET').toUpperCase()

  // API name: extract meaningful path segments from URL
  let apiName = 'request'
  try {
    const urlStr = String(err.url || '')
    // Try parsing as full URL first, fallback to treating as pathname
    let pathname = urlStr
    try {
      pathname = new URL(urlStr).pathname
    } catch (_) {
      // urlStr might already be a pathname
    }
    const cleaned = pathname
      .replace(/^\/+/, '')                 // strip leading slashes
      .replace(/\/+$/, '')                 // strip trailing slashes
      .replace(/\//g, '-')                 // path separators → dashes
      .replace(/[^a-zA-Z0-9-_]/g, '')     // only safe chars
      .slice(0, 40)
    if (cleaned) apiName = cleaned
  } catch (_) {}

  return `${ts}_${method}-${apiName}.txt`
}
