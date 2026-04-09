# VCAP Data Flow

End-to-end pipeline from recording start to ZIP download.

## Recording Lifecycle

```
User clicks icon
  → Background: set state = 'recording'
  → Background: chrome.debugger.attach(tabId) + Network.enable
  → Background: send START_RECORDING → Offscreen
  → Offscreen: MediaRecorder.start(), stream chunks → IndexedDB
  → Content Script: begin collecting DOM events
```

```
User clicks Stop (or 5-min timeout fires)
  → Background: chrome.debugger.detach(tabId)
  → Background: send STOP_RECORDING → Offscreen
  → Offscreen: MediaRecorder.stop(), finalize IndexedDB writes
  → Background: collect steps + notes + API errors + console logs
  → Background: chrome.tabs.create({ url: 'preview.html' })
  → Preview Tab: render data, await user selection
  → Preview Tab: user clicks Export → ZIP pipeline
```

## Video Recording (Offscreen)

- Use `IndexedDB` for video chunk storage — **never accumulate Blobs in a JS array** (RAM overflow risk on long sessions)
- Store chunks with sequential keys for in-order retrieval
- On stop: read all chunks from IndexedDB → assemble into final Blob → pass to ZIP builder

## 5-Minute Auto-Stop

- Timer starts at `T0` when `MediaRecorder.start()` is called
- Countdown UI: small overlay in Content Script showing `MM:SS`
- At `300_000ms`: trigger the same Stop flow as manual stop
- Timer must be cleared on manual stop to prevent double-trigger

## CDP Network Capture (Background)

Listen for these Chrome DevTools Protocol events:
- `Network.requestWillBeSent` → store `{ requestId, url, method, headers, postData, timestamp }`
- `Network.responseReceived` → update entry with `{ status, responseHeaders }`
- `Network.loadingFinished` → if status `>= 400`: call `Network.getResponseBody({ requestId })` → store body

Map by `requestId` to join request + response data.

## ZIP Export Structure

```
bug-report-[timestamp].zip
├── bug-record.webm          ← video Blob from IndexedDB
├── jira-ticket.md           ← Markdown: steps + notes + console logs
└── postman-curl/
    ├── [HH:MM:SS]_[api-name].txt   ← one file per selected API error
    └── ...
```

## Markdown Format (jira-ticket.md)

```markdown
## Bug Report — [Date] [Time]

### Steps to Reproduce
| # | Time | Action | Note |
|---|------|--------|------|
| 1 | 00:03 | Click [button#submit] | |
| 2 | 00:07 | Input [input#email] | "entered wrong email" |

### API Errors
| Time | Method | URL | Status |
|------|--------|-----|--------|
| 00:07 | POST | /api/login | 401 |

### Console Errors
- `00:09` TypeError: Cannot read property 'id' of undefined
```

Verify Markdown renders correctly in Jira before shipping (tables must use `|` pipe format).
