let validated = false;

export async function register() {
  if (validated) return;
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER === 'true'
  ) {
    console.error('FATAL: FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER=true is not permitted in production.');
    process.exit(1);
  }
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('@/lib/startup-validation');
    validateEnvironment();

    // T-RLS-2 FIX: verify RLS role enforcement synchronously at startup,
    // not lazily via setImmediate after the first DB query has already begun.
    // In production this fails fast if DATABASE_URL points at a BYPASSRLS role.
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.FRONTEND_SELF_CONTAINED !== 'true' &&
      process.env.DATABASE_URL
    ) {
      try {
        const { verifyRlsEnforcementOrThrow } = await import('@/lib/db');
        await verifyRlsEnforcementOrThrow();
      } catch (err) {
        console.error('FATAL: RLS enforcement verification failed:', err);
        process.exit(1);
      }
    }
  }
  validated = true;
}
