/**
 * VCAP — Shared Message Constants
 *
 * Single source of truth for all chrome.runtime.sendMessage / chrome.tabs.sendMessage
 * message type strings used across Background, Content, Offscreen, and Preview.
 *
 * RULE: Never use raw string literals for message types anywhere in the codebase.
 *       Always import MSG from this file.
 */

export const MSG = {
  // ── Background → Content Script ──────────────────────────────────────────
  /** Tell Content Script to start collecting DOM events */
  START_RECORDING: 'START_RECORDING',
  /** Tell Content Script to stop collecting, flush data */
  STOP_RECORDING: 'STOP_RECORDING',

  // ── Background → Offscreen ────────────────────────────────────────────────
  /** Tell Offscreen to start MediaRecorder (payload: { tabId }) */
  START_CAPTURE: 'START_CAPTURE',
  /** Tell Offscreen to stop MediaRecorder */
  STOP_CAPTURE: 'STOP_CAPTURE',

  // ── Offscreen → Background ────────────────────────────────────────────────
  /** MediaRecorder stopped cleanly, all chunks saved to IDB */
  CAPTURE_DONE: 'CAPTURE_DONE',
  /** getDisplayMedia / tabCapture was rejected or denied by user */
  CAPTURE_FAILED: 'CAPTURE_FAILED',
  /** IDB quota exceeded or appendChunk error during recording */
  CAPTURE_ERROR: 'CAPTURE_ERROR',

  // ── Content Script → Background ───────────────────────────────────────────
  /** Batch of DOM events flushed on stop (payload: { steps, consoleErrors }) */
  DOM_EVENT_BATCH: 'DOM_EVENT_BATCH',
  /** Single DOM event streamed in real-time (payload: event object) */
  DOM_EVENT: 'DOM_EVENT',
  /** Single console error captured from page context */
  CONSOLE_ERROR: 'CONSOLE_ERROR',
  /** User added a note (payload: { text, timestamp }) */
  NOTE_ADDED: 'NOTE_ADDED',

  // ── Preview Tab → Background ──────────────────────────────────────────────
  /** Preview requests a brand-new recording session */
  NEW_RECORDING: 'NEW_RECORDING',
}
