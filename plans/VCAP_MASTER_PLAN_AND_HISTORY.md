# VCAP Master Plan and History

Last updated: 2026-04-13

This file consolidates and supersedes:

- `implementation_plan.md` (FB#1-#4)
- `implementation_plan_2.md` (FB#5-#7)
- `docs/QA_FEEDBACKS.md` (latest raw QA requests)

## 1) Scope and Intent

VCAP is a Chrome Extension (MV3) for QA evidence capture and export, with local-only processing.

Primary flow:

1. Start from popup
2. Record tab video + DOM steps + network + console + screenshots + notes
3. Review in side panel
4. Export ZIP package for QA handoff

Core constraints:

- No cloud sync / no remote processing
- Sanitize sensitive data before persistence/export
- Stable behavior across MV3 service-worker lifecycle

## 2) QA Feedback Consolidation

### Feedback #1 (from `implementation_plan.md`)

Problem: QA cannot tell which tab is currently being recorded in multi-tab sessions.

Delivered direction:

- Per-tab action badge (`REC`) on the recording tab only
- Persist and surface `tabTitle` in popup
- Warning in popup when opened on a non-recording tab
- Sync tab title on navigation (`tabs.onUpdated`)

Status: Implemented.

### Feedback #2 (from `implementation_plan.md`)

Problem: GraphQL traffic is hard to read because many operations share one endpoint URL.

Delivered direction:

- GraphQL enrichment in background capture pipeline:
  - `isGraphQL`
  - operation name/type
  - query + variables
- Fetch GraphQL response body even when HTTP status is 200 (for `errors[]` cases)
- Network panel filters/pills for REST/GraphQL/query/mutation/error
- Expandable GraphQL row details
- Export markdown split into GraphQL vs REST sections

Status: Implemented.

### Feedback #3 (from `implementation_plan.md`)

Problem: QA needs quick note-taking without opening popup/panel mid-recording.

Delivered direction:

- Dynamic context menu while recording
- Inline note dialog via Shadow DOM in content script
- `NOTE_ADDED` pipeline to background/session storage
- Notes shown in panel timeline (interleaved chronologically)

Status: Implemented.

### Feedback #4 (from `implementation_plan.md`)

Problem: Recording starts immediately; QA needs a short prep countdown.

Delivered direction:

- Configurable countdown before recording starts
- Popup auto-close on start with countdown path
- Countdown badge feedback
- Cancel countdown action
- Service-worker countdown recovery using persisted target timestamp

Status: Implemented.

### Feedback #5 (from `implementation_plan_2.md` and `docs/QA_FEEDBACKS.md`)

Problem: `#` column order in steps is reset and becomes inconsistent.

Root cause identified:

- `getStepsAndClear()` reset `stepIndex` during periodic flush every 5 seconds.

Delivered direction:

- Remove `stepIndex` reset from periodic clear function
- Keep reset only at new session start
- Build markdown row numbering from final ordered array (`rowNum`) as defense-in-depth

Status: Implemented.

### Feedback #6 (from `implementation_plan_2.md` and `docs/QA_FEEDBACKS.md`)

Two requests:

1. Screenshot button behavior by state
   - recording: include screenshot in export ZIP
   - not recording: download screenshot directly to Downloads
2. Context menu quick actions while recording
   - parent menu: `Vcap Flash Action`
   - child items: `Add Note`, `Take a screenshot`

Delivered direction:

- Recording-state branching in screenshot handler
- Flash Action parent + submenu lifecycle bound to recording state
- Popup screenshot request includes tab context

Status: Implemented.

### Feedback #7 (from `implementation_plan_2.md` and `docs/QA_FEEDBACKS.md`)

Problem: Add clear red border indicator on recorded tab.

Delivered direction:

- Red border implemented in content UI lifecycle alongside recording badge

Current status:

- Implemented, but had runtime regression iterations (visibility and browser infobar timing side effects).
- Current implementation uses four fixed border edges in Shadow DOM for better stability than prior full-viewport animated overlay approach.

Status: Implemented with ongoing runtime tuning.

## 3) Delivery History (What Was Actually Done)

### Wave A - FB#1 to FB#4

Implemented areas:

- `src/background/index.js`
  - per-tab recording state visibility
  - tab title tracking
  - countdown start/cancel/recovery pipeline
- `src/popup/Popup.jsx` and `src/popup/popup.css`
  - countdown UX and controls
  - multi-tab awareness UI
- `src/content/index.js`, `src/content/noteDialog.js`, `src/content/floatingUI.js`
  - note dialog flow
  - recording badge UI
- `src/panel/NetworkPanel.jsx`, `src/panel/App.jsx`
  - GraphQL network UX
  - notes in timeline
- `src/utils/zipExporter.js`, `src/utils/markdownBuilder.js`
  - export grouping and markdown structure improvements
- `src/shared/messages.js`
  - message contract expansion

Outcome: Core QA feedback loop for FB#1-#4 completed.

### Wave B - FB#5 to FB#7

Implemented areas:

- `src/content/eventCollector.js`
  - step index reset bug fix
- `src/utils/markdownBuilder.js`
  - stable row numbering in markdown output
- `src/background/index.js`
  - Flash Action context menu
  - recording/non-recording screenshot branch
- `src/popup/Popup.jsx`
  - screenshot call carries tab context
- `src/content/floatingUI.js`
  - red border indicator (iterated implementation)

Outcome: FB#5-#7 implemented; FB#7/browser infobar behavior requires continued runtime verification.

## 4) Current Known Issues and Follow-up

1. Chrome debugger infobar (`"VCAP ... started debugging this browser"`) may dismiss with delay in some runtime scenarios.
2. FB#7 border went through multiple implementations; current version is more stable but should continue cross-site validation.

Recent stabilization work:

- Added safer debugger detach path and detach verification/retry logic.
- Added debugger `onDetach` cleanup handling.
- Removed heavy full-viewport animated overlay approach.

## 5) Config and Constants Hygiene

Observation:

- Some constants in `vcap.config.js` were previously not consumed consistently.

Corrections applied:

- `MAX_ENTRIES` now sourced from config in background.
- `SYNC_INTERVAL_MS` now sourced from config in event collector.
- ZIP naming defaults (`DEFAULT_TICKET_PREFIX`, `ZIP_VIDEO_NAME`) now consumed in exporter.

## 6) Verification Standard

Every change set should pass:

1. `npm run build`
2. Manual smoke for:
   - start/stop lifecycle
   - debugger infobar dismissal timing
   - red border show/hide behavior
   - screenshot behavior in both recording and idle states
   - context menu lifecycle (appears only while recording)
   - export ZIP structure and markdown sections

## 7) Source-of-Truth Policy

Going forward:

1. Keep master planning/history in this file only.
2. Keep `docs/QA_FEEDBACKS.md` as raw incoming feedback list.
3. Avoid creating parallel implementation plan files for the same feedback cycle.
