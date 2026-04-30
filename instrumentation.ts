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
  }
  validated = true;
}
