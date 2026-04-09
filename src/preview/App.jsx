import React from 'react'
import MarkdownPanel from './MarkdownPanel'
import ApiErrorPanel from './ApiErrorPanel'
import { exportSession } from '../utils/zipExporter'

export default function App({ session }) {
  const handleExport = () => exportSession(session)
  return (
    <div className="p-4 font-sans">
      <h1 className="text-xl font-bold mb-4">VCAP Bug Report</h1>
      <button
        onClick={handleExport}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Download ZIP
      </button>
      <MarkdownPanel session={session} />
      <ApiErrorPanel apiErrors={session.apiErrors} />
    </div>
  )
}
