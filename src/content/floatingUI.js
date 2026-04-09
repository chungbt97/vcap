let host = null

export function showBadge() {
  if (host) return

  host = document.createElement('div')
  host.id = 'vcap-host'
  const shadow = host.attachShadow({ mode: 'closed' })

  shadow.innerHTML = `
    <style>
      #vcap-badge {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-family: system-ui, sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        box-shadow: 0 4px 12px rgba(239,68,68,.4);
        animation: vcap-pulse 1.4s ease-in-out infinite;
      }
      @keyframes vcap-pulse {
        0%, 100% { box-shadow: 0 4px 12px rgba(239,68,68,.4); }
        50% { box-shadow: 0 4px 24px rgba(239,68,68,.8); }
      }
    </style>
    <div id="vcap-badge">REC</div>
  `

  document.body.appendChild(host)
}

export function hideBadge() {
  host?.remove()
  host = null
}
