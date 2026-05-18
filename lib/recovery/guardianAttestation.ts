export type GuardianAttestationPayload = {
  version: 'vfide-guardian-attestation-v1';
  owner: `0x${string}`;
  vault: `0x${string}`;
  guardian: `0x${string}`;
  issuedAt: number;
  expiresAt: number;
};

export function buildGuardianAttestationMessage(payload: GuardianAttestationPayload): string {
  return [
    'VFIDE Guardian Attestation',
    `version:${payload.version}`,
    `owner:${payload.owner.toLowerCase()}`,
    `vault:${payload.vault.toLowerCase()}`,
    `guardian:${payload.guardian.toLowerCase()}`,
    `issuedAt:${payload.issuedAt}`,
    `expiresAt:${payload.expiresAt}`,
  ].join('\n');
}
