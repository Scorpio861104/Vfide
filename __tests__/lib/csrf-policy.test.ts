import { isCsrfExemptPath } from '@/lib/security/csrfPolicy';

describe('csrf policy', () => {
  it('exempts only pre-auth and health endpoints', () => {
    expect(isCsrfExemptPath('/api/auth')).toBe(true);
    expect(isCsrfExemptPath('/api/auth/challenge')).toBe(true);
    expect(isCsrfExemptPath('/api/health')).toBe(true);
  });

  it('does not exempt state-changing auth endpoints', () => {
    expect(isCsrfExemptPath('/api/auth/logout')).toBe(false);
    expect(isCsrfExemptPath('/api/auth/revoke')).toBe(false);
  });

  it('does not exempt non-listed api paths', () => {
    expect(isCsrfExemptPath('/api/messages')).toBe(false);
    expect(isCsrfExemptPath('/api/merchant/webhooks')).toBe(false);
  });
});
