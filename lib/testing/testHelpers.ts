/**
 * Test Helpers for Easier Test Coverage
 * 
 * Utilities to simplify writing tests and increase coverage
 */

/**
 * Mock Next.js router
 */
export function createMockRouter(overrides = {}) {
  return {
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
    isLocaleDomain: false,
    isReady: true,
    isPreview: false,
    ...overrides,
  };
}

/**
 * Mock wagmi hooks
 */
export function createMockWagmiHooks() {
  return {
    useAccount: jest.fn(() => ({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
    })),
    useConnect: jest.fn(() => ({
      connect: jest.fn(),
      connectors: [],
      isLoading: false,
      pendingConnector: null,
    })),
    useDisconnect: jest.fn(() => ({
      disconnect: jest.fn(),
    })),
    useBalance: jest.fn(() => ({
      data: { value: BigInt(1000000000000000000), formatted: '1.0' },
      isLoading: false,
    })),
  };
}

/**
 * Mock API response
 */
export function createMockApiResponse<T>(data: T, status: number = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  } as Response;
}

/**
 * Wait for async operations in tests
 */
export function waitFor(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock localStorage
 */
export function createMockLocalStorage() {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
}

/**
 * Mock IntersectionObserver
 */
export function createMockIntersectionObserver() {
  return class MockIntersectionObserver {
    observe = jest.fn();
    disconnect = jest.fn();
    unobserve = jest.fn();
  };
}

/**
 * Create mock user for tests
 */
export function createMockUser(overrides = {}) {
  return {
    wallet_address: '0x1234567890123456789012345678901234567890',
    username: 'testuser',
    email: 'test@example.com',
    bio: 'Test user bio',
    avatar_url: 'https://example.com/avatar.png',
    proof_score: 100,
    is_council_member: false,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Setup test environment
 */
export function setupTestEnvironment() {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock localStorage
  const mockLocalStorage = createMockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
  });

  // Mock IntersectionObserver
  (global as any).IntersectionObserver = createMockIntersectionObserver();
}

/**
 * Cleanup after tests
 */
export function cleanupTestEnvironment() {
  jest.clearAllMocks();
  jest.restoreAllMocks();
}

/**
 * Assert API call was made correctly
 */
export function expectApiCall(
  fetchMock: jest.Mock,
  url: string,
  options?: Partial<RequestInit>
) {
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining(url),
    expect.objectContaining(options || {})
  );
}

/**
 * Create mock contract read response
 */
export function createMockContractRead<T>(result: T) {
  return {
    result,
    status: 'success' as const,
  };
}
