/**
 * vcap.config.js — Single source of truth for VCAP app branding.
 *
 * [J1] Change any value here to rebrand the extension without hunting
 * through multiple files. Import this anywhere in src/ as:
 *
 *   import config from '../../vcap.config.js'
 */

const config = {
  // ── App Identity ──────────────────────────────────────────────────────────
  /** Short name shown in the header and badge */
  APP_NAME: 'VCAP',
  /** Full title used in manifest and HTML title tags */
  APP_TITLE: 'VCAP — QA Debug Assistant',
  /** Manifest description (keep under 132 chars) */
  APP_DESCRIPTION: 'Record bugs locally: video, DOM steps, API errors → .zip export. 100% local processing.',
  /** Semantic version shown in UI / release notes */
  APP_VERSION: '0.2.0',

  // ── Icons (relative to project root) ─────────────────────────────────────
  ICONS: {
    16:  'icons/icon16.png',
    48:  'icons/icon48.png',
    128: 'icons/icon128.png',
  },

  // ── Export Defaults ───────────────────────────────────────────────────────
  /** Fallback prefix for ZIP filename when no ticket name is set */
  DEFAULT_TICKET_PREFIX: 'vcap',
  /** Name of the markdown report inside the ZIP */
  ZIP_MARKDOWN_NAME: 'jira-ticket.md',
  /** Name of the video file inside the ZIP */
  ZIP_VIDEO_NAME: 'bug-record.webm',

  // ── Recording Defaults ────────────────────────────────────────────────────
  /** Max events stored in state / IDB */
  MAX_ENTRIES: 5000,
  /** Periodic sync interval (ms) — how often content script flushes events to background */
  SYNC_INTERVAL_MS: 5000,
  /** Countdown duration (seconds) before recording starts. User can disable via checkbox. */
  COUNTDOWN_SECONDS: 5,
}

export default config
