import React, { useState } from 'react'
import MarkdownPanel from './MarkdownPanel.jsx'
import ApiErrorPanel from './ApiErrorPanel.jsx'
import { exportSession } from '../utils/zipExporter.js'

export default function App({ session }) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    setExportError(null)
    try {
      await exportSession(session)
    } catch (err) {
      setExportError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 font-sans">
      <h1 className="text-xl font-bold mb-4">VCAP Bug Report</h1>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? 'Exporting…' : 'Download ZIP'}
      </button>
      {exportError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {exportError}
        </div>
      )}
      <MarkdownPanel session={session} />
      <ApiErrorPanel apiErrors={session.apiErrors} />
    </div>
  )
}
