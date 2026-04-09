import React from 'react'
import { buildMarkdown } from '../utils/markdownBuilder'

export default function MarkdownPanel({ session }) {
  const md = buildMarkdown(session)
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold mb-2">Markdown Report</h2>
      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto whitespace-pre-wrap">{md}</pre>
    </div>
  )
}
