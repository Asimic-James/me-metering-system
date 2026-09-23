import { describe, it, expect } from 'vitest';
import {
  isSameUserAccount, canDeleteUserAccount,
  SELF_DELETE_SUPERADMIN_MESSAGE, SELF_DELETE_MESSAGE, DELETE_NOT_PERMITTED_MESSAGE,
} from '../userAccount';

const superAdmin = {
  id: '3904aad1-2f27-42d1-9c33-fe87502ea594',
  role: 'SUPERADMIN',
  email: 'Boss@memetering.com',
  phone: '08149454601',
};
const otherAdmin = { id: 'b0e1c2d3-0000-4000-8000-000000000001', role: 'ADMIN', email: 'admin@memetering.com' };
const installer = { id: 'b0e1c2d3-0000-4000-8000-000000000002', role: 'INSTALLER' };

describe('isSameUserAccount', () => {
  it('matches on UUID, which is authoritative when both sides have one', () => {
    expect(isSameUserAccount(superAdmin, { ...superAdmin, email: 'changed@example.com' })).toBe(true);
    expect(isSameUserAccount(superAdmin, otherAdmin)).toBe(false);
  });

  it('falls back to email (case-insensitively) when a row has no id', () => {
    expect(isSameUserAccount(superAdmin, { role: 'SUPERADMIN', email: 'boss@memetering.com' })).toBe(true);
  });

  it('falls back to phone when there is neither id nor email', () => {
    expect(isSameUserAccount(superAdmin, { phone: '0814 945 4601' })).toBe(true);
  });

  it('never matches a missing record', () => {
    expect(isSameUserAccount(null, superAdmin)).toBe(false);
    expect(isSameUserAccount(superAdmin, null)).toBe(false);
  });
});

describe('canDeleteUserAccount', () => {
  it('refuses a Super Admin deleting their own account', () => {
    expect(canDeleteUserAccount({ currentUser: superAdmin, targetUser: superAdmin, isSuperAdmin: true }))
      .toEqual({ allowed: false, reason: SELF_DELETE_SUPERADMIN_MESSAGE });
  });

  it('refuses self-deletion for any other role too', () => {
    expect(canDeleteUserAccount({ currentUser: otherAdmin, targetUser: otherAdmin, isSuperAdmin: true }))
      .toEqual({ allowed: false, reason: SELF_DELETE_MESSAGE });
  });

  it('still allows a Super Admin to delete other accounts', () => {
    expect(canDeleteUserAccount({ currentUser: superAdmin, targetUser: otherAdmin, isSuperAdmin: true }).allowed).toBe(true);
    expect(canDeleteUserAccount({ currentUser: superAdmin, targetUser: installer, isSuperAdmin: true }).allowed).toBe(true);
  });

  it('keeps deletion Super Admin-only', () => {
    expect(canDeleteUserAccount({ currentUser: otherAdmin, targetUser: installer, isSuperAdmin: false }))
      .toEqual({ allowed: false, reason: DELETE_NOT_PERMITTED_MESSAGE });
  });

  it('refuses when there is no target', () => {
    expect(canDeleteUserAccount({ currentUser: superAdmin, targetUser: null, isSuperAdmin: true }).allowed).toBe(false);
  });
});
