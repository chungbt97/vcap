import React, { useState } from 'react'
import { buildMarkdown } from '../utils/markdownBuilder'

/**
 * MarkdownPanel — Live preview of the Jira-ready markdown report.
 * [Live Export Sync] The session prop is already pre-filtered (only checked
 * Network requests and Console errors are included). Updating selections in
 * Network or Console tabs instantly reflects here.
 */
export default function MarkdownPanel({ session }) {
  const md = buildMarkdown(session)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const stepCount = session.steps?.length ?? 0
  const apiCount = session.apiRequests?.length ?? 0
  const consoleCount = session.consoleErrors?.length ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#fa520f' }}>description</span>
          Markdown Preview
        </h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 font-label text-[10px] font-bold text-on-surface-variant transition-all active:scale-95"
          style={{ background: '#2e2e2e', borderRadius: 4 }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 11, fontVariationSettings: copied ? "'FILL' 1" : "'FILL' 0" }}
          >
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Live selection summary */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="font-label text-[9px] text-on-surface-variant opacity-70">Will export:</span>
        <span className="font-label text-[9px] px-1.5 py-0.5 flex items-center gap-0.5" style={{ background: '#2e2e2e', borderRadius: 3, color: '#fa520f' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 9, fontVariationSettings: "'FILL' 1" }}>touch_app</span>
          {stepCount} steps
        </span>
        <span className="font-label text-[9px] px-1.5 py-0.5 flex items-center gap-0.5" style={{ background: '#2e2e2e', borderRadius: 3, color: '#ff716c' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 9, fontVariationSettings: "'FILL' 1" }}>wifi</span>
          {apiCount} API
        </span>
        <span className="font-label text-[9px] px-1.5 py-0.5 flex items-center gap-0.5" style={{ background: '#2e2e2e', borderRadius: 3, color: '#ffa110' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 9, fontVariationSettings: "'FILL' 1" }}>terminal</span>
          {consoleCount} console
        </span>
        <span className="font-label text-[8px] text-on-surface-variant opacity-40 italic">— updates live as you check/uncheck</span>
      </div>

      <div className="relative">
        <pre className="p-3 text-[10px] leading-relaxed overflow-auto custom-scrollbar whitespace-pre-wrap font-mono max-h-[60vh]"
          style={{
            background: '#161616',
            borderRadius: 4,
            border: '1px solid #2e2e2e',
            color: '#b0a89e',
          }}
        >
          {md}
        </pre>
      </div>
      <p className="mt-2 font-label text-[9px] text-on-surface-variant opacity-60">
        Paste directly into Jira — tables render natively.
      </p>
    </div>
  )
}
