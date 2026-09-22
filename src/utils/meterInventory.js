// src/utils/meterInventory.js
// Which meters an admin may dispatch to an installer, as picker options.
//
// Eligibility (the app's existing two-axis meter model — see CLAUDE.md):
//   - stock status must be AVAILABLE (INSTALLED/FAULTY/RETIRED are never
//     dispatched). Requested server-side with GET /meters?status=AVAILABLE.
//   - assignmentStatus, when the API includes it, must not be ASSIGNED
//     (already with an installer), USED (installed) or LOST. UNASSIGNED and
//     RETURNED are fine. A meter out with an installer keeps status AVAILABLE,
//     which is why this second check exists.
// Serials are strings end to end — "0239110006909" keeps its leading zero.
import { normalizeStatus } from './statusBadge';

const BLOCKED_ASSIGNMENT = new Set(['ASSIGNED', 'USED', 'LOST']);

/** A meter's serial as a trimmed string ('' when missing). */
export const meterSerial = (meter) => {
  const value = meter?.meterNumber;
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export function isAssignableMeter(meter) {
  if (!meterSerial(meter)) return false;
  if (normalizeStatus(meter.status) !== 'AVAILABLE') return false;
  return !BLOCKED_ASSIGNMENT.has(normalizeStatus(meter.assignmentStatus));
}

/**
 * Eligible, de-duplicated picker options, sorted by serial.
 * @param {object[]} meters - raw meter records
 * @param {Set<string>} [exclude] - serials to leave out (e.g. dispatched this session)
 * @returns {{ serial: string, phaseType: string, simNumber: string, meterMake: string }[]}
 */
export function toMeterOptions(meters = [], exclude = new Set()) {
  const bySerial = new Map();
  meters.forEach((m) => {
    const serial = meterSerial(m);
    if (!isAssignableMeter(m) || exclude.has(serial) || bySerial.has(serial)) return;
    bySerial.set(serial, {
      serial,
      phaseType: normalizeStatus(m.phaseType).replace(/[_-]+/g, ' '),
      simNumber: m.simNumber != null ? String(m.simNumber) : '',
      meterMake: m.meterMake ? String(m.meterMake) : '',
    });
  });
  return Array.from(bySerial.values()).sort((a, b) => a.serial.localeCompare(b.serial));
}

/**
 * Match pasted serials against the eligible options. Only eligible serials
 * are accepted; anything else is reported back, never silently dispatched.
 * @returns {{ accepted: string[], rejected: string[] }}
 */
export function matchPastedSerials(options, raw) {
  const eligible = new Set(options.map((o) => o.serial));
  const pasted = Array.from(new Set(String(raw || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)));
  return {
    accepted: pasted.filter((s) => eligible.has(s)),
    rejected: pasted.filter((s) => !eligible.has(s)),
  };
}
