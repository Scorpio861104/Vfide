import { query } from '@/lib/db';

let groupVisualColumnsPatchPromise: Promise<void> | null = null;

/**
 * Ensure groups.icon and groups.color exist for deployments where migrations
 * lag behind app code. This is idempotent and runs at most once per process.
 */
export async function ensureGroupVisualColumns(): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  if (!groupVisualColumnsPatchPromise) {
    groupVisualColumnsPatchPromise = (async () => {
      await query('ALTER TABLE groups ADD COLUMN IF NOT EXISTS icon VARCHAR(32)');
      await query('ALTER TABLE groups ADD COLUMN IF NOT EXISTS color VARCHAR(7)');
    })().catch((error) => {
      groupVisualColumnsPatchPromise = null;
      throw error;
    });
  }

  await groupVisualColumnsPatchPromise;
}
