# VCAP Master Plan and Delivery History

Last updated: 2026-04-12

This document is the single historical and planning source for VCAP. It consolidates the old files from:

- `PLAN.md`
- `FEATURE.md`
- `RELEASE_READINESS_AUDIT.md`
- `SMOKE_TEST_CHECKLIST.md`
- `plans/plan_p0.md` to `plans/plan_p5.md`
- `plans/plan_uat.md`
- `plans/plan_uat_2.md`
- `plans/feedbacks/*.md`
- `plans/uat/*.md`

## 1) Product Intent

VCAP is a Chrome Extension (Manifest V3) for QA/debug reporting with local-only processing.

Primary workflow:

1. Start recording from Popup
2. Capture DOM events, network activity, console errors, and screenshots
3. Review in Side Panel
4. Export ZIP evidence package

Non-goals for MVP:

- audio capture
- cloud sync
- JSON export as first-class output
- generic display picker UX

## 2) Architecture Baseline (Final Direction)

Runtime components:

- Background Service Worker: orchestration, debugger/network capture, state lifecycle
- Content Script: DOM event collection and page-context bridge
- Offscreen Document: MediaRecorder host
- Popup UI: control plane (start/stop/screenshot/export/open panel)
- Side Panel UI: live review and selection/export UI
- Shared Utils: sanitize, markdown, curl, zip, idb

Core constraints:

- local-only data processing
- sanitize before persistence/export
- `tabCapture`-based recording pipeline
- storage-based synchronization (`chrome.storage.session` and `chrome.storage.local`)

## 3) Delivery Timeline

### Phase 0 — Contract Alignment

Problem: project docs conflicted on MVP scope.

Decisions finalized:

- export artifact is ZIP package
- video capture is included, audio is excluded
- Note stays UI-only for MVP
- tab capture strategy is preferred over generic picker

Outcome:

- release scope became explicit and finite

### Phase 1 — Recording Lifecycle Stabilization

Major issues fixed:

- offscreen routing/path alignment
- shared message contract via `src/shared/messages.js`
- handling offscreen lifecycle signals (`CAPTURE_DONE`, `CAPTURE_FAILED`, `CAPTURE_ERROR`)
- preview/panel open sequencing tied to finalized session state

Outcome:

- start/stop flow became operational and deterministic

### Phase 2 — Event Capture and Wiring

Major issues addressed:

- content/background transport wiring for steps and console data
- broader event capture coverage
- timestamp consistency across captured streams
- navigation-related data loss mitigation strategy defined

Outcome:

- user interactions became visible in downstream review/export flow

### Phase 3 — Security and Data Handling

Security hardening:

- sanitization enforced at capture/persistence boundaries
- sensitive headers/tokens/password-like fields redacted
- cURL export remained defense-in-depth sanitized
- privacy policy and permissions posture documented

Outcome:

- reduced leak risk and improved Chrome Web Store readiness

### Phase 4 — Export Reliability and Contract Fit

Export improvements:

- stable ZIP structure and naming
- resilience with/without selected API errors
- session-driven export behavior over mock/development assumptions
- edge-case handling around empty/missing payloads

Outcome:

- export became usable for real QA handoff artifacts

### Phase 5 — Release Gate

Quality gate introduced:

- smoke-test discipline before release
- build/test verification expectations
- store-submission preflight checklist

Outcome:

- repeatable release readiness process established

## 4) UAT and Feedback Cycles

### UAT Round 1 (Popup + Side Panel migration era)

Observed problems included:

- CSP-sensitive console capture behavior
- preview path/runtime loading issues
- missing or inconsistent click/input capture
- inability to start a second recording in some sequences

Enhancement direction introduced:

- remove noisy scroll-heavy UX
- improve selector readability in DOM log
- move from API-errors-only framing to full Network tab with filters
- popup-first flow + side panel as primary workspace

### UAT Round 2 (Stability and UX)

Observed priorities:

- prevent DOM loss across redirects/navigation boundaries
- align export with panel selections
- support repeated export of latest session
- improve console selection/filtering UX
- converge visual system to warm Mistral-inspired design
- centralize branding/config knobs

### Real User Feedback Integration

Delivered/targeted refinements:

- dropdown click value quality improvements
- ignore noisy Next.js RSC/internal requests in Network
- move all/none controls toward select-all checkbox patterns
- active-tab badge readability and console badge visibility
- group DOM steps by URL in UI and markdown
- add dark/light toggles and synchronize theme between popup and panel

## 5) Current Functional Contract

### In scope

- start/stop recording from popup
- side panel as main live review surface
- DOM/network/console capture in session timeline
- screenshot capture and inclusion in export
- ZIP export with markdown and selected cURL outputs
- local-only storage and processing
- theme toggle with popup/panel sync

### Out of scope (current)

- audio capture
- remote storage/sync/telemetry
- full Note authoring workflow beyond placeholder-level MVP intent

## 6) Data and Export Contract (Current)

Expected ZIP contents:

- `bug-record.webm`
- `jira-ticket.md`
- `screenshots/*` when screenshots exist
- `postman-curl/*` for selected requests

Naming conventions:

- zip: `{TicketName}_{YYYY-MM-DD}_{HH-mm-ss}.zip` (fallback prefix: `vcap`)
- screenshot: `shot-{index}_{mm-ss}.png`
- curl: `{mm-ss}_{METHOD}-{api-name}.txt`

## 7) Verification Standard

A release candidate is acceptable only when all pass:

- unit tests
- production build
- manual smoke on recording/capture/export/security behavior

Minimum smoke expectations:

- recording starts/stops cleanly
- captured events appear in panel
- network and console evidence is present and sanitized
- export ZIP is downloadable and structurally correct
- no raw sensitive tokens in persisted/exported artifacts

## 8) Remaining Known Risks

- MV3 runtime race conditions can still appear on unusual pages (restricted URLs, CSP edge cases)
- tab context switches during long sessions can affect capture continuity if browser lifecycle events are extreme
- manual smoke coverage remains essential despite unit-test coverage

## 9) Source-of-Truth Policy Going Forward

To prevent future plan drift:

1. Keep planning/history in this file only
2. Capture new UAT outcomes as append-only dated sections here
3. Keep README and ARCHITECTURE focused on present-state docs, not planning variants
4. Avoid reintroducing parallel plan files for the same phase

## 10) Change Log Snapshot

- 2026-04-10: scope contract and release gating direction established
- 2026-04-11: popup/side-panel migration and UAT bug cycles executed
- 2026-04-12: theme/token architecture stabilized; popup/panel theme sync fixed; documentation consolidated into one master plan/history document
