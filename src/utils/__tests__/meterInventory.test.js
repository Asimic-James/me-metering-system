import { describe, it, expect } from 'vitest';
import { isAssignableMeter, toMeterOptions, matchPastedSerials, meterSerial } from '../meterInventory';

describe('isAssignableMeter', () => {
  it.each([
    [{ meterNumber: '0239110006909', status: 'AVAILABLE' }, true],
    [{ meterNumber: '0239110006909', status: 'available', assignmentStatus: 'UNASSIGNED' }, true],
    [{ meterNumber: '0239110006909', status: 'AVAILABLE', assignmentStatus: 'RETURNED' }, true],
    [{ meterNumber: '0239110006909', status: 'AVAILABLE', assignmentStatus: 'ASSIGNED' }, false],
    [{ meterNumber: '0239110006909', status: 'AVAILABLE', assignmentStatus: 'USED' }, false],
    [{ meterNumber: '0239110006909', status: 'AVAILABLE', assignmentStatus: 'LOST' }, false],
    [{ meterNumber: '0239110006909', status: 'INSTALLED' }, false],
    [{ meterNumber: '0239110006909', status: 'FAULTY' }, false],
    [{ meterNumber: '', status: 'AVAILABLE' }, false],
  ])('%j → %s', (meter, expected) => {
    expect(isAssignableMeter(meter)).toBe(expected);
  });
});

describe('toMeterOptions', () => {
  it('keeps serials as strings, de-duplicates, excludes and sorts', () => {
    const options = toMeterOptions([
      { meterNumber: '0239110006912', status: 'AVAILABLE', phaseType: 'THREE_PHASE' },
      { meterNumber: '0239110006909 ', status: 'AVAILABLE', phaseType: 'single phase', simNumber: '8923401000012345678' },
      { meterNumber: '0239110006909', status: 'AVAILABLE' },
      { meterNumber: '0239110006915', status: 'AVAILABLE' },
    ], new Set(['0239110006915']));
    expect(options).toEqual([
      { serial: '0239110006909', phaseType: 'SINGLE PHASE', simNumber: '8923401000012345678', meterMake: '' },
      { serial: '0239110006912', phaseType: 'THREE PHASE', simNumber: '', meterMake: '' },
    ]);
  });

  it('never loses a leading zero', () => {
    expect(meterSerial({ meterNumber: '0000000000001' })).toBe('0000000000001');
  });
});

describe('matchPastedSerials', () => {
  it('accepts only eligible serials', () => {
    const options = [{ serial: '0239110006909' }, { serial: '0239110006912' }];
    expect(matchPastedSerials(options, '0239110006909, 123\n0239110006912 0239110006909')).toEqual({
      accepted: ['0239110006909', '0239110006912'],
      rejected: ['123'],
    });
  });
});
