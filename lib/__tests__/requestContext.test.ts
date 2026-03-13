import { describe, expect, it } from '@jest/globals';
import { getRequestIp } from '../security/requestContext';

describe('requestContext IP extraction hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalTrustProxyEnv = process.env.VFIDE_TRUST_PROXY_HEADERS;

  const setNodeEnv = (value: string | undefined) => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  };

  const setTrustProxyEnv = (value: string | undefined) => {
    if (value === undefined) {
      delete process.env.VFIDE_TRUST_PROXY_HEADERS;
      return;
    }
    process.env.VFIDE_TRUST_PROXY_HEADERS = value;
  };

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    setTrustProxyEnv(originalTrustProxyEnv);
  });

  it('does not trust proxy headers by default in production', () => {
    setNodeEnv('production');
    setTrustProxyEnv(undefined);

    const headers = new Headers({
      'x-forwarded-for': '203.0.113.10',
      'x-real-ip': '198.51.100.12',
    });

    const result = getRequestIp(headers);
    expect(result).toEqual({ ip: 'unknown', source: 'proxy-headers-untrusted' });
  });

  it('uses trusted proxy headers when explicitly enabled', () => {
    setNodeEnv('production');
    setTrustProxyEnv('true');

    const headers = new Headers({
      'x-forwarded-for': '198.51.100.1:443, 10.0.0.1',
    });

    const result = getRequestIp(headers);
    expect(result).toEqual({ ip: '198.51.100.1', source: 'x-forwarded-for' });
  });

  it('prioritizes cf-connecting-ip over forwarded chain when trusted', () => {
    setNodeEnv('production');
    setTrustProxyEnv('true');

    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1',
    });

    const result = getRequestIp(headers);
    expect(result).toEqual({ ip: '203.0.113.7', source: 'cf-connecting-ip' });
  });
});
