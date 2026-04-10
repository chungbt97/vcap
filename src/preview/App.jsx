import React, { useState } from 'react'
import MarkdownPanel from './MarkdownPanel.jsx'
import ApiErrorPanel from './ApiErrorPanel.jsx'
import { exportSession } from '../utils/zipExporter.js'
import { MSG } from '../shared/messages.js'

const TABS = ['All', 'DOM', 'API Errors', 'Console', 'Export']

export default function App({ session }) {
  const [activeTab, setActiveTab] = useState('All')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [exportDone, setExportDone] = useState(false)
  const [selectedErrors, setSelectedErrors] = useState(
    new Set((session.apiErrors || []).map((e) => e.requestId))
  )

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    setExportError(null)
    setExportDone(false)
    try {
      await exportSession({ ...session, apiErrors: session.apiErrors.filter(e => selectedErrors.has(e.requestId)) })
      setExportDone(true)
    } catch (err) {
      setExportError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleStartRecord = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: MSG.NEW_RECORDING })
      window.close()
    }
  }

  const totalEvents = (session.steps?.length || 0) + (session.apiErrors?.length || 0) + (session.consoleErrors?.length || 0)

  return (
    <div className="min-h-screen bg-background text-on-surface font-body flex flex-col">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-surface-container-highest flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary" style={{fontVariationSettings:"'FILL' 1"}}>bug_report</span>
          <h1 className="font-headline text-sm font-bold tracking-tighter text-on-surface uppercase">VCAP Bug Report</h1>
          {session.date && (
            <span className="font-label text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
              {new Date(session.date).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
            <span className="font-label text-[11px] text-on-surface-variant">{totalEvents} events</span>
          </div>
          {/* Start Record button */}
          <button
            onClick={handleStartRecord}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-label text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
          >
            <span className="material-symbols-outlined" style={{fontSize:14, fontVariationSettings:"'FILL' 1"}}>fiber_manual_record</span>
            Start Record
          </button>
          {/* Export ZIP button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{background: 'linear-gradient(135deg, #81ecff, #00e3fd)', color: '#003840'}}
          >
            <span className="material-symbols-outlined" style={{fontSize:14, fontVariationSettings:"'FILL' 1"}}>
              {exporting ? 'progress_activity' : exportDone ? 'check_circle' : 'download'}
            </span>
            {exporting ? 'Exporting…' : exportDone ? 'Downloaded!' : 'Export ZIP'}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {exportError && (
        <div className="mx-5 mt-3 p-3 rounded-xl bg-error-container/20 border border-error/20 flex items-center gap-2 text-sm text-error">
          <span className="material-symbols-outlined" style={{fontSize:16}}>error</span>
          {exportError}
        </div>
      )}

      {/* Filter Pills */}
      <nav className="px-5 py-3 flex gap-2 overflow-x-auto no-scrollbar bg-surface-dim border-b border-surface-container-highest">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full font-label text-[11px] font-bold whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary'
            }`}
          >
            {tab}
            {tab === 'API Errors' && session.apiErrors?.length > 0 && (
              <span className="ml-1.5 bg-error/20 text-error px-1.5 rounded-full text-[9px]">{session.apiErrors.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 px-5 py-4 overflow-y-auto custom-scrollbar">
        {(activeTab === 'All' || activeTab === 'DOM') && (
          <section className="mb-6">
            {activeTab === 'All' && (
              <h2 className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary" style={{fontSize:14}}>touch_app</span>
                DOM Steps
              </h2>
            )}
            <div className="space-y-2">
              {(session.steps || []).length === 0 ? (
                <EmptyState icon="touch_app" label="No DOM events recorded" />
              ) : (
                (session.steps || []).map((step, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all border-l-2 border-secondary/30">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-label text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">{step.timestamp || `#${i+1}`}</span>
                        <span className="font-label text-[9px] uppercase tracking-widest font-bold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">{step.type}</span>
                      </div>
                      <span className="material-symbols-outlined text-secondary" style={{fontSize:14}}>{step.type === 'click' ? 'ads_click' : 'edit_square'}</span>
                    </div>
                    <p className="font-body text-xs text-on-surface leading-relaxed">
                      <code className="bg-surface-container-highest text-secondary-fixed px-1.5 py-0.5 rounded text-[11px]">{step.target}</code>
                    </p>
                    {step.value && (
                      <p className="mt-1.5 font-label text-[10px] text-on-surface-variant italic">→ "{step.value}"</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {(activeTab === 'All' || activeTab === 'API Errors') && (
          <section className="mb-6">
            {activeTab === 'All' && (
              <h2 className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-error" style={{fontSize:14}}>report</span>
                API Errors
              </h2>
            )}
            <ApiErrorPanel
              apiErrors={session.apiErrors || []}
              selected={selectedErrors}
              onToggle={(id) => setSelectedErrors(prev => {
                const next = new Set(prev)
                next.has(id) ? next.delete(id) : next.add(id)
                return next
              })}
            />
          </section>
        )}

        {(activeTab === 'All' || activeTab === 'Console') && (
          <section className="mb-6">
            {activeTab === 'All' && (
              <h2 className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{fontSize:14}}>terminal</span>
                Console Errors
              </h2>
            )}
            <div className="space-y-2">
              {(session.consoleErrors || []).length === 0 ? (
                <EmptyState icon="terminal" label="No console errors" />
              ) : (
                (session.consoleErrors || []).map((e, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all border-l-2 border-error/40">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-label text-[10px] font-bold text-error bg-error/10 px-1.5 py-0.5 rounded">{e.timestamp || `#${i+1}`}</span>
                      <span className="font-label text-[9px] uppercase tracking-widest font-bold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">Console</span>
                    </div>
                    <p className="font-body text-xs text-on-surface leading-relaxed">{e.message}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'Export' && (
          <MarkdownPanel session={session} />
        )}
      </main>
    </div>
  )
}

function EmptyState({ icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant">
      <span className="material-symbols-outlined opacity-30" style={{fontSize:36}}>{icon}</span>
      <p className="font-label text-xs">{label}</p>
    </div>
  )
}
