import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface MerchantLoyaltyProgram {
  merchantAddress: string;
  name: string;
  type: 'stamp' | 'points';
  stampsRequired: number;
  pointsPerUnit: number;
  rewardDescription: string;
  rewardType: 'free_item' | 'percentage_discount' | 'fixed_discount';
  rewardValue: number;
  active: boolean;
}

export interface CustomerLoyaltyProgress {
  merchantAddress: string;
  customerAddress: string;
  stamps: number;
  rewardsEarned: number;
  rewardsRedeemed: number;
  updatedAt: number;
}

export function serializeLoyaltyProgramRow(row: Record<string, unknown>): MerchantLoyaltyProgram {
  return {
    merchantAddress: String(row.merchant_address ?? '').toLowerCase(),
    name: String(row.name ?? 'Rewards'),
    type: row.type === 'points' ? 'points' : 'stamp',
    stampsRequired: Number(row.stamps_required ?? 10),
    pointsPerUnit: Number(row.points_per_unit ?? 1),
    rewardDescription: String(row.reward_description ?? ''),
    rewardType: row.reward_type === 'percentage_discount' || row.reward_type === 'fixed_discount' ? row.reward_type : 'free_item',
    rewardValue: Number(row.reward_value ?? 0),
    active: Boolean(row.active ?? true),
  };
}

export function serializeCustomerLoyaltyRow(row: Record<string, unknown>): CustomerLoyaltyProgress {
  return {
    merchantAddress: String(row.merchant_address ?? '').toLowerCase(),
    customerAddress: String(row.customer_address ?? '').toLowerCase(),
    stamps: Number(row.stamps ?? 0),
    rewardsEarned: Number(row.rewards_earned ?? 0),
    rewardsRedeemed: Number(row.rewards_redeemed ?? 0),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now(),
  };
}

export async function recordLoyaltyPurchase(
  merchantAddress: string,
  customerAddress: string,
  amountPaid: number,
): Promise<void> {
  try {
    const merchant = merchantAddress.trim().toLowerCase();
    const customer = customerAddress.trim().toLowerCase();
    if (!merchant || !customer) return;

    const programResult = await query(
      `SELECT merchant_address, name, type, stamps_required, points_per_unit,
              reward_description, reward_type, reward_value, active
         FROM merchant_loyalty_programs
        WHERE merchant_address = $1
          AND active = true
        LIMIT 1`,
      [merchant],
    );

    if (programResult.rows.length === 0) {
      return;
    }

    const program = serializeLoyaltyProgramRow(programResult.rows[0] as Record<string, unknown>);
    const increment = program.type === 'points'
      ? Math.max(1, Math.floor(Math.max(0, amountPaid) * Math.max(1, program.pointsPerUnit)))
      : 1;

    const currentResult = await query(
      `SELECT merchant_address, customer_address, stamps, rewards_earned, rewards_redeemed, updated_at
         FROM customer_loyalty
        WHERE merchant_address = $1
          AND customer_address = $2
        LIMIT 1`,
      [merchant, customer],
    );

    const current = currentResult.rows[0]
      ? serializeCustomerLoyaltyRow(currentResult.rows[0] as Record<string, unknown>)
      : {
          merchantAddress: merchant,
          customerAddress: customer,
          stamps: 0,
          rewardsEarned: 0,
          rewardsRedeemed: 0,
          updatedAt: Date.now(),
        };

    const nextStamps = current.stamps + increment;
    const required = Math.max(1, program.stampsRequired || 10);
    const newlyEarned = Math.max(0, Math.floor(nextStamps / required) - Math.floor(current.stamps / required));

    await query(
      `INSERT INTO customer_loyalty (
         merchant_address,
         customer_address,
         stamps,
         rewards_earned,
         rewards_redeemed,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (merchant_address, customer_address)
       DO UPDATE SET
         stamps = $3,
         rewards_earned = $4,
         rewards_redeemed = $5,
         updated_at = NOW()`,
      [
        merchant,
        customer,
        nextStamps,
        current.rewardsEarned + newlyEarned,
        current.rewardsRedeemed,
      ],
    );
  } catch (error) {
    logger.warn('[Merchant Loyalty] Failed to record loyalty purchase', error);
  }
}
