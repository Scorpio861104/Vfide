describe('analytics storage safety', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('tracks events when localStorage reads are blocked', async () => {
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    const analytics = await import('../../lib/analytics');
    const event = analytics.trackEvent(analytics.MetricType.PAGE_VIEW, 'user-1', { path: '/vault' });

    expect(event.type).toBe(analytics.MetricType.PAGE_VIEW);
    expect(event.userId).toBe('user-1');
  });

  it('tracks events when localStorage writes are blocked', async () => {
    jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    const analytics = await import('../../lib/analytics');

    expect(() => analytics.trackEvent(analytics.MetricType.SEARCH_QUERY, 'user-2', { query: 'vfide' })).not.toThrow();
  });
});