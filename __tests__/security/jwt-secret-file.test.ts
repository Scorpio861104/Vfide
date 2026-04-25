import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('JWT secret file support', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('uses JWT_SECRET_FILE when JWT_SECRET is not set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vfide-jwt-'));
    const secretPath = join(dir, 'jwt_secret.txt');
    writeFileSync(secretPath, 'file-based-secret-for-tests-0123456789', 'utf8');

    try {
      delete process.env.JWT_SECRET;
      delete process.env.NEXTAUTH_SECRET;
      process.env.JWT_SECRET_FILE = secretPath;
      process.env.NEXT_PUBLIC_CHAIN_ID = '84532';
      process.env.NODE_ENV = 'test';

      const jwtModule = await import('@/lib/auth/jwt');
      const issued = jwtModule.generateToken('0x1111111111111111111111111111111111111111');
      const decoded = await jwtModule.verifyToken(issued.token);

      expect(decoded).not.toBeNull();
      expect(decoded?.address).toBe('0x1111111111111111111111111111111111111111');
      expect(decoded?.chainId).toBe(84532);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
