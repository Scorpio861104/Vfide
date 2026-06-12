/**
 * Merchant Transparency Panel (Wave 63 — the grandmother test).
 *
 * Assembles the operational-transparency fields a buyer needs to answer, immediately:
 *   - Who is this merchant?
 *   - Can I trust them?
 *   - Will they deliver?
 *   - How long have they been active?
 *   - What if something goes wrong?
 */

export interface TransparencyInputs {
  displayName: string;
  verified: boolean;
  ageDays: number;
  merchantTrust: number;
  deliveryReliability: number | null;
  deliveryReliabilityLabel: string;
  disputesTotal: number;
  disputesUpheld: number;
  continuityReady: boolean;
  recoveryReady: boolean;
}

export interface TransparencyPanel {
  displayName: string;
  verified: boolean;
  yearsActive: string;
  trustLabel: 'building' | 'established' | 'strong';
  deliveryLabel: string;
  disputeSummary: string;
  protections: string[];
  plainSummary: string;
}

function humanAge(ageDays: number): string {
  if (ageDays < 30) return 'new';
  if (ageDays < 365) return `${Math.max(1, Math.round(ageDays / 30))} months`;
  const years = Math.floor(ageDays / 365);
  return years === 1 ? '1 year' : `${years} years`;
}

export function buildTransparencyPanel(i: TransparencyInputs): TransparencyPanel {
  const yearsActive = humanAge(i.ageDays);
  const trustLabel = i.merchantTrust >= 80 ? 'strong' : i.merchantTrust >= 55 ? 'established' : 'building';

  const deliveryLabel =
    i.deliveryReliability == null ? 'No delivery history yet'
    : i.deliveryReliabilityLabel === 'reliable' ? 'Reliable delivery record'
    : i.deliveryReliabilityLabel === 'concerning' ? 'Some delivery problems reported'
    : 'Building a delivery record';

  const disputeSummary =
    i.disputesTotal === 0 ? 'No disputes on record.'
    : i.disputesUpheld === 0 ? `${i.disputesTotal} dispute(s), none upheld against this merchant.`
    : `${i.disputesUpheld} of ${i.disputesTotal} dispute(s) upheld against this merchant.`;

  const protections: string[] = [];
  if (i.continuityReady) protections.push('Has a continuity plan — the business can carry on if the owner is unavailable.');
  else protections.push('No continuity plan configured yet.');
  if (i.recoveryReady) protections.push('Account recovery is configured (guardians set).');
  protections.push('Disputes are handled by peer review; your funds are never frozen or seized by anyone.');

  const trustWord = trustLabel === 'strong' ? 'a strong' : trustLabel === 'established' ? 'an established' : 'a newer';
  const plainSummary =
    `${i.displayName} is ${trustWord} merchant${i.verified ? ' (verified)' : ''}, active ${yearsActive}. ` +
    `${deliveryLabel}. ${disputeSummary}`;

  return { displayName: i.displayName, verified: i.verified, yearsActive, trustLabel, deliveryLabel, disputeSummary, protections, plainSummary };
}
