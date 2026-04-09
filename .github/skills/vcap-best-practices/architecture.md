# VCAP Architecture (MV3)

VCAP uses four distinct components. **Never mix their responsibilities.**

## Components

### Background (Service Worker) — `background.js`
- Single source of truth for recording state (`idle | recording | stopped`)
- Owns `chrome.debugger.attach()` / `chrome.debugger.detach()` lifecycle
- Handles icon click to toggle Start/Stop
- Coordinates messages between all other components
- **Cannot** access DOM, BOM, or run `MediaRecorder`

### Content Script — `content.js`
- Injected into the active tab
- Listens for `click`, `input`, `navigation` events — stores `{ event, timestamp }` array
- Renders the Floating Button UI using **Shadow DOM** (mandatory — prevents CSS conflicts with host page)
- Sends collected steps to Background via `chrome.runtime.sendMessage`

### Offscreen Document — `offscreen.html` + `offscreen.js`
- The **only** place `MediaRecorder` runs (MV3 Service Workers have no DOM/BOM access)
- Receives start/stop commands from Background via `chrome.runtime.sendMessage`
- Streams video chunks as Blobs → writes to **IndexedDB** (never hold large Blobs in memory)
- Captures tab via `chrome.tabCapture` or `mediaDevices.getDisplayMedia`

### Preview Tab — `preview.html`
- Opens in a new tab when recording stops
- Left panel: rendered Markdown (steps + notes + console logs)
- Right panel: checklist of captured API errors — tester selects which to include in export
- Triggers the ZIP export pipeline on confirm

## Message Passing Rules

```
Background  ←→  Content Script   (chrome.runtime.sendMessage)
Background  ←→  Offscreen        (chrome.runtime.sendMessage)
Background  ←→  Preview Tab      (chrome.tabs.sendMessage)
```

- Always use **structured clone**-safe objects (no class instances, no functions)
- Always include a `type` field: `{ type: 'START_RECORDING' | 'STOP_RECORDING' | ... }`

## Manifest V3 Permissions Required

```json
"permissions": ["activeTab", "storage", "downloads", "debugger", "offscreen"]
```

## Key Constraint

> 100% Local Processing — no data leaves the user's machine. No server calls, no telemetry, no remote storage. This is both a security requirement and a Chrome Web Store policy requirement.
