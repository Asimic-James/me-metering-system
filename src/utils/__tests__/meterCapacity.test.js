import { describe, it, expect } from 'vitest';
import { computeMeterCapacity, evaluateMeterDispatch } from '../meterCapacity';

const jobs = (n, meterType = 'SINGLE PHASE', status = 'ASSIGNED') =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, status, meterType }));
const meters = (n, phaseType = 'SINGLE PHASE', assignmentStatus = 'ASSIGNED', offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ meterNumber: String(1000000000000 + offset + i), phaseType, assignmentStatus }));
const serials = (n, offset = 5000) => Array.from({ length: n }, (_, i) => String(2000000000000 + offset + i));

describe('computeMeterCapacity', () => {
  it('counts one required meter per open job and subtracts meters in hand', () => {
    const c = computeMeterCapacity({ openJobs: jobs(10), heldMeters: meters(3) });
    expect(c).toMatchObject({ required: 10, assigned: 3, remaining: 7, surplus: 0 });
  });

  it('only treats ASSIGNED and IN_PROGRESS jobs as needing a meter', () => {
    const open = [...jobs(2), ...jobs(1, 'SINGLE PHASE', 'IN_PROGRESS')];
    const closed = [...jobs(4, 'SINGLE PHASE', 'INSTALLED'), ...jobs(1, 'SINGLE PHASE', 'FAILED'), ...jobs(1, 'SINGLE PHASE', 'PENDING')];
    expect(computeMeterCapacity({ openJobs: [...open, ...closed] }).required).toBe(3);
  });

  it('ignores meters that are already used or returned', () => {
    const held = [...meters(2), ...meters(3, 'SINGLE PHASE', 'USED', 10), ...meters(1, 'SINGLE PHASE', 'RETURNED', 20)];
    expect(computeMeterCapacity({ openJobs: jobs(5), heldMeters: held })).toMatchObject({ assigned: 2, remaining: 3 });
  });

  it('never reports negative remaining and exposes the surplus instead', () => {
    const c = computeMeterCapacity({ openJobs: jobs(2), heldMeters: meters(5) });
    expect(c).toMatchObject({ remaining: 0, surplus: 3 });
  });

  it('breaks the figures down by phase, normalising phase spelling', () => {
    const c = computeMeterCapacity({
      openJobs: [...jobs(3, 'SINGLE PHASE'), ...jobs(2, 'Three Phase')],
      heldMeters: [...meters(1, 'single phase'), ...meters(2, 'THREE_PHASE', 'ASSIGNED', 50)],
    });
    expect(c.byPhase['SINGLE PHASE']).toEqual({ required: 3, assigned: 1, remaining: 2 });
    expect(c.byPhase['THREE PHASE']).toEqual({ required: 2, assigned: 2, remaining: 0 });
  });
});

describe('evaluateMeterDispatch — requirement table (installation requires 10)', () => {
  const capacity = computeMeterCapacity({ openJobs: jobs(10) });

  it.each([
    [0, 10, true],
    [3, 7, true],
    [7, 3, true],
    [10, 0, true],
    [11, -1, false],
  ])('assigning %i leaves %i → allowed=%s', (assign, remaining, allowed) => {
    const result = evaluateMeterDispatch(capacity, serials(assign));
    expect(result.remainingAfter).toBe(remaining);
    expect(result.allowed).toBe(allowed);
    if (!allowed) expect(result.message).toBe('Assignment exceeds the available meter quantity. Only 10 more needed.');
  });
});

describe('evaluateMeterDispatch — existing assignments', () => {
  it('accounts for meters already in hand', () => {
    const capacity = computeMeterCapacity({ openJobs: jobs(10), heldMeters: meters(7) });
    expect(evaluateMeterDispatch(capacity, serials(3)).allowed).toBe(true);
    expect(evaluateMeterDispatch(capacity, serials(4)).allowed).toBe(false);
  });

  it('does not double-count serials the installer already holds', () => {
    const held = meters(7);
    const capacity = computeMeterCapacity({ openJobs: jobs(10), heldMeters: held });
    const resend = [...held.slice(0, 5).map((m) => m.meterNumber), ...serials(3)];
    const result = evaluateMeterDispatch(capacity, resend);
    expect(result.alreadyHeld).toHaveLength(5);
    expect(result.requested).toBe(3);
    expect(result.allowed).toBe(true);
  });

  it('rejects any dispatch when nothing more is needed', () => {
    const capacity = computeMeterCapacity({ openJobs: jobs(2), heldMeters: meters(2) });
    const result = evaluateMeterDispatch(capacity, serials(1));
    expect(result.allowed).toBe(false);
    expect(result.message).toBe("This installer doesn't need more meters.");
  });
});
