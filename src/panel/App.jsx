import React, { useState } from 'react'
import MarkdownPanel from './MarkdownPanel.jsx'
import NetworkPanel from './NetworkPanel.jsx'
import { exportSession } from '../utils/zipExporter.js'
import { MSG } from '../shared/messages.js'

const TABS = ['All', 'DOM', 'Network', 'Console', 'Export']

// Per-event-type display metadata: icon (Material Symbols) + accent color class
const EVENT_META = {
  click:    { icon: 'touch_app',         color: 'text-secondary',          border: 'border-secondary/40' },
  input:    { icon: 'keyboard',           color: 'text-primary',            border: 'border-primary/40' },
  change:   { icon: 'edit',              color: 'text-tertiary',           border: 'border-tertiary/40' },
  checkbox: { icon: 'check_box',         color: 'text-[#22c55e]',          border: 'border-[#22c55e]/40' },
  radio:    { icon: 'radio_button_checked', color: 'text-[#a78bfa]',       border: 'border-[#a78bfa]/40' },
  select:   { icon: 'arrow_drop_down_circle', color: 'text-[#f59e0b]',     border: 'border-[#f59e0b]/40' },
  switch:   { icon: 'toggle_on',         color: 'text-[#06b6d4]',          border: 'border-[#06b6d4]/40' },
  file:     { icon: 'attach_file',       color: 'text-on-surface-variant', border: 'border-outline-variant' },
  range:    { icon: 'linear_scale',      color: 'text-[#f59e0b]',          border: 'border-[#f59e0b]/40' },
  submit:   { icon: 'send',              color: 'text-error',              border: 'border-error/40' },
  keydown:  { icon: 'keyboard_return',   color: 'text-[#8b5cf6]',          border: 'border-[#8b5cf6]/40' },
  focus:    { icon: 'center_focus_strong', color: 'text-on-surface-variant', border: 'border-outline-variant/30' },
  blur:     { icon: 'blur_on',           color: 'text-on-surface-variant', border: 'border-outline-variant/30' },
  navigate: { icon: 'open_in_new',       color: 'text-primary',            border: 'border-primary/40' },
}

function getEventMeta(type) {
  return EVENT_META[type] || { icon: 'circle', color: 'text-on-surface-variant', border: 'border-outline-variant/30' }
}

export default function App({ session, vcapState, ticketName, loadError }) {
  const [activeTab, setActiveTab] = useState('All')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [exportDone, setExportDone] = useState(false)
  const [selectedRequests, setSelectedRequests] = useState(
    new Set(
      (session.apiRequests || [])
        .filter((r) => !r.status || r.status >= 400)
        .map((r) => r.requestId)
    )
  )

  const isRecording = vcapState?.status === 'recording'

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    setExportError(null)
    setExportDone(false)
    try {
      await exportSession({
        ...session,
        apiRequests: (session.apiRequests || []).filter((r) => selectedRequests.has(r.requestId)),
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

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-surface-container-highest flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="material-symbols-outlined text-primary flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 1", fontSize: 16 }}
          >
            bug_report
          </span>
          <div className="min-w-0">
            <h1 className="font-headline text-[11px] font-bold tracking-tighter text-on-surface uppercase truncate">
              {ticketName || 'VCAP Bug Report'}
            </h1>
            {session.date && (
              <p className="font-label text-[9px] text-on-surface-variant truncate">
                {new Date(session.date).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {/* Live recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#f97300]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97300] recording-pulse" />
              <span className="font-label text-[9px] text-[#f97300] font-bold">LIVE</span>
            </div>
          )}

          <div className="flex items-center gap-1 mr-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
            <span className="font-label text-[10px] text-on-surface-variant">{totalEvents} ev</span>
          </div>

          {/* Start Record */}
          <button
            onClick={handleStartRecord}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-label text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>fiber_manual_record</span>
            New
          </button>

          {/* Export ZIP */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1 px-2 py-1 rounded-lg font-label text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #81ecff, #00e3fd)', color: '#003840' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>
              {exporting ? 'progress_activity' : exportDone ? 'check_circle' : 'download'}
            </span>
            {exporting ? '…' : exportDone ? 'Done!' : 'ZIP'}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {(exportError || loadError) && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-error-container/20 border border-error/20 flex items-center gap-2 text-xs text-error">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
          {exportError || loadError}
        </div>
      )}

      {/* Filter Pills */}
      <nav className="px-4 py-2 flex gap-1.5 overflow-x-auto no-scrollbar bg-surface-dim border-b border-surface-container-highest">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-full font-label text-[10px] font-bold whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary'
            }`}
          >
            {tab}
            {tab === 'Network' && (() => {
              const errCnt = (session.apiRequests || [])
                .filter((r) => !r.status || r.status >= 400).length
              return errCnt > 0 ? (
                <span className="ml-1 bg-error/20 text-error px-1 rounded-full text-[8px]">
                  {errCnt}
                </span>
              ) : null
            })()}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 px-4 py-3 overflow-y-auto custom-scrollbar">
        {(activeTab === 'All' || activeTab === 'DOM') && (
          <section className="mb-5">
            {activeTab === 'All' && (
              <h2 className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: 12 }}>touch_app</span>
                DOM Steps
              </h2>
            )}
            <div className="space-y-1.5">
              {(session.steps || []).length === 0 ? (
                <EmptyState icon="touch_app" label="No DOM events recorded" />
              ) : (
                (session.steps || []).map((step, i) => {
                  const meta = getEventMeta(step.type)
                  return (
                    <div key={i} className={`p-2.5 rounded-xl bg-surface-container border-l-2 ${meta.border}`}>
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-label text-[9px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                            {step.timestamp || `#${i + 1}`}
                          </span>
                          <span className={`inline-flex items-center gap-0.5 font-label text-[8px] uppercase tracking-widest font-bold ${meta.color} bg-surface-container-highest px-1.5 py-0.5 rounded-full`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 9, fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                            {step.type}
                          </span>
                        </div>
                      </div>
                      <p className="font-body text-[11px] text-on-surface leading-relaxed">
                        <code className="bg-surface-container-highest text-secondary-fixed px-1 py-0.5 rounded text-[10px]">
                          {step.target}
                        </code>
                      </p>
                      {step.value && (
                        <p className={`mt-1 font-label text-[9px] italic ${meta.color} opacity-80`}>→ "{step.value}"</p>
                      )}
                    </div>
                  )
                })

              )}
            </div>
          </section>
        )}

        {(activeTab === 'All' || activeTab === 'Network') && (
          <section className="mb-5">
            {activeTab === 'All' && (
              <h2 className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-error" style={{ fontSize: 12 }}>wifi</span>
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
            />
          </section>
        )}

        {(activeTab === 'All' || activeTab === 'Console') && (
          <section className="mb-5">
            {activeTab === 'All' && (
              <h2 className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 12 }}>terminal</span>
                Console Errors
              </h2>
            )}
            <div className="space-y-1.5">
              {(session.consoleErrors || []).length === 0 ? (
                <EmptyState icon="terminal" label="No console errors" />
              ) : (
                (session.consoleErrors || []).map((e, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-surface-container border-l-2 border-error/40">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-label text-[9px] font-bold text-error bg-error/10 px-1.5 py-0.5 rounded">
                        {e.timestamp || `#${i + 1}`}
                      </span>
                    </div>
                    <p className="font-body text-[11px] text-on-surface leading-relaxed">{e.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'Export' && <MarkdownPanel session={session} />}
      </main>
    </div>
  )
}

function EmptyState({ icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-on-surface-variant">
      <span className="material-symbols-outlined opacity-30" style={{ fontSize: 28 }}>{icon}</span>
      <p className="font-label text-xs">{label}</p>
    </div>
  )
}
