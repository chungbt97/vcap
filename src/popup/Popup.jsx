import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MSG } from '../shared/messages.js'
import { exportSession } from '../utils/zipExporter.js'
import config from '../../vcap.config.js'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(startMs) {
  if (!startMs) return '00:00'
  const diff = Math.floor((Date.now() - startMs) / 1000)
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
  const [status, setStatus] = useState('idle')   // idle | countdown | recording | stopping | stopped
  const [startTime, setStartTime] = useState(null)
  const [screenshotCount, setScreenshotCount] = useState(0)
  const [stepCount, setStepCount] = useState(0)
  const [ticketName, setTicketName] = useState('')
  const [recentSessions, setRecentSessions] = useState([])
  const [camFlash, setCamFlash] = useState(false)
  const [elapsed, setElapsed] = useState('00:00')
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [hasData, setHasData] = useState(false)
  const [isDark, setIsDark] = useState(true)  // default dark

  // ← FB#1: Track tab title and IDs for multi-tab awareness
  const [tabTitle, setTabTitle] = useState(null)
  const [recordingTabId, setRecordingTabId] = useState(null)
  const [currentTabId, setCurrentTabId] = useState(null)

  // ← FB#4: Countdown display (when popup is opened during a countdown)
  const [localCountdown, setLocalCountdown] = useState(null)

  const timerRef = useRef(null)

  // Apply theme class to <html> (called on load and on toggle)
  const applyTheme = useCallback((dark) => {
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('light', !dark)
  }, [])

  const toggleTheme = useCallback(() => {
    const next = !isDark
    applyTheme(next)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ vcapTheme: next ? 'dark' : 'light' })
    }
  }, [isDark, applyTheme])

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

  // ← FB#4: Tick down localCountdown when popup is open during countdown
  useEffect(() => {
    if (localCountdown === null || localCountdown <= 0) return
    const t = setTimeout(() => setLocalCountdown((v) => Math.max(0, v - 1)), 1000)
    return () => clearTimeout(t)
  }, [localCountdown])

  // ── Initial state load ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return

    // ← FB#1: Get current tab ID to detect multi-tab recording
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) setCurrentTabId(tabs[0].id)
    })

    // Load current recording state
    chrome.runtime.sendMessage({ type: MSG.QUERY_STATUS }, (res) => {
      if (chrome.runtime.lastError) return
      if (res) {
        setStatus(res.status || 'idle')
        setStartTime(res.startTime || null)
        setScreenshotCount(res.screenshotCount || 0)
        setTabTitle(res.tabTitle || null)          // ← FB#1
        setRecordingTabId(res.tabId || null)       // ← FB#1
        // ← FB#4: If already in countdown, compute remaining to display
        if (res.status === 'countdown' && res.countdownTarget) {
          const remaining = Math.max(0, Math.ceil((res.countdownTarget - Date.now()) / 1000))
          setLocalCountdown(remaining)
        }
      }
    })

    // Load ticket name + saved theme
    chrome.storage.local.get(['vcapTicketName', 'vcapSessions', 'vcapTheme'], (data) => {
      if (data.vcapTicketName) setTicketName(data.vcapTicketName)
      if (data.vcapSessions) setRecentSessions(data.vcapSessions.slice(0, 5))
      // Apply saved theme (defaults to dark if not set)
      applyTheme(data.vcapTheme !== 'light')
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
        setTabTitle(s.tabTitle || null)           // ← FB#1
        setRecordingTabId(s.tabId || null)        // ← FB#1
        setHasData(
          (s.steps?.length || 0) > 0 ||
          (s.apiRequests?.length || 0) > 0 ||
          (s.screenshotCount || 0) > 0
        )
        // ← FB#4: Sync countdown if status transitions to/from countdown
        if (s.status === 'countdown' && s.countdownTarget) {
          const remaining = Math.max(0, Math.ceil((s.countdownTarget - Date.now()) / 1000))
          setLocalCountdown(remaining)
        } else {
          setLocalCountdown(null)
        }
      }
      if (area === 'local' && changes.vcapSessions) {
        setRecentSessions((changes.vcapSessions.newValue || []).slice(0, 5))
      }
      // Sync theme if changed from the panel
      if (area === 'local' && changes.vcapTheme) {
        applyTheme(changes.vcapTheme.newValue !== 'light')
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [applyTheme])

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleTicketChange = (e) => {
    const val = e.target.value
    setTicketName(val)
    chrome.storage.local.set({ vcapTicketName: val })
  }

  const handleCancelCountdown = useCallback(() => {
    setLocalCountdown(null)
    chrome.runtime.sendMessage({ type: MSG.CANCEL_COUNTDOWN })
  }, [])

  const handleStartStop = useCallback(async () => {
    if (status === 'idle' || status === 'stopped') {
      // ← FB#4: Send countdown to background then immediately close popup
      chrome.runtime.sendMessage({ type: MSG.START_COUNTDOWN, totalSeconds: 5 })
      window.close()
    } else if (status === 'recording') {
      // Stop
      setStatus('stopping')
      chrome.runtime.sendMessage({ type: MSG.STOP_RECORDING_REQUEST }, (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          setStatus('recording')
        }
        // Status will update via storage.onChanged listener
      })
    } else if (status === 'countdown') {
      handleCancelCountdown()
    }
  }, [status, handleCancelCountdown])

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
  const isCountdown = status === 'countdown'

  // ← FB#1: Is the popup open on a different tab than the one being recorded?
  const isOnDifferentTab = isRecording && currentTabId != null && recordingTabId != null && currentTabId !== recordingTabId

  return (
    <div className="bg-background text-on-surface font-body flex flex-col w-[420px] min-h-0 relative">

      {/* ← FB#4: Countdown overlay — shown when popup is reopened during countdown */}
      {(isCountdown && localCountdown !== null) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm z-50 gap-3">
          <span
            key={localCountdown}
            className="text-[72px] font-headline font-black text-primary drop-shadow-lg animate-countdown"
          >
            {localCountdown}
          </span>
          <p className="font-label text-[11px] text-on-surface-variant uppercase tracking-widest">
            Recording starts in…
          </p>
          <button
            onClick={handleCancelCountdown}
            className="mt-2 px-4 py-1.5 font-label text-[10px] font-bold text-on-surface-variant bg-surface-container-high rounded hover:bg-error/10 hover:text-error transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[18px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bug_report
          </span>
          <span className="font-headline text-[11px] font-bold tracking-tighter uppercase text-on-surface">{config.APP_NAME} Debugger</span>
        </div>
        {/* Status pill + theme toggle */}
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-label font-bold rounded-full ${
            isRecording ? 'bg-primary/10 text-primary' : isCountdown ? 'bg-[#ffa110]/10 text-[#ffa110]' : 'bg-surface-container text-on-surface-variant'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-primary recording-pulse' : isCountdown ? 'bg-[#ffa110]' : 'bg-primary-fixed'}`} />
            {isRecording ? 'Recording' : isStopping ? 'Stopping…' : isCountdown ? 'Starting…' : 'Ready'}
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-6 h-6 text-on-surface-variant transition-all active:scale-95 hover:bg-surface-container-highest rounded"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* ← FB#1: Multi-tab warning */}
      {isOnDifferentTab && (
        <div className="mx-4 mt-2 px-3 py-1.5 bg-surface-container-high border border-outline-variant rounded flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[11px] text-on-surface-variant">info</span>
          <p className="font-label text-[9px] text-on-surface-variant truncate">
            Recording on another tab{tabTitle ? `: ${tabTitle}` : ''}
          </p>
        </div>
      )}

      {/* ← FB#1: Recording tab name when on the correct tab */}
      {isRecording && !isOnDifferentTab && tabTitle && (
        <div className="mx-4 mt-2 px-3 py-1 bg-primary/5 rounded">
          <p className="font-label text-[9px] text-on-surface-variant truncate">
            <span className="text-primary font-bold">Recording:</span> {tabTitle}
          </p>
        </div>
      )}

      {/* ── Ticket Info ────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5 block">
          Ticket Info
        </label>
        <input
          type="text"
          value={ticketName}
          onChange={handleTicketChange}
          disabled={isRecording || isStopping || isCountdown}
          placeholder="Enter Ticket ID / Session Name…"
          className="w-full bg-surface-container border border-outline-variant rounded px-3 py-2 font-label text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary/60 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        />
      </div>

      {/* ── CTA Row: Start/Stop + Camera ───────────────────────────────── */}
      <div className="px-4 pb-2 flex items-center gap-2">
        {/* Start/Stop/Cancel button */}
        <button
          id="popup-start-stop-btn"
          onClick={handleStartStop}
          disabled={isStopping}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-label text-[11px] font-bold uppercase tracking-wider rounded text-on-primary transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? 'bg-gradient-to-br from-primary-fixed-dim to-primary'
              : isCountdown
              ? 'bg-[#ffa110]'
              : 'bg-gradient-to-br from-[#ffd900] via-primary-fixed-dim to-primary'
          }`}
        >
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isStopping ? 'progress_activity' : isRecording ? 'stop' : isCountdown ? 'cancel' : 'play_arrow'}
          </span>
          {isStopping ? 'Stopping…' : isRecording ? 'Stop Recording' : isCountdown ? 'Cancel Countdown' : 'Start Recording'}
        </button>

        {/* Camera button */}
        <button
          id="popup-screenshot-btn"
          onClick={handleScreenshot}
          title="Take screenshot"
          className={`w-[52px] h-[52px] rounded flex items-center justify-center transition-all active:scale-95 ${
            camFlash ? 'bg-primary cam-flash' : 'bg-surface-container-high'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[22px] transition-colors ${camFlash ? 'text-on-primary' : 'text-on-surface-variant'}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            photo_camera
          </span>
        </button>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-3 flex items-center gap-3 font-label text-[11px] text-on-surface-variant">
        <span>{stepCount} events</span>
        <span className="opacity-40">•</span>
        <span>{isRecording ? elapsed : '00:00'}</span>
        <span className="opacity-40">•</span>
        <span>{screenshotCount} screenshot{screenshotCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="mx-4 border-t border-outline-variant" />

      {/* ── Open Full Panel ────────────────────────────────────────────── */}
      <div className="px-4 py-2">
        <button
          id="popup-open-panel-btn"
          onClick={handleOpenPanel}
          className="w-full flex items-center justify-center gap-2 py-2 font-label text-[11px] font-bold text-on-surface-variant bg-surface-container-high rounded transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[15px]">dock_to_right</span>
          Open Full Panel
        </button>
      </div>

      {/* ── Export Button ──────────────────────────────────────────────── */}
      <div className="px-4 pb-2">
        <button
          id="popup-export-btn"
          onClick={handleExport}
          disabled={!hasData || exporting}
          className="w-full flex items-center justify-between py-2 px-3 font-label text-[11px] font-bold text-on-surface bg-surface-container-high rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[15px] text-primary-fixed"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {exporting ? 'progress_activity' : exportDone ? 'check_circle' : 'description'}
            </span>
            <span className={exportDone ? 'text-[#22c55e]' : ''}>
              {exporting ? 'Exporting…' : exportDone ? 'Downloaded!' : 'Export Markdown'}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-40">
            <span className="material-symbols-outlined text-[10px]">videocam</span>
            <span className="material-symbols-outlined text-[10px]">image</span>
            <span className="material-symbols-outlined text-[10px]">view_list</span>
            <span className="material-symbols-outlined text-[10px]">terminal</span>
          </div>
        </button>
        {exportError && (
          <p className="mt-1.5 font-label text-[10px] text-error">{exportError}</p>
        )}
      </div>

      {/* ── Recent Sessions ────────────────────────────────────────────── */}
      {recentSessions.length > 0 && (
        <>
          <div className="mx-4 border-t border-outline-variant" />
          <div className="px-4 py-2">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
              Recent Sessions
            </p>
            <div className="space-y-1">
              {recentSessions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleOpenPanel()}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-surface-container-high transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[13px]">folder</span>
                    <span className="font-label text-[10px] text-on-surface truncate">
                      {s.ticketName || 'vcap'}_{s.date ? s.date.slice(0, 10) : ''}
                    </span>
                    <span className="font-label text-[9px] text-on-surface-variant whitespace-nowrap">
                      {s.steps?.length || 0}ev {s.screenshotCount || 0}
                      <span className="material-symbols-outlined text-[9px] align-middle">photo_camera</span>
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant ml-1 flex-shrink-0 text-[12px]">open_in_new</span>
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
