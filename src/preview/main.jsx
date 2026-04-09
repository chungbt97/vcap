import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const EMPTY_SESSION = { steps: [], apiErrors: [], consoleErrors: [], date: '' }

function Root() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    // In dev/preview mode outside extension, use mock data
    if (typeof chrome === 'undefined' || !chrome.storage) {
      setSession({
        date: new Date().toISOString(),
        steps: [
          { type: 'click', target: 'button.login-btn', timestamp: '00:03' },
          { type: 'input', target: 'input#email', value: 'user@example.com', timestamp: '00:08' },
          { type: 'click', target: 'a.nav-link[href="/dashboard"]', timestamp: '00:15' },
          { type: 'click', target: 'button#submit-order', timestamp: '00:42' },
        ],
        apiErrors: [
          { requestId: 'req-1', method: 'POST', url: 'https://api.example.com/v1/auth/login', status: 500, timestamp: '00:09' },
          { requestId: 'req-2', method: 'GET', url: 'https://api.example.com/v1/orders', status: 403, timestamp: '00:44' },
        ],
        consoleErrors: [
          { message: 'Uncaught TypeError: Cannot read property "id" of undefined', timestamp: '00:43' },
        ],
      })
      return
    }
    chrome.storage.session.get('vcapSession', ({ vcapSession }) => {
      setSession(vcapSession || EMPTY_SESSION)
    })
  }, [])

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-3 text-on-surface-variant font-label text-sm">
          <span className="material-symbols-outlined text-primary" style={{animation:'spin 1s linear infinite'}}>progress_activity</span>
          Loading preview…
        </div>
      </div>
    )
  }
  return <App session={session} />
}

createRoot(document.getElementById('root')).render(<Root />)
