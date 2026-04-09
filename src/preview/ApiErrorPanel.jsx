import React, { useState } from 'react'

const STATUS_COLOR = {
  403: 'text-error border-error/30',
  404: 'text-error border-error/30',
  500: 'text-error border-error/40',
  502: 'text-error border-error/40',
  503: 'text-error border-error/40',
}

export default function ApiErrorPanel({ apiErrors = [], selected, onToggle }) {
  if (!apiErrors.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined opacity-30" style={{fontSize:36}}>check_circle</span>
        <p className="font-label text-xs">No API errors — clean run!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="font-label text-[10px] text-on-surface-variant mb-2">
        {selected?.size ?? apiErrors.length} of {apiErrors.length} selected for export
      </p>
      {apiErrors.map((e) => {
        const isSelected = selected ? selected.has(e.requestId) : true
        const colorClass = STATUS_COLOR[e.status] || 'text-error border-error/30'
        return (
          <div
            key={e.requestId || `${e.url}-${e.timestamp}`}
            onClick={() => onToggle?.(e.requestId)}
            className={`p-3 rounded-xl bg-surface-container transition-all border-l-2 cursor-pointer select-none ${colorClass} ${
              isSelected ? 'bg-surface-container-high' : 'opacity-40'
            }`}
          >
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-label text-[10px] font-bold text-error bg-error/10 px-1.5 py-0.5 rounded">{e.timestamp}</span>
                <span className="font-label text-[9px] uppercase tracking-widest font-bold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">API Error</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label text-xs font-bold text-error font-mono">{e.status}</span>
                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  isSelected ? 'bg-primary border-primary' : 'border-outline-variant'
                }`}>
                  {isSelected && <span className="material-symbols-outlined text-on-primary" style={{fontSize:12,fontVariationSettings:"'FILL' 1"}}>check</span>}
                </div>
              </div>
            </div>
            <p className="font-body text-xs text-on-surface leading-relaxed">
              <span className="font-label text-[10px] font-bold text-on-surface-variant mr-1.5">{e.method}</span>
              <span className="break-all">{e.url}</span>
            </p>
          </div>
        )
      })}
    </div>
  )
}
