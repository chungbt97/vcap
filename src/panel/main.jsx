import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './panel.css'

const EMPTY_SESSION = { steps: [], apiRequests: [], consoleErrors: [], notes: [], date: '' }

function Root() {
  const [session, setSession] = useState(null)
  const [vcapState, setVcapState] = useState(null)
  const [ticketName, setTicketName] = useState('')
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      setSession(EMPTY_SESSION)
      return
    }

    // Load initial data
    chrome.storage.session.get(['vcapSession', 'vcapState'], (data) => {
      setSession(data.vcapSession || EMPTY_SESSION)
      setVcapState(data.vcapState || null)
    })
    chrome.storage.local.get('vcapTicketName', (data) => {
      setTicketName(data.vcapTicketName || '')
    })

    // Listen for live updates
    const listener = (changes, area) => {
      if (area === 'session') {
        if (changes.vcapSession) {
          setSession(changes.vcapSession.newValue || EMPTY_SESSION)
        }
        if (changes.vcapState) {
          setVcapState(changes.vcapState.newValue || null)
        }
      }
      if (area === 'local') {
        if (changes.vcapTicketName) {
          setTicketName(changes.vcapTicketName.newValue || '')
        }
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-3 text-on-surface-variant font-label text-sm">
          <span className="material-symbols-outlined text-primary" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <App
      session={session}
      vcapState={vcapState}
      ticketName={ticketName}
      loadError={loadError}
    />
  )
}

createRoot(document.getElementById('root')).render(<Root />)
