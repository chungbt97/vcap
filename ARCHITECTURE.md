# VCAP Architecture

## Overview

VCAP is a Manifest V3 extension with five runtime surfaces:

1. Background service worker
2. Content script
3. Offscreen document
4. Popup UI
5. Side panel UI

The design goal is deterministic capture and local export with no server dependency.

## Runtime Components

### Background (`src/background/index.js`)

Responsibilities:

- owns session state lifecycle (`idle`, `recording`, `stopping`, `stopped`)
- controls debugger domains (`Network`, `Runtime`)
- starts/stops offscreen recording
- receives and merges event flushes from content script
- persists synchronized state to `chrome.storage.session`
- stores lightweight session history in `chrome.storage.local`

### Content Script (`src/content/index.js`, `src/content/eventCollector.js`)

Responsibilities:

- attaches event listeners for interaction telemetry
- collects step timeline and fallback console events
- flushes data on stop and before unload
- periodic flush to reduce data loss on navigation transitions

### Offscreen (`src/offscreen/index.js`)

Responsibilities:

- creates MediaRecorder from tab stream
- emits video chunks to IndexedDB
- enforces max recording duration
- sends lifecycle events back to background

### Popup (`src/popup/*`)

Responsibilities:

- start/stop recording requests
- screenshot trigger
- export trigger
- open side panel
- ticket naming input
- theme toggle and sync

### Side Panel (`src/panel/*`)

Responsibilities:

- live and post-session review UI
- filtering/selecting network and console data
- export from reviewed/selected session state
- theme toggle and sync

## Data Flow

### Recording Flow

1. Popup sends `START_RECORDING_REQUEST`
2. Background resets state, attaches debugger, ensures offscreen/content
3. Background sends `START_CAPTURE` to offscreen and `START_RECORDING` to content
4. Content streams periodic flushes; background appends to session state
5. Popup sends `STOP_RECORDING_REQUEST`
6. Background stops debugger + offscreen, requests final content flush
7. Offscreen emits `CAPTURE_DONE`
8. Background finalizes `vcapSession`

### Export Flow

1. UI invokes `exportSession(...)` from renderer context
2. Exporter reads video chunks and screenshots from IndexedDB
3. Exporter builds markdown and cURL files
4. Exporter packages ZIP and downloads via `chrome.downloads`

## Storage Model

### `chrome.storage.session`

- `vcapState`: live runtime state
- `vcapSession`: finalized session payload
- selection state for export filters

### `chrome.storage.local`

- `vcapTicketName`: current naming prefix
- `vcapSessions`: recent session history
- `vcapTheme`: persisted light/dark preference

### IndexedDB (`src/utils/idb.js`)

- `videoChunks` store: MediaRecorder chunks
- `screenshots` store: screenshot blobs and timestamps

## Messaging Contract

All message names are centralized in `src/shared/messages.js`.

Key message groups:

- control (`START_RECORDING_REQUEST`, `STOP_RECORDING_REQUEST`, `QUERY_STATUS`)
- recorder lifecycle (`START_CAPTURE`, `STOP_CAPTURE`, `CAPTURE_DONE`, `CAPTURE_FAILED`, `CAPTURE_ERROR`)
- data flush (`FLUSH_EVENTS`, `DOM_EVENT`, `CONSOLE_ERROR`, `NOTE_ADDED`)

## Security Boundaries

- network payloads are sanitized before persistence/export usage
- sensitive headers/tokens are redacted
- no remote exfiltration pipeline is designed into architecture

## Build and Packaging

- Vite builds multi-entry extension surfaces
- build includes post-check to fail if any `*.test.*` file appears in `dist/`
- extension is loaded unpacked from `dist/` for validation

## Theme Architecture

- Tailwind semantic tokens resolve to CSS variables
- dark defaults at `:root`
- light mode overrides under `html.light`
- popup and panel synchronize preference through `chrome.storage.local` (`vcapTheme`)

## Known Operational Constraints

- restricted URLs may block content script injection
- MV3 service-worker lifecycle can race on tab transitions
- manual smoke testing remains required even with unit tests
