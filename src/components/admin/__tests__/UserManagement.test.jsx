// @vitest-environment jsdom
// Account protection: a Super Admin cannot delete their own account, and the
// rest of the role model is unchanged. Rendered against a mocked jedApi.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import UserManagement from '../UserManagement';
import jedApi from '../../services/api';

const SUPER_ADMIN = {
  id: '3904aad1-2f27-42d1-9c33-fe87502ea594',
  firstName: 'Ada', lastName: 'Boss', email: 'boss@memetering.com', phone: '08149454601',
  role: 'SUPERADMIN', isActive: true,
};
const OTHER_ADMIN = {
  id: 'b0e1c2d3-0000-4000-8000-000000000001',
  firstName: 'Musa', lastName: 'Bello', email: 'musa@memetering.com', phone: '08030000001',
  role: 'ADMIN', isActive: true,
};
const INSTALLER = {
  id: 'b0e1c2d3-0000-4000-8000-000000000002',
  firstName: 'Ngozi', lastName: 'Eke', email: 'ngozi@memetering.com', phone: '08030000002',
  role: 'INSTALLER', isActive: true,
};

let currentUser = SUPER_ADMIN;

vi.mock('../../auth/usePermissions', () => ({
  usePermissions: () => ({
    user: currentUser,
    isAdmin: true,
    isAdminRole: currentUser.role === 'ADMIN',
    isSuperAdmin: currentUser.role === 'SUPERADMIN',
    canManageUsers: true,
  }),
}));

vi.mock('../../services/api', () => ({
  default: {
    clearCache: vi.fn(),
    getUsers: vi.fn(),
    deleteUser: vi.fn(),
    getUserById: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = SUPER_ADMIN;
  jedApi.getUsers.mockResolvedValue({
    success: true,
    data: [SUPER_ADMIN, OTHER_ADMIN, INSTALLER],
    pagination: { currentPage: 1, totalPages: 1, totalCount: 3, hasNext: false },
  });
  jedApi.deleteUser.mockResolvedValue({ success: true });
});
afterEach(cleanup);

const renderPage = async () => {
  render(<UserManagement />);
  await screen.findByText('boss@memetering.com');
};

const rowFor = (email) => screen.getByText(email).closest('tr');
const deleteButtonIn = (email) =>
  Array.from(rowFor(email).querySelectorAll('button')).find((b) => /Delete user|Super Administrator can do this/.test(b.title || ''));
const ownAccountMarker = (email) =>
  Array.from(rowFor(email).querySelectorAll('span')).find((s) => s.textContent === 'Your account');

describe('UserManagement — Super Admin account protection', () => {
  it('offers no delete action on the signed-in Super Admin\'s own row', async () => {
    await renderPage();
    expect(deleteButtonIn('boss@memetering.com')).toBeUndefined();
    expect(rowFor('boss@memetering.com').textContent).toContain('Your account');
  });

  it('explains why, for a Super Admin', async () => {
    await renderPage();
    expect(ownAccountMarker('boss@memetering.com').getAttribute('title'))
      .toBe('A Super Admin cannot delete their own account.');
  });

  it('still lets a Super Admin delete other accounts', async () => {
    await renderPage();
    fireEvent.click(deleteButtonIn('musa@memetering.com'));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(jedApi.deleteUser).toHaveBeenCalledWith(OTHER_ADMIN.id));
  });

  it('never issues DELETE for the signed-in account, even if the row is reached another way', async () => {
    await renderPage();
    // The Installer row's delete is wired up normally…
    expect(deleteButtonIn('ngozi@memetering.com')).toBeTruthy();
    // …but no delete is ever offered for, or sent for, the current account.
    expect(deleteButtonIn('boss@memetering.com')).toBeUndefined();
    expect(jedApi.deleteUser).not.toHaveBeenCalled();
  });
});

describe('UserManagement — existing user-management rules are unchanged', () => {
  it('keeps deletion Super Admin-only, and keeps an Admin scoped to Installers', async () => {
    currentUser = OTHER_ADMIN;
    render(<UserManagement />);
    await screen.findByText('ngozi@memetering.com');

    // An Admin only ever receives Installer accounts (role param + the
    // client-side backstop), so privileged rows are not on the page at all.
    expect(jedApi.getUsers).toHaveBeenCalledWith(expect.objectContaining({ role: 'INSTALLER' }));
    expect(screen.queryByText('boss@memetering.com')).toBeNull();

    const button = deleteButtonIn('ngozi@memetering.com');
    expect(button.disabled).toBe(true);
    expect(button.title).toMatch(/only a Super Administrator/);
  });
});
