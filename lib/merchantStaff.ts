import { safeLocalStorage } from './utils';

export type StaffRole = 'admin' | 'manager' | 'cashier';

export interface StaffPermissions {
  processSales: boolean;
  viewProducts: boolean;
  editProducts: boolean;
  issueRefunds: boolean;
  viewAnalytics: boolean;
  maxSaleAmount: number;
  dailySaleLimit: number;
}

export interface StaffSession {
  id: string;
  merchantAddress: string;
  staffName: string;
  walletAddress?: string | null;
  role: StaffRole;
  permissions: StaffPermissions;
  createdAt: number;
  expiresAt: number;
  active: boolean;
  sessionToken?: string;
  posLink?: string;
}

export const STAFF_ROLE_PRESETS: Record<StaffRole, StaffPermissions> = {
  admin: {
    processSales: true,
    viewProducts: true,
    editProducts: true,
    issueRefunds: true,
    viewAnalytics: true,
    maxSaleAmount: 10000,
    dailySaleLimit: 50000,
  },
  manager: {
    processSales: true,
    viewProducts: true,
    editProducts: true,
    issueRefunds: true,
    viewAnalytics: true,
    maxSaleAmount: 2500,
    dailySaleLimit: 10000,
  },
  cashier: {
    processSales: true,
    viewProducts: true,
    editProducts: false,
    issueRefunds: false,
    viewAnalytics: false,
    maxSaleAmount: 300,
    dailySaleLimit: 2000,
  },
};

export function buildStaffPermissionsForRole(role: StaffRole): StaffPermissions {
  return { ...STAFF_ROLE_PRESETS[role] };
}

export function normalizeStaffPermissions(
  value: Partial<StaffPermissions> | null | undefined,
  role: StaffRole = 'cashier',
): StaffPermissions {
  const base = buildStaffPermissionsForRole(role);
  return {
    processSales: value?.processSales ?? base.processSales,
    viewProducts: value?.viewProducts ?? base.viewProducts,
    editProducts: value?.editProducts ?? base.editProducts,
    issueRefunds: value?.issueRefunds ?? base.issueRefunds,
    viewAnalytics: value?.viewAnalytics ?? base.viewAnalytics,
    maxSaleAmount: Number.isFinite(value?.maxSaleAmount) ? Math.max(0, Number(value?.maxSaleAmount)) : base.maxSaleAmount,
    dailySaleLimit: Number.isFinite(value?.dailySaleLimit) ? Math.max(0, Number(value?.dailySaleLimit)) : base.dailySaleLimit,
  };
}

const STAFF_SESSION_STORAGE_KEY = 'vfide_staff_session';

export function isStaffSessionActive(session: StaffSession | null | undefined): session is StaffSession {
  return Boolean(session?.active && session.expiresAt > Date.now());
}

export function getStoredStaffSession(): StaffSession | null {
  try {
    const raw = safeLocalStorage.getItem(STAFF_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaffSession;
    if (!isStaffSessionActive(parsed)) {
      clearStoredStaffSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function storeStaffSession(session: StaffSession): void {
  try {
    safeLocalStorage.setItem(STAFF_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage may be unavailable in private browsing or restricted environments.
  }
}

export function clearStoredStaffSession(): void {
  try {
    safeLocalStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures in restricted environments.
  }
}
