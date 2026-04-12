import React, { useState, useMemo } from 'react'

/**
 * NetworkPanel — [B3] Replaces ApiErrorPanel.
 * Shows ALL network requests (success + error) with color coding.
 * [B4] Includes filter pills (All / Success / Error) + URL search.
 */

function statusColor(status) {
  if (!status || status === 0) return 'text-error border-error/30'
  if (status >= 200 && status < 300) return 'text-[#22c55e] border-[#22c55e]/30'
  if (status >= 400) return 'text-error border-error/30'
  return 'text-on-surface-variant border-outline-variant'
}

function statusDot(status) {
  if (!status || status === 0) return '🔴'
  if (status >= 200 && status < 300) return '🟢'
  if (status >= 400) return '🔴'
  return '⚪'
}

function statusCategory(status) {
  if (!status || status === 0) return 'error'
  if (status >= 200 && status < 300) return 'success'
  if (status >= 400) return 'error'
  return 'other'
}

const FILTER_PILLS = [
  { label: 'All', value: 'all' },
  { label: 'Success (2xx)', value: 'success' },
  { label: 'Error (4xx/5xx)', value: 'error' },
]

export default function NetworkPanel({ apiRequests = [], selected, onToggle }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  // Debounce search input 300ms
  const debounceRef = React.useRef(null)
  const handleSearch = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearchDebounced(val), 300)
  }

  const filtered = useMemo(() => {
    return apiRequests.filter((req) => {
      if (filter !== 'all' && statusCategory(req.status) !== filter) return false
      if (searchDebounced) {
        const url = (req.url || '').toLowerCase()
        if (!url.includes(searchDebounced.toLowerCase())) return false
      }
      return true
    })
  }, [apiRequests, filter, searchDebounced])

  if (!apiRequests.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined opacity-30 text-[36px]">wifi</span>
        <p className="font-label text-xs">No network requests recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-col gap-2">
        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setFilter(pill.value)}
              className={`px-3 py-1 rounded-full font-label text-[10px] font-bold transition-colors ${
                filter === pill.value
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
        {/* URL search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[14px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Filter by URL..."
            className="w-full bg-surface-container-high border border-outline-variant rounded pl-8 pr-3 py-1.5 font-label text-[11px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/60"
          />
        </div>
      </div>

      {/* Count line */}
      <p className="font-label text-[10px] text-on-surface-variant">
        {selected?.size ?? filtered.length} of {apiRequests.length} requests
        {filter !== 'all' || searchDebounced ? ` (${filtered.length} shown)` : ''}
        {' '}selected for export
      </p>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined opacity-30 text-[28px]">filter_list_off</span>
          <p className="font-label text-xs">No requests match filter</p>
        </div>
      ) : (
        filtered.map((req) => {
          const isSelected = selected ? selected.has(req.requestId) : true
          const colorClass = statusColor(req.status)
          return (
            <div
              key={req.requestId || `${req.url}-${req.timestamp}`}
              onClick={() => onToggle?.(req.requestId)}
              className={`p-3 rounded bg-surface-container transition-all border-l-2 cursor-pointer select-none ${colorClass} ${
                isSelected ? 'bg-surface-container-high' : 'opacity-40'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-label text-[10px] font-bold text-on-surface-variant bg-surface-container-highest px-1.5 py-0.5 rounded">
                    {req.timestamp}
                  </span>
                  <span className="font-label text-[9px] uppercase tracking-widest font-bold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">
                    Network
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">{statusDot(req.status)}</span>
                  <span className="font-label text-xs font-bold font-mono">
                    {req.status || '—'}
                  </span>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      isSelected ? 'bg-primary border-primary' : 'border-outline-variant'
                    }`}
                  >
                    {isSelected && (
                      <span
                        className="material-symbols-outlined text-on-primary text-[12px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="font-body text-xs text-on-surface leading-relaxed truncate">
                <span className="font-label text-[10px] font-bold text-on-surface-variant mr-1.5">
                  {req.method}
                </span>
                {req.url}
              </p>
            </div>
          )
        })
      )}
    </div>
  )
}
