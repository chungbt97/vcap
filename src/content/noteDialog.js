/**
 * noteDialog.js — FB#3: Inline note-taking dialog (Shadow DOM)
 *
 * Bundled into content/index.js by Vite — no separate entry point needed.
 * Uses Shadow DOM so the host page's styles cannot bleed in.
 */

import { MSG } from '../shared/messages.js'

let dialogHost = null
let inertedElements = []

function applyTemporaryInert() {
  inertedElements = []
  const selectors = [
    '[role="presentation"]',
    '[role="dialog"]',
    '.MuiModal-root',
    '.modal.show',
    '[aria-modal="true"]',
  ]
  const candidates = document.querySelectorAll(selectors.join(', '))
  candidates.forEach((el) => {
    if (!el || el === dialogHost || el.contains(dialogHost)) return
    if (el.tagName === 'HTML' || el.tagName === 'BODY') return
    if (!el.hasAttribute('inert')) {
      el.setAttribute('inert', '')
      inertedElements.push(el)
    }
  })
}

function restoreTemporaryInert() {
  inertedElements.forEach((el) => {
    if (el?.isConnected) el.removeAttribute('inert')
  })
  inertedElements = []
}

export function showNoteDialog() {
  // Prevent double-open
  if (dialogHost) return

  dialogHost = document.createElement('div')
  dialogHost.id = 'vcap-note-dialog-host'
  const shadow = dialogHost.attachShadow({ mode: 'closed' })

  shadow.innerHTML = `
    <style>
      :host { all: initial; }

      .vcap-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      }

      .vcap-dialog {
        background: #1f1f1f;
        border: 1px solid #3a3028;
        border-radius: 10px;
        padding: 16px;
        width: 340px;
        max-width: calc(100vw - 32px);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        animation: vcap-slide-up 0.2s ease-out;
      }

      @keyframes vcap-slide-up {
        from { transform: translateY(10px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }

      .vcap-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .vcap-title {
        font-size: 12px;
        font-weight: 700;
        color: #f5f0eb;
        letter-spacing: 0.02em;
      }

      .vcap-close {
        background: none;
        border: none;
        color: #b0a89e;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 4px;
        transition: background 0.15s;
      }
      .vcap-close:hover { background: #3a3028; color: #f5f0eb; }

      .vcap-textarea {
        width: 100%;
        box-sizing: border-box;
        background: #2a2a2a;
        border: 1px solid #3a3028;
        border-radius: 6px;
        color: #f5f0eb;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        line-height: 1.5;
        padding: 8px 10px;
        resize: vertical;
        min-height: 72px;
        outline: none;
        transition: border-color 0.15s;
      }
      .vcap-textarea:focus { border-color: #fa520f; }
      .vcap-textarea::placeholder { color: #6b5f52; }

      .vcap-hint {
        font-size: 9px;
        color: #6b5f52;
        margin-top: 4px;
        margin-bottom: 10px;
      }

      .vcap-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .vcap-btn {
        padding: 5px 14px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        border-radius: 5px;
        border: none;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .vcap-btn:hover { opacity: 0.85; }

      .vcap-btn-cancel {
        background: #3a3028;
        color: #b0a89e;
      }

      .vcap-btn-save {
        background: #fa520f;
        color: #fff;
      }
    </style>

    <div class="vcap-overlay" id="vcap-overlay">
      <div class="vcap-dialog" role="dialog" aria-modal="true" aria-label="Add VCAP Note">
        <div class="vcap-header">
          <span class="vcap-title">📝 Quick Note</span>
          <button class="vcap-close" id="vcap-close-btn" aria-label="Close">✕</button>
        </div>
        <textarea
          class="vcap-textarea"
          id="vcap-textarea"
          placeholder="Describe the bug or observation…"
          rows="3"
        ></textarea>
        <p class="vcap-hint">Enter to save · Shift+Enter for newline · Esc to cancel</p>
        <div class="vcap-actions">
          <button class="vcap-btn vcap-btn-cancel" id="vcap-cancel-btn">Cancel</button>
          <button class="vcap-btn vcap-btn-save" id="vcap-save-btn">Save</button>
        </div>
      </div>
    </div>
  `

  function close() {
    restoreTemporaryInert()
    dialogHost?.remove()
    dialogHost = null
  }

  function save() {
    const textarea = shadow.getElementById('vcap-textarea')
    const text = textarea?.value?.trim()
    if (!text) { close(); return }

    chrome.runtime.sendMessage({
      type: MSG.NOTE_ADDED,
      payload: { text, timestamp: Date.now() },
    }).catch(() => {})

    close()
  }

  // Wire up buttons
  shadow.getElementById('vcap-close-btn').addEventListener('click', close)
  shadow.getElementById('vcap-cancel-btn').addEventListener('click', close)
  shadow.getElementById('vcap-save-btn').addEventListener('click', save)

  // Keyboard shortcuts
  shadow.getElementById('vcap-textarea').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      save()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  })

  // Click on overlay backdrop to dismiss
  shadow.getElementById('vcap-overlay').addEventListener('click', (e) => {
    if (e.target === shadow.getElementById('vcap-overlay')) close()
  })

  document.body.appendChild(dialogHost)
  applyTemporaryInert()

  // Auto-focus textarea after paint
  requestAnimationFrame(() => {
    shadow.getElementById('vcap-textarea')?.focus()
  })
}
