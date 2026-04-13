let host = null

export function showBadge() {
  if (host) return

  // ← FB#1: Show tab title alongside REC so the user knows which tab is recording
  const title = document.title ? ` • ${document.title.slice(0, 20)}` : ''

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
        height: 28px;
        padding: 0 12px;
        border-radius: 20px;
        background: #fa520f;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-family: system-ui, sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(250,82,15,.4);
        animation: vcap-pulse 1.4s ease-in-out infinite;
        cursor: default;
        user-select: none;
      }
      @keyframes vcap-pulse {
        0%, 100% { box-shadow: 0 4px 12px rgba(250,82,15,.4); }
        50% { box-shadow: 0 4px 24px rgba(250,82,15,.8); }
      }
    </style>
    <div id="vcap-badge">REC${title}</div>
  `

  document.body.appendChild(host)
}

export function hideBadge() {
  host?.remove()
  host = null
}
