import { zipSync, strToU8 } from 'fflate'
import { buildMarkdown } from './markdownBuilder.js'
import { buildCurl } from './curlBuilder.js'
import { readAllChunks, clearChunks } from './idb.js'

/**
 * Assemble and download the bug report ZIP.
 * @param {{
 *   steps: Array,
 *   apiErrors: Array,
 *   consoleErrors: Array,
 *   date: string,
 * }} session
 */
export async function exportSession(session) {
  const { steps, apiErrors = [], consoleErrors = [], date = '' } = session

  try {
    const videoBlob = await readAllChunks('video/webm')
    if (videoBlob.size === 0) {
      throw new Error('No recording captured. Start recording before exporting.')
    }

    const md = buildMarkdown({ steps, apiErrors, consoleErrors, date })

    const files = {
      'recording.webm': new Uint8Array(await videoBlob.arrayBuffer()),
      'report.md': strToU8(md),
    }

    for (const [i, err] of apiErrors.entries()) {
      const script = `#!/bin/bash\n${buildCurl(err)}`
      files[`api-errors/error-${i + 1}.sh`] = strToU8(script)
    }

    const zipped = zipSync(files)
    const blob = new Blob([zipped], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const sanitizedDate = String(date).replace(/[/:*?"\\<>|]/g, '-')
    chrome.downloads.download({ url, filename: `vcap-${sanitizedDate}.zip` })
    URL.revokeObjectURL(url)
  } finally {
    await clearChunks()
  }
}
