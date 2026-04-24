import { validateEnvironment } from '@/lib/startup-validation';

let validated = false;

export async function register() {
  if (validated) return;
  validateEnvironment();
  validated = true;
}
