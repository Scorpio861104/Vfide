import { buildCsp, getConnectSrcAllowlist } from '@/lib/security/csp';

describe('CSP policy helpers', () => {
  it('allows default wallet RPC origins in connect-src', () => {
    const connectSrc = getConnectSrcAllowlist({ NODE_ENV: 'production' } as NodeJS.ProcessEnv);

    expect(connectSrc).toContain('https://sepolia.base.org');
    expect(connectSrc).toContain('https://base-sepolia.blockpi.network');
    expect(connectSrc).toContain('https://polygon-rpc.com');
    expect(connectSrc).toContain('https://sepolia.era.zksync.dev');
    expect(connectSrc).toContain('https://*.walletconnect.com');
    expect(connectSrc).toContain('wss://*.walletconnect.org');
  });

  it('uses development script allowances without a nonce so Next can hydrate locally', () => {
    const csp = buildCsp('test-nonce', {}, { NODE_ENV: 'development' } as NodeJS.ProcessEnv);

    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).not.toContain("'nonce-test-nonce'");
  });

  it('keeps production script execution nonce-based', () => {
    const csp = buildCsp('prod-nonce', {}, { NODE_ENV: 'production' } as NodeJS.ProcessEnv);

    const scriptSrc = csp.split('; ').find((directive) => directive.startsWith('script-src'));

    expect(scriptSrc).toContain("script-src 'self' 'nonce-prod-nonce'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });
});
