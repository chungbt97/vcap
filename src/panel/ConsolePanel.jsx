import React, { useState, useMemo } from 'react'

/**
 * ConsolePanel — Shows console errors/warnings with per-item checkboxes.
 * [H3] Mirror of NetworkPanel: filter pills (All / Error / Warning) + search + checkbox toggle.
 */

function sourceColor(source) {
  if (source === 'error' || source === 'exception') return 'text-error border-error/30 bg-error/5'
  if (source === 'warning' || source === 'warn') return 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/5'
  return 'text-on-surface-variant border-outline-variant/30'
}

function sourceLabel(source) {
  if (source === 'exception') return 'EXCEPTION'
  if (source === 'error') return 'ERROR'
  if (source === 'warning' || source === 'warn') return 'WARN'
  return (source || 'LOG').toUpperCase()
}

function sourceCategory(source) {
  if (source === 'error' || source === 'exception') return 'error'
  if (source === 'warning' || source === 'warn') return 'warning'
  return 'other'
}

const FILTER_PILLS = [
  { label: 'All', value: 'all' },
  { label: 'Errors', value: 'error' },
  { label: 'Warnings', value: 'warning' },
]

export default function ConsolePanel({ consoleErrors = [], selected, onToggle, onCheckAll, onUncheckAll }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  const debounceRef = React.useRef(null)
  const handleSearch = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearchDebounced(val), 300)
  }

  const filtered = useMemo(() => {
    return consoleErrors.filter((e) => {
      if (filter !== 'all' && sourceCategory(e.source) !== filter) return false
      if (searchDebounced) {
        const msg = (e.message || '').toLowerCase()
        if (!msg.includes(searchDebounced.toLowerCase())) return false
      }
      return true
    })
  }, [consoleErrors, filter, searchDebounced])

  if (!consoleErrors.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined opacity-30" style={{ fontSize: 28 }}>terminal</span>
        <p className="font-label text-xs">No console errors recorded</p>
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
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {pill.label}
            </button>
          ))}
          {/* Check All / Uncheck All */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => onCheckAll?.(consoleErrors.map((e, i) => e.id ?? i))}
              className="px-2 py-0.5 font-label text-[9px] font-bold transition-colors text-on-surface-variant hover:text-primary"
              style={{ background: '#2e2e2e', borderRadius: 3 }}
              title="Check all console errors"
            >
              ✓ All
            </button>
            <button
              onClick={() => onUncheckAll?.()}
              className="px-2 py-0.5 font-label text-[9px] font-bold transition-colors text-on-surface-variant hover:text-error"
              style={{ background: '#2e2e2e', borderRadius: 3 }}
              title="Uncheck all console errors"
            >
              ✗ None
            </button>
          </div>
        </div>
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
            style={{ fontSize: 12 }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Filter by message..."
            className="w-full bg-surface-container-high border border-outline-variant rounded-lg pl-7 pr-3 py-1 font-label text-[10px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/60"
          />
        </div>
      </div>

      <p className="font-label text-[9px] text-on-surface-variant">
        {selected?.size ?? filtered.length} / {consoleErrors.length} selected
        {(filter !== 'all' || searchDebounced) ? ` (${filtered.length} shown)` : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined opacity-30" style={{ fontSize: 24 }}>filter_list_off</span>
          <p className="font-label text-[10px]">No messages match filter</p>
        </div>
      ) : (
        filtered.map((e, i) => {
          // Use index as key — console errors have no requestId equivalent
          const id = e.id ?? i
          const isSelected = selected ? selected.has(id) : true
          const colorClass = sourceColor(e.source)
          return (
            <div
              key={id}
              onClick={() => onToggle?.(id)}
              className={`p-2.5 rounded border-l-2 cursor-pointer select-none transition-all ${colorClass} ${
                isSelected ? 'bg-surface-container-high' : 'opacity-40'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-label text-[9px] font-bold text-on-surface-variant bg-surface-container-highest px-1.5 py-0.5 rounded">
                    {e.timestamp || `#${i + 1}`}
                  </span>
                  <span className={`font-label text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-surface-container-highest ${colorClass.split(' ')[0]}`}>
                    {sourceLabel(e.source)}
                  </span>
                </div>
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors flex-shrink-0 mt-0.5 ${
                    isSelected ? 'bg-primary border-primary' : 'border-outline-variant'
                  }`}
                >
                  {isSelected && (
                    <span
                      className="material-symbols-outlined text-on-primary"
                      style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  )}
                </div>
              </div>
              <p className="font-body text-[10px] text-on-surface leading-relaxed break-all">
                {e.message}
              </p>
            </div>
          )
        })
      )}
    </div>
  )
}
