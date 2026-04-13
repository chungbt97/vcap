# VCAP

VCAP is a Chrome Extension (Manifest V3) for QA and debugging workflows. It records browser evidence locally, helps reviewers inspect session data in a side panel, and exports a shareable ZIP report.

## What It Does

- records active-tab video (up to 5 minutes)
- captures DOM interaction timeline
- captures network request timeline for API debugging
- captures console errors/warnings
- supports screenshots during a session
- exports a ZIP package with markdown report and selected cURL files

## Getting Started

For detailed instructions on how to install (import) and use the extension, please refer to:
- [English User Guide](docs/USAGE.md)
- [Hướng dẫn sử dụng (Vietnamese)](docs/USAGE_VN.md)

## Core Principles

- local-only processing (no backend upload pipeline)
- sanitization-first data handling
- side-panel-first review experience
- popup and panel state synchronization via Chrome storage

## Export Output

Typical ZIP content:

- `bug-record.webm`
- `jira-ticket.md`
- `screenshots/*` (when screenshots exist)
- `postman-curl/*` (for selected requests)

ZIP filename format:

- `{TicketName}_{YYYY-MM-DD}_{HH-mm-ss}.zip`
- fallback: `vcap_{YYYY-MM-DD}_{HH-mm-ss}.zip`

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS
- Manifest V3 APIs (`debugger`, `offscreen`, `tabCapture`, `sidePanel`, `storage`)
- `fflate` for ZIP generation

## Project Structure

- `src/background/` service worker orchestration
- `src/content/` DOM/page instrumentation
- `src/offscreen/` media recording host
- `src/popup/` popup control UI
- `src/panel/` side-panel review UI
- `src/utils/` shared builders/sanitizers/storage helpers
- `plans/VCAP_MASTER_PLAN_AND_HISTORY.md` consolidated planning and delivery history
- `ARCHITECTURE.md` system architecture and data flows

## Development

- install: `npm install`
- run preview dev app: `npm run dev`
- tests: `npm test`
- production build: `npm run build`

## Build Gate: No Test Artifacts in Dist

`npm run build` includes a post-build verification step that fails if any `*.test.*` file appears in `dist/`.

## Documentation

- [User Guide (English)](docs/USAGE.md)
- [Hướng dẫn sử dụng (Vietnamese)](docs/USAGE_VN.md)

- `ARCHITECTURE.md` for full technical architecture
- `PRIVACY_POLICY.md` for privacy and permission policy
- `plans/VCAP_MASTER_PLAN_AND_HISTORY.md` for complete plan and execution history
