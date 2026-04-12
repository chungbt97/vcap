import React, { useState, useMemo, useRef, useEffect } from 'react'

/**
 * NetworkPanel — Shows ALL network requests (success + error) with color coding.
 * Filter pills (All / Success / Error) + URL search with 300ms debounce.
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
  { label: 'Success', value: 'success' },
  { label: 'Error', value: 'error' },
]

export default function NetworkPanel({ apiRequests = [], selected, onToggle, onCheckAll, onUncheckAll }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  const selectAllRef = useRef(null)
  const allChecked = selected?.size === apiRequests.length && apiRequests.length > 0
  const noneChecked = !selected || selected.size === 0

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allChecked && !noneChecked
    }
  }, [allChecked, noneChecked])

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
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined opacity-30 text-[28px]">wifi</span>
        <p className="font-label text-xs">No network requests recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Filter bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setFilter(pill.value)}
              className={`px-2.5 py-0.5 rounded-full font-label text-[9px] font-bold transition-colors ${
                filter === pill.value
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {pill.label}
            </button>
          ))}
          {/* Select All checkbox */}
          <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={allChecked}
              onChange={() => allChecked ? onUncheckAll?.() : onCheckAll?.(apiRequests.map(r => r.requestId))}
              className="w-3 h-3 accent-primary cursor-pointer"
            />
            <span className="font-label text-[9px] font-bold text-on-surface-variant">Select All</span>
          </label>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[12px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Filter by URL..."
            className="w-full bg-surface-container-high border border-outline-variant rounded pl-7 pr-3 py-1 font-label text-[10px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/60"
          />
        </div>
      </div>

      <p className="font-label text-[9px] text-on-surface-variant">
        {selected?.size ?? filtered.length} / {apiRequests.length} selected
        {(filter !== 'all' || searchDebounced) ? ` (${filtered.length} shown)` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined opacity-30 text-[24px]">filter_list_off</span>
          <p className="font-label text-[10px]">No requests match filter</p>
        </div>
      ) : (
        filtered.map((req) => {
          const isSelected = selected ? selected.has(req.requestId) : true
          const colorClass = statusColor(req.status)
          return (
            <div
              key={req.requestId || `${req.url}-${req.timestamp}`}
              onClick={() => onToggle?.(req.requestId)}
              className={`p-2.5 rounded bg-surface-container transition-all border-l-2 cursor-pointer select-none ${colorClass} ${
                isSelected ? 'bg-surface-container-high' : 'opacity-40'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-label text-[9px] font-bold text-on-surface-variant bg-surface-container-highest px-1.5 py-0.5 rounded">
                    {req.timestamp}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">{statusDot(req.status)}</span>
                  <span className="font-label text-[10px] font-bold font-mono">{req.status || '—'}</span>
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                      isSelected ? 'bg-primary border-primary' : 'border-outline-variant'
                    }`}
                  >
                    {isSelected && (
                      <span
                        className="material-symbols-outlined text-on-primary text-[10px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="font-body text-[10px] text-on-surface leading-relaxed truncate">
                <span className="font-label text-[9px] font-bold text-on-surface-variant mr-1">{req.method}</span>
                {req.url}
              </p>
            </div>
          )
        })
      )}
    </div>
  )
}
