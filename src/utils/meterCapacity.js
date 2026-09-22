// src/utils/meterCapacity.js
// How many meters an installer still needs for the jobs they hold, and
// whether a new meter dispatch fits inside that.
//
// The API has no "required meter quantity" field: an installation request is
// one customer account, installed with exactly one meter (POST
// /installations/{id}/report takes a single meterNumber). So, per installer
// and disco:
//   required  = open jobs assigned to them (ASSIGNED or IN_PROGRESS — the
//               same definition as isOpenJob)
//   assigned  = meters currently in their hands (assignmentStatus ASSIGNED;
//               USED meters are already installed and don't count)
//   remaining = required − assigned, never below zero
// A dispatch may be smaller than `remaining` (partial dispatch is fine) but
// never larger. Serials the installer already holds are not new meters, so
// they are excluded from the count instead of being counted twice.
//
// Phase matters at report time (a three-phase meter can't be reported on a
// single-phase job), so the same figures are also broken down by phase.
import { isOpenJob, METER_ASSIGNMENT_STATUS } from './installationStatus';
import { normalizePhase } from './installationScope';
import { normalizeStatus } from './statusBadge';

const UNSPECIFIED = 'UNSPECIFIED';

/**
 * @param {{ openJobs?: object[], heldMeters?: object[] }} input
 *   openJobs: InstallationRequest records assigned to the installer.
 *   heldMeters: meter items from their dispatch batches.
 */
export function computeMeterCapacity({ openJobs = [], heldMeters = [] } = {}) {
  const jobs = openJobs.filter((j) => isOpenJob(j?.status));
  const meters = heldMeters.filter(
    (m) => normalizeStatus(m?.assignmentStatus) === METER_ASSIGNMENT_STATUS.ASSIGNED
  );

  const byPhase = {};
  const bucket = (phase) => {
    const key = normalizePhase(phase) || UNSPECIFIED;
    if (!byPhase[key]) byPhase[key] = { required: 0, assigned: 0, remaining: 0 };
    return byPhase[key];
  };
  jobs.forEach((j) => { bucket(j.meterType).required += 1; });
  meters.forEach((m) => { bucket(m.phaseType).assigned += 1; });
  Object.values(byPhase).forEach((b) => { b.remaining = Math.max(b.required - b.assigned, 0); });

  const required = jobs.length;
  const assigned = meters.length;
  return {
    required,
    assigned,
    remaining: Math.max(required - assigned, 0),
    surplus: Math.max(assigned - required, 0),
    byPhase,
    heldSerials: meters.map((m) => String(m.meterNumber ?? '')).filter(Boolean),
  };
}

/**
 * Check a proposed dispatch against the capacity.
 * @param {ReturnType<typeof computeMeterCapacity>} capacity
 * @param {string[]} serials - de-duplicated serials being dispatched
 * @returns {{ requested: number, alreadyHeld: string[], remainingAfter: number,
 *   allowed: boolean, message: string|null }}
 */
export function evaluateMeterDispatch(capacity, serials = []) {
  const held = new Set(capacity?.heldSerials || []);
  const alreadyHeld = serials.filter((s) => held.has(s));
  const requested = serials.length - alreadyHeld.length;
  const remaining = capacity?.remaining ?? 0;
  const allowed = requested <= remaining;

  // Short, user-facing. The figures behind it are on screen in
  // MeterCapacitySummary, so the message doesn't repeat them.
  let message = null;
  if (!allowed) {
    message = remaining === 0
      ? "This installer doesn't need more meters."
      : `Assignment exceeds the available meter quantity. Only ${remaining} more needed.`;
  }

  return { requested, alreadyHeld, remainingAfter: remaining - requested, allowed, message };
}
