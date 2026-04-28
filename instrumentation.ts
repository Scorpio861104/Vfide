let validated = false;

export async function register() {
  if (validated) return;
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('@/lib/startup-validation');
    validateEnvironment();
  }
  validated = true;
}
