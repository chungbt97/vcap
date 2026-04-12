import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MSG } from '../shared/messages.js'
import { exportSession } from '../utils/zipExporter.js'
import config from '../../vcap.config.js'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(startMs) {
  if (!startMs) return '0s'
  const diff = Math.floor((Date.now() - startMs) / 1000)
  const m = Math.floor(diff / 60)
  const s = diff % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatDate(isoString) {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return isoString }
}

// ── Popup ──────────────────────────────────────────────────────────────────

export default function Popup() {
  const [status, setStatus] = useState('idle')   // idle | recording | stopping | stopped
  const [startTime, setStartTime] = useState(null)
  const [screenshotCount, setScreenshotCount] = useState(0)
  const [stepCount, setStepCount] = useState(0)
  const [ticketName, setTicketName] = useState('')
  const [recentSessions, setRecentSessions] = useState([])
  const [camFlash, setCamFlash] = useState(false)
  const [elapsed, setElapsed] = useState('0s')
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [hasData, setHasData] = useState(false)

  const timerRef = useRef(null)

  // ── Tick timer while recording ─────────────────────────────────────────
  useEffect(() => {
    if (status === 'recording' && startTime) {
      timerRef.current = setInterval(() => {
        setElapsed(formatTime(startTime))
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [status, startTime])

  // ── Initial state load ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return

    // Load current recording state
    chrome.runtime.sendMessage({ type: MSG.QUERY_STATUS }, (res) => {
      if (chrome.runtime.lastError) return
      if (res) {
        setStatus(res.status || 'idle')
        setStartTime(res.startTime || null)
        setScreenshotCount(res.screenshotCount || 0)
      }
    })

    // Load ticket name
    chrome.storage.local.get(['vcapTicketName', 'vcapSessions', 'vcapState'], (data) => {
      if (data.vcapTicketName) setTicketName(data.vcapTicketName)
      if (data.vcapSessions) setRecentSessions(data.vcapSessions.slice(0, 5))
    })

    // Load steps count from session state
    chrome.storage.session.get('vcapState', ({ vcapState }) => {
      if (vcapState) {
        setStepCount(vcapState.steps?.length || 0)
        setHasData(
          (vcapState.steps?.length || 0) > 0 ||
          (vcapState.apiRequests?.length || 0) > 0 ||
          (vcapState.screenshotCount || 0) > 0
        )
      }
    })

    // Listen for state changes from background
    const listener = (changes, area) => {
      if (area === 'session' && changes.vcapState) {
        const s = changes.vcapState.newValue
        if (!s) return
        setStatus(s.status || 'idle')
        setStartTime(s.startTime || null)
        setScreenshotCount(s.screenshotCount || 0)
        setStepCount(s.steps?.length || 0)
        setHasData(
          (s.steps?.length || 0) > 0 ||
          (s.apiRequests?.length || 0) > 0 ||
          (s.screenshotCount || 0) > 0
        )
      }
      if (area === 'local' && changes.vcapSessions) {
        setRecentSessions((changes.vcapSessions.newValue || []).slice(0, 5))
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleTicketChange = (e) => {
    const val = e.target.value
    setTicketName(val)
    chrome.storage.local.set({ vcapTicketName: val })
  }

  const handleStartStop = useCallback(async () => {
    if (status === 'idle' || status === 'stopped') {
      // Start
      setStatus('recording')
      chrome.runtime.sendMessage({ type: MSG.START_RECORDING_REQUEST }, (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          setStatus('idle')
        } else {
          // Popup stays open to show live stats
        }
      })
    } else if (status === 'recording') {
      // Stop
      setStatus('stopping')
      chrome.runtime.sendMessage({ type: MSG.STOP_RECORDING_REQUEST }, (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          setStatus('recording')
        }
        // Status will update via storage.onChanged listener
      })
    }
  }, [status])

  const handleScreenshot = useCallback(async () => {
    if (!chrome?.runtime) return
    setCamFlash(true)
    setTimeout(() => setCamFlash(false), 350)
    chrome.runtime.sendMessage({ type: MSG.TAKE_SCREENSHOT }, (res) => {
      if (res?.screenshotCount !== undefined) {
        setScreenshotCount(res.screenshotCount)
      }
    })
  }, [])

  const handleOpenPanel = useCallback(async () => {
    if (!chrome?.windows) return
    chrome.windows.getCurrent((win) => {
      chrome.sidePanel.open({ windowId: win.id })
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (exporting || !hasData) return
    setExporting(true)
    setExportError(null)
    setExportDone(false)
    try {
      const { vcapSession, vcapSelectedRequests, vcapSelectedConsole } = await new Promise((res) =>
        chrome.storage.session.get(['vcapSession', 'vcapSelectedRequests', 'vcapSelectedConsole'], res)
      )
      const { vcapTicketName } = await new Promise((res) =>
        chrome.storage.local.get('vcapTicketName', res)
      )
      const session = vcapSession || {}
      // [H4] Respect the selections made in the Panel — default to errors-only if no selection stored
      const selectedReqs = vcapSelectedRequests
        ? new Set(vcapSelectedRequests)
        : new Set((session.apiRequests || []).filter((r) => !r.status || r.status >= 400).map((r) => r.requestId))
      const selectedCons = vcapSelectedConsole
        ? new Set(vcapSelectedConsole)
        : new Set((session.consoleErrors || []).map((e, i) => e.id ?? i))

      await exportSession({
        steps: session.steps || [],
        apiRequests: (session.apiRequests || []).filter((r) => selectedReqs.has(r.requestId)),
        consoleErrors: (session.consoleErrors || []).filter((e, i) => selectedCons.has(e.id ?? i)),
        notes: session.notes || [],
        date: session.date || new Date().toISOString(),
        ticketName: vcapTicketName || '',
      })
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } catch (err) {
      setExportError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }, [exporting, hasData])

  const isRecording = status === 'recording'
  const isStopping = status === 'stopping'

  return (
    <div className="bg-background text-on-surface font-body flex flex-col" style={{ width: 420, minHeight: 0 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #262626' }}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1", fontSize: 18, color: '#fa520f' }}>bug_report</span>
          <span className="font-headline text-xs font-bold tracking-wider uppercase text-on-surface">{config.APP_NAME} Debugger</span>
        </div>
        {/* Status pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-label font-bold`}
          style={{
            borderRadius: 100,
            background: isRecording ? 'rgba(250,82,15,0.1)' : '#262626',
            color: isRecording ? '#fa520f' : '#ababab',
          }}
        >
          <span
            className={`w-2 h-2 rounded-full ${isRecording ? 'recording-pulse' : ''}`}
            style={{ background: isRecording ? '#fa520f' : '#ffa110' }}
          />
          {isRecording ? 'Recording' : isStopping ? 'Stopping…' : 'Ready'}
        </div>
      </header>

      {/* ── Ticket Info ────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">
          Ticket Info
        </label>
        <input
          type="text"
          value={ticketName}
          onChange={handleTicketChange}
          disabled={isRecording || isStopping}
          placeholder="Enter Ticket ID / Session Name…"
          className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2 font-label text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/60 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        />
      </div>

      {/* ── CTA Row: Start/Stop + Camera ───────────────────────────────── */}
      <div className="px-4 pb-2 flex items-center gap-2">
        {/* Start/Stop button — Mistral warm gradient */}
        <button
          id="popup-start-stop-btn"
          onClick={handleStartStop}
          disabled={isStopping}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 font-label text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderRadius: 4,
            background: isRecording
              ? 'linear-gradient(135deg, #ff8a00, #fa520f)'
              : 'linear-gradient(135deg, #ffd900, #ff8a00, #fa520f)',
            color: '#fff',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
          >
            {isStopping ? 'progress_activity' : isRecording ? 'stop' : 'play_arrow'}
          </span>
          {isStopping ? 'Stopping…' : isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {/* Camera button */}
        <button
          id="popup-screenshot-btn"
          onClick={handleScreenshot}
          title="Take screenshot"
          className={`flex items-center justify-center transition-all active:scale-95 ${camFlash ? 'cam-flash' : ''}`}
          style={{
            width: 52, height: 52, borderRadius: 4,
            background: camFlash ? '#fa520f' : '#262626',
          }}
        >
          <span
            className="material-symbols-outlined transition-colors"
            style={{
              fontSize: 22,
              color: camFlash ? '#fff' : '#ababab',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            photo_camera
          </span>
        </button>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-3 flex items-center gap-3 font-label text-[11px] text-on-surface-variant">
        <span>{stepCount} events</span>
        <span className="opacity-40">•</span>
        <span>{isRecording ? elapsed : '0s'}</span>
        <span className="opacity-40">•</span>
        <span>{screenshotCount} screenshot{screenshotCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="mx-4 border-t border-surface-container-highest" />

      {/* ── Open Full Panel ────────────────────────────────────────────── */}
      <div className="px-4 py-2">
        <button
          id="popup-open-panel-btn"
          onClick={handleOpenPanel}
          className="w-full flex items-center justify-center gap-2 py-2 font-label text-[11px] font-bold text-on-surface-variant transition-all active:scale-95"
          style={{ borderRadius: 4, background: '#262626' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>dock_to_right</span>
          Open Full Panel
        </button>
      </div>

      {/* ── Export Button ──────────────────────────────────────────────── */}
      <div className="px-4 pb-2">
        <button
          id="popup-export-btn"
          onClick={handleExport}
          disabled={!hasData || exporting}
          className="w-full flex items-center justify-between py-2 px-3 font-label text-[11px] font-bold text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          style={{ borderRadius: 4, background: '#262626' }}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1", color: '#ffa110' }}>
              {exporting ? 'progress_activity' : exportDone ? 'check_circle' : 'description'}
            </span>
            <span style={exportDone ? { color: '#22c55e' } : {}}>
              {exporting ? 'Exporting…' : exportDone ? 'Downloaded!' : 'Export Markdown'}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-40">
            <span className="material-symbols-outlined" style={{ fontSize: 10 }}>videocam</span>
            <span className="material-symbols-outlined" style={{ fontSize: 10 }}>image</span>
            <span className="material-symbols-outlined" style={{ fontSize: 10 }}>view_list</span>
            <span className="material-symbols-outlined" style={{ fontSize: 10 }}>terminal</span>
          </div>
        </button>
        {exportError && (
          <p className="mt-1.5 font-label text-[10px] text-error">{exportError}</p>
        )}
      </div>

      {/* ── Recent Sessions ────────────────────────────────────────────── */}
      {recentSessions.length > 0 && (
        <>
          <div className="mx-4 border-t border-surface-container-highest" />
          <div className="px-4 py-2">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
              Recent Sessions
            </p>
            <div className="space-y-1">
              {recentSessions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleOpenPanel()}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-container-high transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 13 }}>folder</span>
                    <span className="font-label text-[10px] text-on-surface truncate">
                      {s.ticketName || 'vcap'}_{s.date ? s.date.slice(0, 10) : ''}
                    </span>
                    <span className="font-label text-[9px] text-on-surface-variant whitespace-nowrap">
                      {s.steps?.length || 0}ev {s.screenshotCount || 0}📷
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant ml-1 flex-shrink-0" style={{ fontSize: 12 }}>open_in_new</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom padding */}
      <div className="h-2" />
    </div>
  )
}
