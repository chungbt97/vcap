# VCAP Architecture

## Overview

VCAP is a Manifest V3 extension with five runtime surfaces:

1. Background service worker
2. Content script
3. Offscreen document
4. Popup UI
5. Side panel UI

The design goal is deterministic capture and local export with no server dependency.

## Configuration Engine

### `vcap.config.js`
VCAP utilizes a centralized configuration object located at the root (`vcap.config.js`). It serves as the single source of truth for:
- App identity (titles, versioning, default icons)
- Export fallback nomenclature (`DEFAULT_TICKET_PREFIX`)
- Constants like `MAX_ENTRIES` and syncing intervals
- The default configurable recording countdown time (`COUNTDOWN_SECONDS`)

## Runtime Components

### Background (`src/background/index.js`)

Responsibilities:

- owns session state lifecycle (`idle`, `countdown`, `recording`, `stopping`, `stopped`)
- implements lifecycle recovery preventing service-worker suspension faults during the active countdown sequence
- controls debugger domains (`Network`, `Runtime`)
- handles dynamic `contextMenus` to allow actions like manual screenshots and taking notes while recording 
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

- handles countdown initiation ("Start After Ns") before dispatching actual record tasks
- start/stop recording requests via state-dependent controls
- manual screenshot trigger & quick-access data export functionality
- open side panel
- ticket naming input
- theme toggle and persistence

### Side Panel (`src/panel/*`)

Responsibilities:

- live and post-session review UI
- sophisticated `NetworkPanel` with deep data exploration, including integrated visual separation for GraphQL queries and mutations
- dedicated `ConsolePanel` capturing warning and error telemetry
- selective export features allowing the user to curate what network/console elements appear in the ZIP
- theme toggle and persistence (Mistral-inspired design system overrides)

## Data Flow

### Recording Flow

1. Popup sends `START_RECORDING_REQUEST` (or triggers countdown before dispatching)
2. Background handles countdown state/recovery. Once triggered: Background resets state, attaches debugger, ensures offscreen/content injected
3. Background sends `START_CAPTURE` to offscreen and `START_RECORDING` to content
4. Background manages `contextMenus` visibility for mid-recording workflows
5. Content streams periodic flushes; background appends to session state
6. Popup sends `STOP_RECORDING_REQUEST`
7. Background stops debugger + offscreen, removes context menu items, requests final content flush
8. Offscreen emits `CAPTURE_DONE`
9. Background finalizes `vcapSession`

### Export Flow

1. UI invokes `exportSession(...)` (optionally considering side panel selection data)
2. Exporter reads video chunks and screenshots from IndexedDB
3. Exporter filters data based on selection payloads or exports the entirety of the payload
4. Exporter builds markdown and cURL files
5. Exporter packages ZIP and downloads via `chrome.downloads`

## Storage Model

### `chrome.storage.session`

- `vcapState`: live runtime state
- `vcapSession`: finalized session payload
- selection state for export filters

### `chrome.storage.local`

- `vcapTicketName`: current naming prefix
- `vcapSessions`: recent session history
- `vcapTheme`: persisted preference driving the Mistral UI theme (`light`, `dark`, `system`)
- `vcapCountdown`: persisted user preference on whether to use the pre-recording delay

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

- System embraces a "Mistral-inspired" aesthetic utilizing warm gradients, custom fonts, and refined surface layers
- Tailwind semantic tokens resolve to custom CSS variables located in `index.css`/`popup.css`
- dark defaults at `:root`
- light mode overrides under `html.light`
- UI preferences intelligently synchronized across Popup and Panel layers via `chrome.storage.local`

## Known Operational Constraints

- restricted URLs may block content script injection
- MV3 service-worker lifecycle can race on tab transitions, but VCAP utilizes an initialization recovery strategy (`countdown` tracking) to manage this gracefully
- manual smoke testing remains required even with unit tests
