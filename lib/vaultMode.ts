export type VaultImplementation = 'uservault' | 'cardbound';

export function resolveVaultImplementation(): VaultImplementation {
  const configured = process.env.NEXT_PUBLIC_VAULT_IMPLEMENTATION;

  if (!configured || configured.trim() === '') {
    return 'cardbound';
  }

  if (configured === 'cardbound' || configured === 'uservault') {
    return configured;
  }

  return 'cardbound';
}

export function isCardBoundVaultMode(): boolean {
  return resolveVaultImplementation() === 'cardbound';
}
