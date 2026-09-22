// @vitest-environment jsdom
// Meter dispatch: the serial picker and capacity validation, rendered against
// a mocked jedApi (documented shapes for /installations, /assignments,
// /meters, /users, /discos).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { DataRefreshProvider } from '../../contexts/DataRefreshContext';
import AssignmentsPage from '../AssignmentsPage';
import jedApi from '../../services/api';

vi.mock('../../auth/usePermissions', () => ({
  usePermissions: () => ({ canManageAssignments: true, isAdmin: true }),
}));

vi.mock('../../services/api', () => ({
  default: {
    clearCache: vi.fn(),
    getDiscos: vi.fn(),
    getInstallations: vi.fn(),
    getUsers: vi.fn(),
    getMeters: vi.fn(),
    getAssignmentBatches: vi.fn(),
    getAssignmentBatch: vi.fn(),
    assignMeters: vi.fn(),
  },
}));

const page = (data) => ({ success: true, data, pagination: { currentPage: 1, totalPages: 1, totalCount: data.length, hasNext: false } });

// Installer uuid-1 holds 3 open Aba jobs and already has 1 meter in hand.
const OPEN_JOBS = [
  { id: 1, status: 'ASSIGNED', meterType: 'SINGLE PHASE' },
  { id: 2, status: 'ASSIGNED', meterType: 'SINGLE PHASE' },
  { id: 3, status: 'IN_PROGRESS', meterType: 'THREE PHASE' },
];

// GET /meters?status=AVAILABLE. One is already out with an installer
// (assignmentStatus ASSIGNED) and must not be offered; one is a duplicate.
const METERS = [
  { id: 1, meterNumber: '0239110006909', phaseType: 'SINGLE PHASE', status: 'AVAILABLE', assignmentStatus: 'ASSIGNED' },
  { id: 2, meterNumber: '0239110006911', phaseType: 'SINGLE PHASE', status: 'AVAILABLE', assignmentStatus: 'UNASSIGNED', simNumber: '8923401000012345678' },
  { id: 3, meterNumber: '0239110006912', phaseType: 'THREE PHASE', status: 'AVAILABLE' },
  { id: 4, meterNumber: '0239110006913', phaseType: 'SINGLE PHASE', status: 'AVAILABLE', assignmentStatus: 'RETURNED' },
  { id: 5, meterNumber: '0239110006911', phaseType: 'SINGLE PHASE', status: 'AVAILABLE' },
];

beforeEach(() => {
  vi.clearAllMocks();
  jedApi.getDiscos.mockResolvedValue(page([{ code: 'ABA_POWER', name: 'Aba Power' }]));
  jedApi.getUsers.mockResolvedValue(page([{ id: 'uuid-1', firstName: 'Musa', lastName: 'Bello', role: 'INSTALLER' }]));
  jedApi.getMeters.mockResolvedValue(page(METERS));
  jedApi.getInstallations.mockImplementation(async ({ status }) => page(OPEN_JOBS.filter((j) => j.status === status)));
  jedApi.getAssignmentBatches.mockResolvedValue(page([
    { id: 10, status: 'ACTIVE' },
    { id: 11, status: 'CLOSED' },
  ]));
  jedApi.getAssignmentBatch.mockImplementation(async (id) => ({
    success: true,
    data: {
      id,
      items: id === 10
        ? [
          { meterNumber: '0239110006909', phaseType: 'SINGLE PHASE', assignmentStatus: 'ASSIGNED' },
          { meterNumber: '0239110006910', phaseType: 'SINGLE PHASE', assignmentStatus: 'USED' },
        ]
        : [],
    },
  }));
  jedApi.assignMeters.mockResolvedValue({ success: true, data: { assignedCount: 2, rejectedCount: 0, rejected: [] } });
});

afterEach(cleanup);

const renderPage = async () => {
  render(<DataRefreshProvider><AssignmentsPage /></DataRefreshProvider>);
  await waitFor(() => expect(screen.getByRole('option', { name: /Musa Bello/ })).toBeTruthy());
  await waitFor(() => expect(screen.getByLabelText(/^Disco/).value).toBe('ABA_POWER'));
  await screen.findByRole('list', { name: 'Available meters' });
};

const setup = async () => {
  await renderPage();
  fireEvent.change(screen.getByLabelText(/^Installer/), { target: { value: 'uuid-1' } });
  await screen.findByText('Meters required');
};

const meterList = () => screen.getByRole('list', { name: 'Available meters' });
const pickMeter = (serial) => fireEvent.click(within(meterList()).getByText(serial));
const figure = (label) => Number(screen.getByText(label).previousElementSibling.textContent);

describe('AssignmentsPage — meter serial picker', () => {
  it('lists only eligible meters, in full, once each, from GET /meters?status=AVAILABLE', async () => {
    await renderPage();
    expect(jedApi.getMeters).toHaveBeenCalledWith(expect.objectContaining({ status: 'AVAILABLE', page: 1, limit: 100 }));
    const serials = within(meterList()).getAllByRole('checkbox').map((cb) => cb.closest('label').querySelector('.font-mono').textContent);
    expect(serials).toEqual(['0239110006911', '0239110006912', '0239110006913']);
    expect(screen.getByText('Select meter serial number')).toBeTruthy();
    expect(screen.getByText(/SIM 8923401000012345678/)).toBeTruthy();
  });

  it('searches serials and filters by phase', async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText('Search meter serial number'), { target: { value: '6912' } });
    expect(within(meterList()).getAllByRole('checkbox')).toHaveLength(1);
    fireEvent.change(screen.getByPlaceholderText('Search meter serial number'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter meters by phase'), { target: { value: 'SINGLE PHASE' } });
    expect(within(meterList()).getAllByRole('checkbox')).toHaveLength(2);
  });

  it('pasting accepts only eligible serials and reports the rest', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Paste serials/ }));
    fireEvent.change(screen.getByLabelText('Paste meter serial numbers'), {
      target: { value: '0239110006911\n0239110006909 9999999999999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to selection' }));
    expect(screen.getByText(/1 added\./)).toBeTruthy();
    expect(screen.getByText('0239110006909, 9999999999999')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove meter 0239110006911' })).toBeTruthy();
  });

  it('shows an error with retry when meters cannot load', async () => {
    jedApi.getMeters.mockRejectedValueOnce(new Error('SERVER_ERROR:db down'));
    render(<DataRefreshProvider><AssignmentsPage /></DataRefreshProvider>);
    expect(await screen.findByText("Couldn't load available meters.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    await screen.findByRole('list', { name: 'Available meters' });
  });
});

describe('AssignmentsPage — meter capacity', () => {
  it('shows required, assigned and remaining meters from live jobs and open batches', async () => {
    await setup();
    expect(figure('Meters required')).toBe(3);
    expect(figure('Meters assigned')).toBe(1);
    expect(figure('Still needed')).toBe(2);
    expect(jedApi.getAssignmentBatch).toHaveBeenCalledWith(10);
    expect(jedApi.getAssignmentBatch).not.toHaveBeenCalledWith(11);
  });

  it('rejects a dispatch larger than what is still needed, without calling the API', async () => {
    await setup();
    ['0239110006911', '0239110006912', '0239110006913'].forEach(pickMeter);
    expect(screen.getByText(/This dispatch is 1 meter over what is needed/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Dispatch 3 meters/ }));
    expect(await screen.findByText('Assignment exceeds the available meter quantity. Only 2 more needed.')).toBeTruthy();
    expect(jedApi.assignMeters).not.toHaveBeenCalled();
  });

  it('allows a partial or exact dispatch and submits the selected serials as strings', async () => {
    await setup();
    pickMeter('0239110006911');
    pickMeter('0239110006913');
    fireEvent.click(screen.getByRole('button', { name: /Dispatch 2 meters/ }));
    await waitFor(() => expect(jedApi.assignMeters).toHaveBeenCalledWith({
      discoCode: 'ABA_POWER', installerId: 'uuid-1', meterNumbers: ['0239110006911', '0239110006913'],
    }));
    // Dispatched meters leave the picker.
    await waitFor(() => expect(within(meterList()).queryByText('0239110006911')).toBeNull());
  });

  it('fails closed when the capacity cannot be verified', async () => {
    jedApi.getAssignmentBatches.mockRejectedValue(new Error('SERVER_ERROR:Boom'));
    await renderPage();
    fireEvent.change(screen.getByLabelText(/^Installer/), { target: { value: 'uuid-1' } });
    await screen.findByText("Couldn't load this installer's jobs and meters.");
    expect(screen.queryByText(/Boom/)).toBeNull(); // server detail never reaches the user

    pickMeter('0239110006911');
    fireEvent.click(screen.getByRole('button', { name: /Dispatch 1 meter/ }));
    expect(await screen.findByText("Couldn't check meter needs. Please retry.")).toBeTruthy();
    expect(jedApi.assignMeters).not.toHaveBeenCalled();
  });
});
