export interface QrSignaturePayload {
  merchant: string;
  amount: string;
  orderId: string;
  source: string;
  settlement: string;
  expiresAt: number;
}

export function buildQrSignatureMessage(payload: QrSignaturePayload): string {
  return [
    'vfide:qr-payment:v1',
    `merchant:${payload.merchant.toLowerCase()}`,
    `amount:${payload.amount}`,
    `orderId:${payload.orderId}`,
    `source:${payload.source}`,
    `settlement:${payload.settlement}`,
    `expiresAt:${payload.expiresAt}`,
  ].join('\n');
}

export function parseExpiry(value: string | null): number | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}
