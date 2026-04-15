import { clearStoredStaffSession, getStoredStaffSession, storeStaffSession, type StaffSession } from '../../lib/merchantStaff';

describe('merchantStaff storage safety', () => {
  const sampleSession: StaffSession = {
    id: 'staff_1',
    merchantAddress: '0x1111111111111111111111111111111111111111',
    staffName: 'Cashier Jane',
    walletAddress: '0x2222222222222222222222222222222222222222',
    role: 'cashier',
    permissions: {
      processSales: true,
      viewProducts: true,
      editProducts: false,
      issueRefunds: false,
      viewAnalytics: false,
      maxSaleAmount: 300,
      dailySaleLimit: 2000,
    },
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    active: true,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not throw when localStorage.setItem fails', () => {
    jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => storeStaffSession(sampleSession)).not.toThrow();
  });

  it('does not throw when localStorage.removeItem fails', () => {
    jest.spyOn(window.localStorage.__proto__, 'removeItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(() => clearStoredStaffSession()).not.toThrow();
  });

  it('returns null when localStorage.getItem fails', () => {
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(getStoredStaffSession()).toBeNull();
  });
});
