export type VaultImplementation = 'cardbound';

export function resolveVaultImplementation(): VaultImplementation {
  return 'cardbound';
}

export function isCardBoundVaultMode(): boolean {
  return true;
}
