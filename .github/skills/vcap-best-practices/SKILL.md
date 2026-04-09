---
name: vcap-best-practices
description: Core knowledge for the VCAP Chrome Extension — QA/Tester Debug Assistant. Covers MV3 architecture, security constraints, and data flow. Always apply when working on this project.
user-invocable: false
---

# VCAP Best Practices

VCAP is a **100% local-processing** Chrome Extension (Manifest V3) that helps QA testers record bugs: screen video (max 5 min), DOM event steps, API error capture, and exports a `.zip` with video + Jira-ready Markdown + cURL files.

**Tech Stack:** ReactJS, Vite, Tailwind CSS, Chrome Extension API (MV3), `jszip`, `floating-ui` / `framer-motion`.

## Sub-skills

- [Architecture](./architecture.md) — MV3 component roles and message passing
- [Security](./security.md) — Data sanitization rules and banned fields
- [Data Flow](./data-flow.md) — Recording pipeline, IndexedDB, ZIP export
