import React from 'react'

export default function ApiErrorPanel({ apiErrors = [] }) {
  if (!apiErrors.length) return null
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">API Errors ({apiErrors.length})</h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 text-left border">Time</th>
            <th className="p-2 text-left border">Method</th>
            <th className="p-2 text-left border">URL</th>
            <th className="p-2 text-left border">Status</th>
          </tr>
        </thead>
        <tbody>
          {apiErrors.map((e, i) => (
            <tr key={i} className="border-t">
              <td className="p-2 border">{e.timestamp}</td>
              <td className="p-2 border">{e.method}</td>
              <td className="p-2 border break-all">{e.url}</td>
              <td className="p-2 border text-red-600 font-mono">{e.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
