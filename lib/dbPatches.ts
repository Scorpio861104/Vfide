/**
 * Runtime DDL is intentionally disabled.
 *
 * groups.icon and groups.color must be provisioned via SQL migrations to keep
 * schema evolution deterministic and avoid granting DDL permissions to API roles.
 */
export async function ensureGroupVisualColumns(): Promise<void> {
  return;
}
