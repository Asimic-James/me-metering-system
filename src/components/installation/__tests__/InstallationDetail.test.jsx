// @vitest-environment jsdom
// JED completion eligibility: any PAID request can be completed; the request
// body is exactly the documented one; unpaid requests get no form.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DataRefreshProvider } from '../../contexts/DataRefreshContext';
import InstallationDetail from '../InstallationDetail';
import jedApi from '../../services/api';

vi.mock('../../auth/usePermissions', () => ({
  usePermissions: () => ({ isAdmin: true, canSubmitComplaints: false }),
}));

vi.mock('../../services/api', () => ({
  default: {
    clearCache: vi.fn(),
    getCustomerRequest: vi.fn(),
    completeInstallation: vi.fn(),
    generatePaymentReference: vi.fn(),
  },
}));

const request = (status) => ({
  success: true,
  data: {
    id: 1, accountNumber: '477014', custNames: 'ABUTU AUGUSTINE', status, amount: 67000,
    rrr: '120799142825', meterRecommended: 'Three Phase', dateRequested: '2026-09-01T00:00:00Z',
    datePaid: status === 'INITIATED' ? null : '2026-09-02T00:00:00Z',
  },
});

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

const renderDetail = () => render(
  <MemoryRouter initialEntries={['/installations/477014']}>
    <DataRefreshProvider>
      <Routes>
        <Route path="/installations/:accountNumber" element={<InstallationDetail />} />
      </Routes>
    </DataRefreshProvider>
  </MemoryRouter>
);

const fillAndSubmit = () => {
  fireEvent.change(screen.getByPlaceholderText('13 digits'), { target: { value: '0123456789012' } });
  fireEvent.change(document.querySelector('input[name="actualSealNo"]'), { target: { value: ' 9900 ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mark as Complete' }));
};

describe('InstallationDetail — JED completion', () => {
  it('completes a paid request with exactly the documented body', async () => {
    jedApi.getCustomerRequest.mockResolvedValue(request('PAID'));
    jedApi.completeInstallation.mockResolvedValue({ success: true, data: { status: 'COMPLETED' } });
    renderDetail();
    await screen.findByText('Complete Installation');

    fillAndSubmit();
    await waitFor(() => expect(jedApi.completeInstallation).toHaveBeenCalledWith({
      sealNo: '9900', meterNo: '0123456789012', accountNumber: '477014',
    }));
  });

  it('offers no completion form for an unpaid request', async () => {
    jedApi.getCustomerRequest.mockResolvedValue(request('INITIATED'));
    renderDetail();
    await screen.findByText('Awaiting payment');
    expect(screen.queryByText('Complete Installation')).toBeNull();
    expect(jedApi.completeInstallation).not.toHaveBeenCalled();
  });

  it("turns the backend confirmation rule into a short message, without claiming success", async () => {
    jedApi.getCustomerRequest.mockResolvedValue(request('PAID'));
    jedApi.completeInstallation.mockRejectedValue(new Error('VALIDATION_ERROR:Payment not confirmed'));
    renderDetail();
    await screen.findByText('Complete Installation');

    fillAndSubmit();
    expect(await screen.findByText('Installation cannot be completed yet. Payment confirmation is still pending.')).toBeTruthy();
    expect(screen.queryByText('Installation submitted!')).toBeNull();
  });

  it('treats success:false in a 2xx body as a failure', async () => {
    jedApi.getCustomerRequest.mockResolvedValue(request('PAID'));
    jedApi.completeInstallation.mockResolvedValue({ success: false, message: 'Meter type mismatch' });
    renderDetail();
    await screen.findByText('Complete Installation');

    fillAndSubmit();
    expect(await screen.findByText('Meter type mismatch')).toBeTruthy();
    expect(screen.queryByText('Installation submitted!')).toBeNull();
  });
});
