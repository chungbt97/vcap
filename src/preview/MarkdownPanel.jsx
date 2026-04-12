import React, { useState } from 'react'
import { buildMarkdown } from '../utils/markdownBuilder'

export default function MarkdownPanel({ session }) {
  const md = buildMarkdown(session)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-dim text-[14px]">description</span>
          Markdown Preview
        </h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest font-label text-[10px] font-bold text-on-surface-variant transition-all active:scale-95"
        >
          <span
            className="material-symbols-outlined text-[12px]"
            style={{ fontVariationSettings: copied ? "'FILL' 1" : "'FILL' 0" }}
          >
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="relative">
        <pre className="bg-surface-container-low rounded-xl p-4 text-xs text-on-surface-variant leading-relaxed overflow-auto custom-scrollbar whitespace-pre-wrap font-mono max-h-[60vh] border border-surface-container-highest">
          {md}
        </pre>
      </div>
      <p className="mt-2 font-label text-[10px] text-on-surface-variant opacity-60">
        Paste directly into Jira — tables render natively.
      </p>
    </div>
  )
}
