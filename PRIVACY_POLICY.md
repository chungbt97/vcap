# Privacy Policy — VCAP

Last updated: 2026-04-12

## Summary

VCAP is a local-first Chrome Extension for QA/debug evidence capture. VCAP does not operate a backend service for user-session upload and does not provide cloud-sync storage.

## Data Processing Model

VCAP processes data on the user device to enable recording, review, and export workflows.

Data categories processed during a session may include:

- active-tab video recording data
- DOM interaction events (for reproduction timeline)
- network request/response metadata for debugging
- console error/warning signals
- user-triggered screenshots

## Storage Locations

VCAP uses local browser/device storage only:

- `chrome.storage.session` for runtime session state
- `chrome.storage.local` for user preferences and recent session metadata
- IndexedDB for video chunks and screenshot blobs

Exported ZIP files are downloaded to the user-selected local Downloads location.

## Sensitive Data Handling

VCAP applies sanitization/redaction logic to reduce accidental credential leakage in captured/exported artifacts. This includes header and payload redaction patterns for authentication/token-like fields.

Users remain responsible for reviewing exported files before sharing externally.

## Use of Chrome Permissions

VCAP requests permissions only for extension functionality:

- `tabCapture` and `offscreen` for recording pipeline
- `debugger` for network/runtime diagnostics capture
- `storage` for state and preference persistence
- `downloads` for ZIP export
- `activeTab`/`sidePanel` for UI workflow operations
- host access for target pages under test

VCAP does not use `debugger` to alter or inject arbitrary request behavior.

## Data Sharing

VCAP does not intentionally transmit captured session data to a VCAP-operated remote server as part of normal functionality.

## Data Retention

- session and media data are retained locally per workflow needs
- a new recording lifecycle can clear/replace prior session capture buffers
- exported files persist according to user local file management

## Contact

For privacy questions, use the project repository issue tracker or maintainer contact channel.
