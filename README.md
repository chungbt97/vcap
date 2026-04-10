# VCAP — QA/Tester Debug Assistant

A 100% local-processing Chrome Extension (Manifest V3) that helps QA testers record bugs: **tab-specific screen capture** (video only, no audio, max 5 min), DOM event steps (click/input/scroll/navigation), silent API error capture, and one-click export of a `.zip` containing video + Jira-ready Markdown + Postman-ready cURL files.

> **MVP Release Contract:** See [`FEATURE.md`](./FEATURE.md) as the single source of truth for scope decisions.

**Tech Stack:** ReactJS · Vite · Tailwind CSS · Chrome Extension API (MV3) · `jszip` · `floating-ui` / `framer-motion`

---

## Agent Skills

Skills in `.github/skills/` provide AI agents with accurate project context so every prompt produces correct, constraint-aware code.

### `vcap-best-practices`

Core knowledge — always active. Prevents common mistakes around MV3 constraints, local-only processing, and data sanitization.

| Sub-skill | Covers |
|-----------|--------|
| [architecture.md](.github/skills/vcap-best-practices/architecture.md) | MV3 component roles, message passing, permission requirements |
| [security.md](.github/skills/vcap-best-practices/security.md) | `sanitizeData()` rules, banned headers/fields, cURL export safety |
| [data-flow.md](.github/skills/vcap-best-practices/data-flow.md) | Recording pipeline, IndexedDB, CDP network capture, ZIP structure |

### Install

```bash
npx skills add ./.github/skills --skill vcap-best-practices
```

---

## Project Structure

```
vcap/
├── .github/
│   └── skills/
│       └── vcap-best-practices/
│           ├── SKILL.md          ← skill entry point
│           ├── architecture.md
│           ├── security.md
│           └── data-flow.md
├── src/
│   ├── background/               ← Service Worker
│   ├── content/                  ← Content Script + Shadow DOM UI
│   ├── offscreen/                ← MediaRecorder host
│   └── preview/                  ← Review & export dashboard
├── FEATURE.md                    ← MVP release contract (source of truth)
├── PLAN.md                       ← 7-day implementation roadmap
├── plans/                        ← Phase-by-phase release plans
│   ├── plan_p0.md
│   ├── plan_p1.md  ...plan_p5.md
└── README.md
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Chrome Extension                │
│                                                 │
│  ┌──────────────┐     ┌────────────────────┐   │
│  │  Background  │────▶│  Offscreen Doc     │   │
│  │ Service      │     │  (MediaRecorder)   │   │
│  │ Worker       │     └────────────────────┘   │
│  │              │     ┌────────────────────┐   │
│  │  CDP/        │────▶│  Content Script    │   │
│  │  Debugger    │     │  (DOM Events +     │   │
│  │              │     │   Floating UI)     │   │
│  │              │     └────────────────────┘   │
│  │              │     ┌────────────────────┐   │
│  │              │────▶│  Preview Tab       │   │
│  │              │     │  (Review + Export) │   │
│  └──────────────┘     └────────────────────┘   │
└─────────────────────────────────────────────────┘
                  ↓ Export
        bug-report-[timestamp].zip
        ├── bug-record.webm
        ├── jira-ticket.md
        └── postman-curl/
```

## Key Constraints

- **Local-only** — no server calls, no telemetry, no remote storage
- **`chrome.tabCapture`** for screen capture — automatically captures the current tab (no display picker)
- **Video only, no audio** — `{ video: true, audio: false }`
- **Shadow DOM required** for all Content Script UI (CSS isolation)
- **IndexedDB required** for video chunk storage (RAM safety)
- **`sanitizeData()`** must run on all network data **before** storage, display, or export
- `chrome.debugger` permission requires privacy policy justification for Chrome Web Store

---

## MVP Scope (v1.0)

| Feature | In Scope |
|---|---|
| Tab screen capture (video, no audio) | ✅ |
| DOM events: click, input, scroll, navigation | ✅ |
| API error capture (HTTP ≥ 400) via CDP | ✅ |
| Console error capture from page context | ✅ |
| Preview tab with All / DOM / API / Console / Export tabs | ✅ |
| ZIP export: `bug-record.webm` + `jira-ticket.md` + `postman-curl/` | ✅ |
| Security sanitization (auth headers, tokens, passwords) | ✅ |
| **Note feature** | ⏳ UI only — function next release |
| **Audio capture** | ❌ Out of scope |
| **JSON export** | ❌ Out of scope |
| **Generic display picker** | ❌ Replaced by tabCapture |
