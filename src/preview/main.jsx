import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

chrome.storage.session.get('vcapSession', ({ vcapSession }) => {
  createRoot(document.getElementById('root')).render(
    <App session={vcapSession || { steps: [], apiErrors: [], consoleErrors: [], date: '' }} />
  )
})
