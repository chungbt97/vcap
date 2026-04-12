import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const EMPTY_SESSION = { steps: [], apiErrors: [], consoleErrors: [], notes: [], date: '' }

// [Phase 4] Mock data ONLY active in local dev (import.meta.env.DEV).
// In production extension builds, this branch is never taken.
const DEV_MOCK_SESSION = import.meta.env.DEV ? {
  date: new Date().toISOString(),
  steps: [
    { index: 1, type: 'click', target: 'button.login-btn', timestamp: '00:03', url: 'http://localhost:3000/login' },
    { index: 2, type: 'input', target: 'input#email', value: 'user@example.com', timestamp: '00:08', url: 'http://localhost:3000/login' },
    { index: 3, type: 'navigate', target: 'pushState', value: '/dashboard', timestamp: '00:15', url: 'http://localhost:3000/dashboard' },
    { index: 4, type: 'click', target: 'button#submit-order', timestamp: '00:42', url: 'http://localhost:3000/dashboard' },
    { index: 5, type: 'scroll', target: 'window', value: 'scrollY: 320px', timestamp: '00:50', url: 'http://localhost:3000/dashboard' },
  ],
  apiErrors: [
    { requestId: 'req-1', method: 'POST', url: 'https://api.example.com/v1/auth/login', status: 500, timestamp: '00:09', requestHeaders: { 'Content-Type': 'application/json' } },
    { requestId: 'req-2', method: 'GET', url: 'https://api.example.com/v1/orders', status: 403, timestamp: '00:44', requestHeaders: { 'Content-Type': 'application/json' } },
  ],
  consoleErrors: [
    { message: 'Uncaught TypeError: Cannot read property "id" of undefined', timestamp: '00:43' },
  ],
  notes: [],
} : null

function Root() {
  const [session, setSession] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    // Dev mode: use mock data
    if (import.meta.env.DEV || typeof chrome === 'undefined' || !chrome.storage) {
      setSession(DEV_MOCK_SESSION || EMPTY_SESSION)
      return
    }

    // Production: load from session storage set by Background after CAPTURE_DONE
    chrome.storage.session.get('vcapSession', ({ vcapSession }) => {
      if (!vcapSession) {
        setLoadError('No session data found. Please record a session first.')
        setSession(EMPTY_SESSION)
        return
      }
      setSession(vcapSession)
    })
  }, [])

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-3 text-on-surface-variant font-label text-sm">
          <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
          Loading preview…
        </div>
      </div>
    )
  }

  return <App session={session} loadError={loadError} />
}

createRoot(document.getElementById('root')).render(<Root />)
