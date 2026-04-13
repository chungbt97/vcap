import React, { useState, useEffect } from 'react'
import MarkdownPanel from './MarkdownPanel.jsx'
import NetworkPanel from './NetworkPanel.jsx'
import ConsolePanel from './ConsolePanel.jsx'
import { exportSession } from '../utils/zipExporter.js'
import { MSG } from '../shared/messages.js'
import config from '../../vcap.config.js'

const TABS = ['All', 'DOM', 'Network', 'Console', 'Export']

// Per-event-type display metadata: icon (Material Symbols) + accent color
const EVENT_META = {
  click:    { icon: 'touch_app',              color: '#fa520f' },
  input:    { icon: 'keyboard',               color: '#ffa110' },
  change:   { icon: 'edit',                   color: '#ffb83e' },
  checkbox: { icon: 'check_box',              color: '#22c55e' },
  radio:    { icon: 'radio_button_checked',   color: '#a78bfa' },
  select:   { icon: 'arrow_drop_down_circle', color: '#ffa110' },
  switch:   { icon: 'toggle_on',              color: '#06b6d4' },
  file:     { icon: 'attach_file',            color: '#b0a89e' },
  range:    { icon: 'linear_scale',           color: '#ffd900' },
  submit:   { icon: 'send',                   color: '#ff716c' },
  keydown:  { icon: 'keyboard_return',        color: '#c084fc' },
  focus:    { icon: 'center_focus_strong',    color: '#b0a89e' },
  blur:     { icon: 'blur_on',                color: '#b0a89e' },
  navigate: { icon: 'open_in_new',            color: '#fa520f' },
}

function getEventMeta(type) {
  return EVENT_META[type] || { icon: 'circle', color: '#b0a89e' }
}

// ── FB#3: Parse "mm:ss" timestamp → total seconds for chronological sorting ──
function parseTimestamp(ts) {
  if (!ts) return Infinity
  const parts = ts.split(':').map(Number)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return Infinity
}

export default function App({ session, vcapState, ticketName, loadError }) {
  const [activeTab, setActiveTab] = useState('All')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [exportDone, setExportDone] = useState(false)
  const [isDark, setIsDark] = useState(true)  // default dark

  // [H4] Network selection — init from all requests, pre-select errors
  const [selectedRequests, setSelectedRequests] = useState(
    new Set(
      (session.apiRequests || [])
        .filter((r) => !r.status || r.status >= 400)
        .map((r) => r.requestId)
    )
  )

  // [H3] Console selection — init from all console errors (all selected by default)
  const [selectedConsole, setSelectedConsole] = useState(
    new Set((session.consoleErrors || []).map((e, i) => e.id ?? i))
  )

  const isRecording = vcapState?.status === 'recording'

  // Load saved theme preference + listen for changes from popup
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('vcapTheme', (d) => {
        const dark = d.vcapTheme !== 'light'
        setIsDark(dark)
        document.documentElement.classList.toggle('dark', dark)
        document.documentElement.classList.toggle('light', !dark)
      })

      // Sync in real-time if popup changes the theme
      const listener = (changes, area) => {
        if (area === 'local' && changes.vcapTheme) {
          const dark = changes.vcapTheme.newValue !== 'light'
          setIsDark(dark)
          document.documentElement.classList.toggle('dark', dark)
          document.documentElement.classList.toggle('light', !dark)
        }
      }
      chrome.storage.onChanged.addListener(listener)
      return () => chrome.storage.onChanged.removeListener(listener)
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.classList.toggle('light', !next)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ vcapTheme: next ? 'dark' : 'light' })
    }
  }

  // [Live Export Sync] Always compute the filtered session from current selections.
  // This updates in real-time as user checks/unchecks items in Network or Console tabs.
  const filteredSession = {
    ...session,
    apiRequests: (session.apiRequests || []).filter((r) => selectedRequests.has(r.requestId)),
    consoleErrors: (session.consoleErrors || []).filter((e, i) => selectedConsole.has(e.id ?? i)),
  }

  // [H4] Sync network selections to session storage so Popup export can read them
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) return
    chrome.storage.session.set({
      vcapSelectedRequests: [...selectedRequests],
      vcapSelectedConsole: [...selectedConsole],
    })
  }, [selectedRequests, selectedConsole])

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    setExportError(null)
    setExportDone(false)
    try {
      await exportSession({
        // [H4] Use filteredSession which already respects selections
        ...filteredSession,
        ticketName: ticketName || '',
      })
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } catch (err) {
      setExportError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleStartRecord = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: MSG.NEW_RECORDING })
    }
  }

  const totalEvents =
    (session.steps?.length || 0) +
    (session.apiRequests?.length || 0) +
    (session.consoleErrors?.length || 0)

  const errCount = (session.apiRequests || []).filter((r) => !r.status || r.status >= 400).length

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      {/* ── Top App Bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-outline-variant flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="material-symbols-outlined flex-shrink-0 text-[16px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bug_report
          </span>
          <div className="min-w-0">
            <h1 className="font-headline text-[11px] font-bold tracking-tighter text-on-surface uppercase truncate">
              {ticketName || config.APP_NAME + ' Bug Report'}
            </h1>
            {session.date && (
              <p className="font-label text-[9px] text-on-surface-variant truncate">
                {new Date(session.date).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {/* Live indicator */}
          {isRecording && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
              <span className="w-1.5 h-1.5 rounded-full bg-primary recording-pulse" />
              <span className="font-label text-[9px] font-bold text-primary">LIVE</span>
            </div>
          )}

          <div className="flex items-center gap-1 mr-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-fixed pulse-glow" />
            <span className="font-label text-[10px] text-on-surface-variant">{totalEvents} ev</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-6 h-6 text-on-surface-variant transition-all active:scale-95 hover:bg-surface-container-highest rounded"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* New Recording */}
          <button
            id="panel-new-recording-btn"
            onClick={handleStartRecord}
            className="flex items-center gap-1 px-2.5 py-1 font-label text-[9px] font-bold uppercase tracking-wider bg-surface-container-high text-primary rounded transition-all active:scale-95"
          >
            <span
              className="material-symbols-outlined text-[11px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              fiber_manual_record
            </span>
            New
          </button>

          {/* Export ZIP */}
          <button
            id="panel-export-zip-btn"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1 px-2.5 py-1 font-label text-[9px] font-bold uppercase tracking-wider bg-gradient-to-br from-primary-fixed-dim to-primary text-on-primary rounded transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              className="material-symbols-outlined text-[11px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {exporting ? 'progress_activity' : exportDone ? 'check_circle' : 'download'}
            </span>
            {exporting ? '…' : exportDone ? 'Done!' : 'ZIP'}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {(exportError || loadError) && (
        <div className="mx-4 mt-3 p-3 bg-error/10 border-l-2 border-error flex items-center gap-2 text-xs text-error rounded">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {exportError || loadError}
        </div>
      )}

      {/* ── Filter Pills ─────────────────────────────────────────────────── */}
      <nav className="px-4 py-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-outline-variant bg-surface-dim">
        {TABS.map((tab) => {
          // Compute badge count per tab
          const badgeCount = tab === 'Network' ? errCount
            : tab === 'Console' ? (session.consoleErrors?.length || 0)
            : tab === 'DOM' ? (session.steps?.length || 0)
            : 0

          return (
            <button
              key={tab}
              id={`panel-tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 font-label text-[10px] font-bold whitespace-nowrap transition-all rounded ${
                activeTab === tab
                  ? 'bg-primary text-on-primary'
                  : 'bg-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab}
              {badgeCount > 0 && (
                <span className={`ml-1 px-1 rounded text-[8px] ${
                  activeTab === tab
                    ? 'bg-white/20 text-white'
                    : 'bg-error/20 text-error'
                }`}>
                  {badgeCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-3 overflow-y-auto custom-scrollbar">
        {/* DOM Steps + Notes (interleaved by timestamp) */}
        {(activeTab === 'All' || activeTab === 'DOM') && (
          <section className="mb-5">
            {activeTab === 'All' && (
              <h2 className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px] text-primary">touch_app</span>
                DOM Steps
              </h2>
            )}
            <div className="space-y-1.5">
              {(session.steps || []).length === 0 && (session.notes || []).length === 0 ? (
                <EmptyState icon="touch_app" label="No DOM events recorded" />
              ) : (
                (() => {
                  // ← FB#3: Merge steps and notes, sort chronologically by timestamp
                  const steps = (session.steps || []).map((s) => ({ ...s, _kind: 'step' }))
                  const notes = (session.notes || []).map((n) => ({
                    ...n,
                    timestamp: n.relativeTimestamp || n.timestamp || '',
                    _kind: 'note',
                  }))
                  const merged = [...steps, ...notes].sort(
                    (a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
                  )

                  return merged.map((item, i, arr) => {
                    if (item._kind === 'note') {
                      return (
                        <div
                          key={`note-${i}`}
                          className="p-2.5 bg-surface-container rounded border-l-2"
                          style={{ borderLeftColor: '#a78bfa55' }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="font-label text-[9px] font-bold bg-surface-container-highest px-1.5 py-0.5 rounded-sm"
                              style={{ color: '#a78bfa' }}
                            >
                              {item.timestamp || '—'}
                            </span>
                            <span
                              className="inline-flex items-center gap-0.5 font-label text-[8px] uppercase tracking-widest font-bold bg-surface-container-highest px-1.5 py-0.5 rounded-[10px]"
                              style={{ color: '#a78bfa' }}
                            >
                              📝 note
                            </span>
                          </div>
                          <p className="font-body text-[11px] text-on-surface leading-relaxed italic">
                            {item.text}
                          </p>
                        </div>
                      )
                    }

                    // Regular DOM step
                    const step = item
                    const meta = getEventMeta(step.type)
                    const prevItem = arr[i - 1]
                    const prevUrl = prevItem?._kind === 'step' ? prevItem.url : null
                    const showUrlDivider = step.url && step.url !== prevUrl

                    return (
                      <React.Fragment key={i}>
                        {showUrlDivider && (
                          <div className="flex items-center gap-2 my-2 py-1.5 px-2 bg-surface-container-highest/50 rounded border-l-2 border-primary-fixed">
                            <span className="material-symbols-outlined text-[10px] text-primary-fixed">link</span>
                            <span className="font-label text-[9px] text-on-surface-variant truncate">{step.url}</span>
                          </div>
                        )}
                        <div
                          className="p-2.5 bg-surface-container rounded"
                          style={{ borderLeft: `2px solid ${meta.color}33` }}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span
                              className="font-label text-[9px] font-bold bg-surface-container-highest px-1.5 py-0.5 rounded-sm"
                              style={{ color: meta.color }}
                            >
                              {step.timestamp || `#${i + 1}`}
                            </span>
                            <span
                              className="inline-flex items-center gap-0.5 font-label text-[8px] uppercase tracking-widest font-bold bg-surface-container-highest px-1.5 py-0.5 rounded-[10px]"
                              style={{ color: meta.color }}
                            >
                              <span
                                className="material-symbols-outlined text-[9px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                {meta.icon}
                              </span>
                              {step.type}
                            </span>
                          </div>
                          <p className="font-body text-[11px] text-on-surface leading-relaxed">
                            <code className="bg-surface-container-highest text-on-surface-variant px-1 py-0.5 text-[10px] rounded-sm">
                              {step.target}
                            </code>
                          </p>
                          {step.value && (
                            <p className="mt-1 font-label text-[9px] italic opacity-80" style={{ color: meta.color }}>→ "{step.value}"</p>
                          )}
                        </div>
                      </React.Fragment>
                    )
                  })
                })()
              )}
            </div>
          </section>
        )}

        {/* Network */}
        {(activeTab === 'All' || activeTab === 'Network') && (
          <section className="mb-5">
            {activeTab === 'All' && (
              <h2 className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-error text-[12px]">wifi</span>
                Network
              </h2>
            )}
            <NetworkPanel
              apiRequests={session.apiRequests || []}
              selected={selectedRequests}
              onToggle={(id) =>
                setSelectedRequests((prev) => {
                  const next = new Set(prev)
                  next.has(id) ? next.delete(id) : next.add(id)
                  return next
                })
              }
              onCheckAll={(ids) => setSelectedRequests(new Set(ids))}
              onUncheckAll={() => setSelectedRequests(new Set())}
            />
          </section>
        )}

        {/* Console */}
        {(activeTab === 'All' || activeTab === 'Console') && (
          <section className="mb-5">
            {activeTab === 'All' && (
              <h2 className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px] text-primary-fixed">terminal</span>
                Console Errors
              </h2>
            )}
            <ConsolePanel
              consoleErrors={session.consoleErrors || []}
              selected={selectedConsole}
              onToggle={(id) =>
                setSelectedConsole((prev) => {
                  const next = new Set(prev)
                  next.has(id) ? next.delete(id) : next.add(id)
                  return next
                })
              }
              onCheckAll={(ids) => setSelectedConsole(new Set(ids))}
              onUncheckAll={() => setSelectedConsole(new Set())}
            />
          </section>
        )}

        {activeTab === 'Export' && <MarkdownPanel session={filteredSession} />}
      </main>
    </div>
  )
}

function EmptyState({ icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-on-surface-variant">
      <span className="material-symbols-outlined opacity-30 text-[28px]">{icon}</span>
      <p className="font-label text-xs">{label}</p>
    </div>
  )
}
