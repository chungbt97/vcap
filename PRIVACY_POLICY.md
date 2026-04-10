# Privacy Policy — VCAP QA Debug Assistant

**Last updated:** 2026-04-10

---

## Overview

VCAP ("the Extension") is a Chrome browser extension designed to help QA testers and developers record and report bugs efficiently. This Privacy Policy explains how the Extension handles data.

---

## Data Collection

**VCAP does not collect, transmit, or store any data on external servers.**

All data processing happens exclusively on your local machine (Local-first architecture).

The Extension captures the following data **locally** during a recording session:

| Data type | Purpose | Storage |
|---|---|---|
| Screen video of the active tab | Bug recording evidence | RAM (IndexedDB), deleted after export or on new session |
| DOM events (click, input, scroll, navigation) | Reproduce bug steps | RAM (chrome.storage.session), deleted after session |
| API requests that return HTTP ≥ 400 | Debug API errors | RAM (chrome.storage.session), deleted after session |
| Console errors from the active page | Debug JS errors | RAM (chrome.storage.session), deleted after session |

---

## Use of `chrome.debugger` Permission

The Extension requests the `chrome.debugger` permission **solely** to observe network requests on the tab being recorded. Specifically:

- It attaches the Chrome DevTools Protocol (CDP) to capture HTTP request/response metadata for failed requests (HTTP status ≥ 400)
- It **does not** modify, block, or redirect any network requests
- It **does not** inject scripts into pages via the debugger
- The debugger is detached immediately when recording stops

---

## Data Sanitization

Before any captured data is stored or exported, the Extension automatically sanitizes sensitive information:

- **HTTP Headers:** `Authorization`, `Cookie`, `Set-Cookie`, `X-API-Key`, `X-Auth-Token`, `X-CSRF-Token`, and related headers are automatically removed
- **Request/Response Bodies:** Fields named `password`, `token`, `secret`, `api_key`, `credit_card`, and similar are replaced with `[REDACTED]`
- **Raw token patterns:** Bearer tokens, JWT tokens, and API keys matching known patterns are automatically redacted

---

## Data Sharing

**VCAP does not share any data with third parties.** There are no:
- Analytics or telemetry services
- Remote servers or databases
- Cloud sync features
- Tracking pixels or beacons

---

## Data Retention

- All captured data exists **only for the duration of a session**
- Data is stored in `chrome.storage.session` which is automatically cleared when the browser session ends or when a new recording starts
- Video chunks stored in IndexedDB are deleted after export or at the start of a new recording
- Exported ZIP files are saved to your local Downloads folder and are under your full control

---

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `activeTab` | Access the currently active tab when recording starts |
| `tabCapture` | Capture the video stream of the active tab (no screen picker shown) |
| `debugger` | Observe network requests to capture API errors |
| `offscreen` | Run MediaRecorder in a hidden document (required by Manifest V3) |
| `storage` | Temporarily store session state across service worker restarts |
| `downloads` | Trigger the ZIP file download after export |
| `notifications` | Show error notifications if recording fails |
| `<all_urls>` | Monitor network requests on any website the tester is using |

---

## Contact

If you have questions about this privacy policy, please open an issue in the project repository.
