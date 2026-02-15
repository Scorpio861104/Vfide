/**
 * Tests for Math.random() elimination audit fix
 * Verifies: all ID/token generators use crypto.getRandomValues instead of Math.random
 */

describe('Crypto Random - Math.random Elimination', () => {
  const mathRandomSpy = jest.spyOn(Math, 'random');

  afterEach(() => {
    mathRandomSpy.mockClear();
  });

  afterAll(() => {
    mathRandomSpy.mockRestore();
  });

  describe('Security-critical code should NOT use Math.random', () => {
    it('backup code generation should use crypto.getRandomValues', async () => {
      const { generateBackupCodes } = await import('@/config/security-advanced');
      mathRandomSpy.mockClear();

      const codes = generateBackupCodes(5);

      expect(codes).toHaveLength(5);
      expect(mathRandomSpy).not.toHaveBeenCalled();
      // Verify format: XXXX-XXXX-XXXX
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });

    it('security log ID should use crypto.getRandomValues', async () => {
      // Read the source file and verify it doesn't contain Math.random
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('@/hooks/useSecurityLogs'),
        'utf-8'
      );
      expect(source).not.toContain('Math.random');
      expect(source).toContain('crypto.getRandomValues');
    });

    it('session key service should use crypto.getRandomValues', async () => {
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('@/lib/sessionKeys/sessionKeyService'),
        'utf-8'
      );
      expect(source).not.toContain('Math.random');
      expect(source).toContain('crypto.getRandomValues');
    });

    it('user analytics session ID should use crypto.getRandomValues', async () => {
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('@/hooks/useUserAnalytics'),
        'utf-8'
      );
      expect(source).not.toContain('Math.random');
      expect(source).toContain('crypto.getRandomValues');
    });

    it('call system should use crypto.getRandomValues', async () => {
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('@/lib/callSystem'),
        'utf-8'
      );
      expect(source).not.toContain('Math.random');
      expect(source).toContain('crypto.getRandomValues');
    });

    it('invite links should use crypto.getRandomValues', async () => {
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('@/lib/inviteLinks'),
        'utf-8'
      );
      expect(source).not.toContain('Math.random');
      expect(source).toContain('crypto.getRandomValues');
    });

    it('attachments should use crypto.getRandomValues', async () => {
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('@/lib/attachments'),
        'utf-8'
      );
      expect(source).not.toContain('Math.random');
      expect(source).toContain('crypto.getRandomValues');
    });

    it('error tracking should use crypto.getRandomValues', async () => {
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('@/hooks/useErrorTracking'),
        'utf-8'
      );
      expect(source).not.toContain('Math.random');
      expect(source).toContain('crypto.getRandomValues');
    });

    it('merchant portal API key should not fallback to Math.random', async () => {
      const fs = await import('fs');
      const source = fs.readFileSync(
        require.resolve('@/components/merchant/MerchantPortal'),
        'utf-8'
      );
      // The fallback line should NOT contain Math.random
      expect(source).not.toContain('Math.random().toString(36)');
    });
  });
});
