/**
 * Merchant Advisor / Commerce Health engine (Institution 3 — Commerce).
 *
 * Turns real merchant data into honest signals + recommendations — the "Seer as business advisor."
 * Pure/deterministic over a defined input shape (the API derives the inputs from real tables:
 * payment confirmations over time windows, returns, repeat customers, product inventory, plan counts).
 *
 * HONESTY: every recommendation is grounded in an observable fact (revenue moved X%, N items low on
 * stock, refund rate is Y%). It never invents advice. When there isn't enough data to say something
 * useful (e.g. a brand-new store), it says so rather than fabricating a trend.
 */

export interface MerchantAdvisorInput {
  /** Revenue (sum of confirmed payment amounts) in the trailing 30 days and the 30 days before that. */
  revenueLast30: number;
  revenuePrev30: number;
  /** Confirmed payments (order count) in the same two windows. */
  ordersLast30: number;
  ordersPrev30: number;
  /** Distinct customers in the last 90 days, and how many of them are repeat (≥2 purchases). */
  distinctCustomers90: number;
  repeatCustomers90: number;
  /** Refunds granted (approved/completed) and total orders, last 90 days. */
  refundsGranted90: number;
  orders90: number;
  /** Products with inventory tracking on, and how many are at/below a low threshold. */
  trackedProducts: number;
  lowStockProducts: number;
  /** Does the merchant offer any subscription plans? (opportunity signal) */
  hasSubscriptionPlans: boolean;
  /** Total confirmed lifetime orders (maturity gate for trend confidence). */
  lifetimeOrders: number;
}

export type AdvisorSeverity = 'good' | 'info' | 'watch' | 'concern';

export interface AdvisorSignal {
  id: string;
  severity: AdvisorSeverity;
  title: string;
  detail: string;
}

export interface MerchantAdvisorResult {
  /** 0..100 commerce-health score (only meaningful once there's enough history). */
  healthScore: number;
  /** True when the store has too little history for trend-based advice. */
  insufficientData: boolean;
  signals: AdvisorSignal[];
}

function pctChange(now: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((now - prev) / prev) * 100;
}

export function computeMerchantAdvisor(d: MerchantAdvisorInput): MerchantAdvisorResult {
  const signals: AdvisorSignal[] = [];
  const insufficientData = d.lifetimeOrders < 5;

  // ── Revenue trend (only with enough prior history) ──
  const revChange = pctChange(d.revenueLast30, d.revenuePrev30);
  if (!insufficientData && revChange !== null) {
    if (revChange >= 15) {
      signals.push({
        id: 'revenue-up',
        severity: 'good',
        title: 'Sales are growing',
        detail: `Revenue is up ${Math.round(revChange)}% vs the previous 30 days. Keep doing what's working.`,
      });
    } else if (revChange <= -25) {
      signals.push({
        id: 'revenue-down',
        severity: 'concern',
        title: 'Sales are slowing',
        detail: `Revenue is down ${Math.round(Math.abs(revChange))}% vs the previous 30 days. Consider a promotion or reaching out to past customers.`,
      });
    } else if (revChange <= -10) {
      signals.push({
        id: 'revenue-soft',
        severity: 'watch',
        title: 'Sales dipped a little',
        detail: `Revenue is down ${Math.round(Math.abs(revChange))}% vs the previous 30 days — worth keeping an eye on.`,
      });
    }
  }

  // ── Customer retention ──
  if (!insufficientData && d.distinctCustomers90 >= 5) {
    const repeatRate = (d.repeatCustomers90 / d.distinctCustomers90) * 100;
    if (repeatRate >= 40) {
      signals.push({
        id: 'retention-strong',
        severity: 'good',
        title: 'Customers come back',
        detail: `${Math.round(repeatRate)}% of your customers have bought more than once — a strong sign.`,
      });
    } else if (repeatRate < 15) {
      signals.push({
        id: 'retention-low',
        severity: 'watch',
        title: 'Few repeat customers',
        detail: `Only ${Math.round(repeatRate)}% of customers buy again. A loyalty reward or follow-up could help bring them back.`,
      });
    }
  }

  // ── Refund concern ──
  if (d.orders90 >= 10) {
    const refundRate = (d.refundsGranted90 / d.orders90) * 100;
    if (refundRate >= 15) {
      signals.push({
        id: 'refunds-high',
        severity: 'concern',
        title: 'Refunds are high',
        detail: `${Math.round(refundRate)}% of recent orders were refunded. It's worth checking product descriptions, quality, or delivery.`,
      });
    } else if (refundRate >= 8) {
      signals.push({
        id: 'refunds-watch',
        severity: 'watch',
        title: 'Refunds worth watching',
        detail: `${Math.round(refundRate)}% of recent orders were refunded.`,
      });
    }
  }

  // ── Low inventory ──
  if (d.lowStockProducts > 0) {
    signals.push({
      id: 'low-stock',
      severity: 'watch',
      title: 'Low on stock',
      detail: `${d.lowStockProducts} product${d.lowStockProducts === 1 ? ' is' : 's are'} running low. Restock soon to avoid missing sales.`,
    });
  }

  // ── Subscription opportunity ──
  if (!d.hasSubscriptionPlans && d.repeatCustomers90 >= 5) {
    signals.push({
      id: 'subscription-opp',
      severity: 'info',
      title: 'Subscriptions could fit',
      detail: `You have repeat customers but no subscription plans. Recurring plans could turn repeat buyers into steady income.`,
    });
  }

  // ── Health score (only meaningful with history) ──
  let healthScore = 50;
  if (!insufficientData) {
    healthScore = 60;
    if (revChange !== null) healthScore += Math.max(-25, Math.min(25, revChange / 2));
    if (d.distinctCustomers90 >= 5) healthScore += ((d.repeatCustomers90 / d.distinctCustomers90) - 0.2) * 40;
    if (d.orders90 >= 10) healthScore -= (d.refundsGranted90 / d.orders90) * 60;
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
  }

  if (insufficientData) {
    signals.unshift({
      id: 'new-store',
      severity: 'info',
      title: 'Your store is just getting started',
      detail: `Once you've made a few more sales, the advisor can spot trends and opportunities for you.`,
    });
  } else if (signals.length === 0) {
    signals.push({
      id: 'all-clear',
      severity: 'good',
      title: 'Everything looks steady',
      detail: `No concerns right now. Your store is running smoothly.`,
    });
  }

  return { healthScore, insufficientData, signals };
}
