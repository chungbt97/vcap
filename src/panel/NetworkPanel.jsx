import React, { useState, useMemo, useRef, useEffect } from 'react'

/**
 * NetworkPanel — FB#2: GraphQL-aware network request display.
 * Filter pills: All / REST / GraphQL / Query / Mutation / Error
 * GraphQL rows show operation name, type, and are expandable (query/variables/response).
 */

function statusColor(status, isGraphQL, responseBody) {
  const hasGqlErrors = isGraphQL && responseBody?.includes('"errors"')
  if (!status || status === 0) return 'text-error border-error/30'
  if (hasGqlErrors) return 'text-[#ffa110] border-[#ffa110]/30'
  if (status >= 200 && status < 300) return 'text-[#22c55e] border-[#22c55e]/30'
  if (status >= 400) return 'text-error border-error/30'
  return 'text-on-surface-variant border-outline-variant'
}

function statusDot(status, isGraphQL, responseBody) {
  const hasGqlErrors = isGraphQL && responseBody?.includes('"errors"')
  if (!status || status === 0) return '🔴'
  if (hasGqlErrors) return '🟠'
  if (status >= 200 && status < 300) return '🟢'
  if (status >= 400) return '🔴'
  return '⚪'
}

function gqlTypeColor(type) {
  if (type === 'mutation') return 'bg-[#ffa110]/15 text-[#ffa110]'
  if (type === 'subscription') return 'bg-[#a78bfa]/15 text-[#a78bfa]'
  return 'bg-[#38bdf8]/15 text-[#38bdf8]'  // query (default)
}

const FILTER_PILLS = [
  { label: 'All',      value: 'all' },
  { label: 'REST',     value: 'rest' },
  { label: 'GraphQL',  value: 'graphql' },
  { label: 'Query',    value: 'query' },
  { label: 'Mutation', value: 'mutation' },
  { label: 'Error',    value: 'error' },
]

function matchesFilter(req, filter) {
  switch (filter) {
    case 'all':      return true
    case 'rest':     return !req.isGraphQL
    case 'graphql':  return !!req.isGraphQL
    case 'query':    return req.isGraphQL && req.gqlOperationType === 'query'
    case 'mutation': return req.isGraphQL && req.gqlOperationType === 'mutation'
    case 'error':
      return (
        !req.status || req.status === 0 || req.status >= 400 ||
        (req.isGraphQL && req.responseBody?.includes('"errors"'))
      )
    default: return true
  }
}

function tryFormatJson(str) {
  if (!str) return ''
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

export default function NetworkPanel({ apiRequests = [], selected, onToggle, onCheckAll, onUncheckAll }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [expandedId, setExpandedId] = useState(null)

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
      if (!matchesFilter(req, filter)) return false
      if (searchDebounced) {
        const q = searchDebounced.toLowerCase()
        const url = (req.url || '').toLowerCase()
        const opName = (req.gqlOperationName || '').toLowerCase()
        if (!url.includes(q) && !opName.includes(q)) return false
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
            placeholder="Filter by URL or operation name…"
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
          const isExpanded = expandedId === req.requestId
          const colorClass = statusColor(req.status, req.isGraphQL, req.responseBody)
          const hasGqlErrors = req.isGraphQL && req.responseBody?.includes('"errors"')

          return (
            <div
              key={req.requestId || `${req.url}-${req.timestamp}`}
              className={`rounded bg-surface-container border-l-2 transition-all ${colorClass} ${
                isSelected ? 'bg-surface-container-high' : 'opacity-40'
              }`}
            >
              {/* Main row — click to toggle selection, not expand */}
              <div
                className="p-2.5 cursor-pointer select-none"
                onClick={() => onToggle?.(req.requestId)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-label text-[9px] font-bold text-on-surface-variant bg-surface-container-highest px-1.5 py-0.5 rounded">
                      {req.timestamp}
                    </span>
                    {/* Type pill: GQL or REST */}
                    {req.isGraphQL ? (
                      <span className="font-label text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#a78bfa]/15 text-[#a78bfa]">
                        GQL
                      </span>
                    ) : (
                      <span className="font-label text-[8px] font-bold px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant">
                        REST
                      </span>
                    )}
                    {/* GQL operation type pill */}
                    {req.isGraphQL && req.gqlOperationType && (
                      <span className={`font-label text-[8px] font-bold px-1.5 py-0.5 rounded ${gqlTypeColor(req.gqlOperationType)}`}>
                        {req.gqlOperationType}
                      </span>
                    )}
                    {hasGqlErrors && (
                      <span className="font-label text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#ffa110]/15 text-[#ffa110]">
                        errors
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">{statusDot(req.status, req.isGraphQL, req.responseBody)}</span>
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

                {/* Operation summary (GQL) or method + URL (REST) */}
                {req.isGraphQL ? (
                  <p className="font-body text-[10px] text-on-surface leading-relaxed truncate">
                    <span className="font-label text-[9px] font-bold text-[#a78bfa] mr-1">
                      {req.gqlOperationType || 'query'} {req.gqlOperationName || 'Anonymous'}
                    </span>
                  </p>
                ) : (
                  <p className="font-body text-[10px] text-on-surface leading-relaxed truncate">
                    <span className="font-label text-[9px] font-bold text-on-surface-variant mr-1">{req.method}</span>
                    {req.url}
                  </p>
                )}
              </div>

              {/* Expand/collapse toggle for GraphQL rows */}
              {req.isGraphQL && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : req.requestId) }}
                    className="w-full flex items-center gap-1 px-2.5 pb-1.5 font-label text-[8px] text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[10px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                    {isExpanded ? 'Collapse' : 'View query / variables / response'}
                  </button>

                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 space-y-2">
                      {req.gqlQuery && (
                        <div>
                          <p className="font-label text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Query</p>
                          <pre className="bg-surface-container-lowest text-on-surface text-[9px] font-mono p-2 rounded overflow-x-auto max-h-[120px] whitespace-pre-wrap leading-relaxed">
                            {req.gqlQuery.slice(0, 800)}
                          </pre>
                        </div>
                      )}
                      {req.gqlVariables && (
                        <div>
                          <p className="font-label text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Variables</p>
                          <pre className="bg-surface-container-lowest text-on-surface text-[9px] font-mono p-2 rounded overflow-x-auto max-h-[80px] whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(req.gqlVariables, null, 2).slice(0, 500)}
                          </pre>
                        </div>
                      )}
                      {req.responseBody && (
                        <div>
                          <p className="font-label text-[8px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Response</p>
                          <pre className="bg-surface-container-lowest text-on-surface text-[9px] font-mono p-2 rounded overflow-x-auto max-h-[120px] whitespace-pre-wrap leading-relaxed">
                            {tryFormatJson(req.responseBody).slice(0, 800)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
