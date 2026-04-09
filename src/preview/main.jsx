import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const EMPTY_SESSION = { steps: [], apiErrors: [], consoleErrors: [], date: '' }

function Root() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    chrome.storage.session.get('vcapSession', ({ vcapSession }) => {
      setSession(vcapSession || EMPTY_SESSION)
    })
  }, [])

  if (!session) {
    return <div className="p-6 font-sans text-gray-500">Loading preview…</div>
  }
  return <App session={session} />
}

createRoot(document.getElementById('root')).render(<Root />)
