/**
 * WhatsApp Integration — The distribution channel for VFIDE
 *
 * WhatsApp is how the target demographic communicates, shares,
 * and discovers. This module provides:
 *
 *   1. Receipt delivery — Send formatted receipt after purchase
 *   2. Order notifications — Merchant gets notified of new orders
 *   3. Product sharing — Deep links to storefront products
 *   4. Payment links — "Pay me" links that open VFIDE checkout
 *   5. Loan reminders — Upcoming payment due notifications
 *   6. Store promotion — Share store link with formatted catalog
 *
 * Uses WhatsApp Business API for automated messages (server-side)
 * and wa.me deep links for user-initiated sharing (client-side).
 */

// ── Client-side: wa.me deep links (no API key needed) ────────────────────
import { safeWindowOpen } from '@/lib/security/urlValidation';

export interface ReceiptData {
  merchantName: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  fee: number;
  total: number;
  currency: string;
  txHash?: string;
  date: string;
}

export function formatReceipt(receipt: ReceiptData): string {
  const itemLines = receipt.items
    .map(i => `  ${i.name} × ${i.qty} — ${receipt.currency}${(i.price * i.qty).toFixed(2)}`)
    .join('\n');

  return [
    `🧾 *Receipt from ${receipt.merchantName}*`,
    `📅 ${receipt.date}`,
    '',
    itemLines,
    '',
    `Subtotal: ${receipt.currency}${receipt.subtotal.toFixed(2)}`,
    `Trust fee: ${receipt.currency}${receipt.fee.toFixed(2)}`,
    `*Total: ${receipt.currency}${receipt.total.toFixed(2)}*`,
    '',
    receipt.txHash ? `🔗 Tx: ${receipt.txHash.slice(0, 10)}...` : '',
    '',
    'Paid via VFIDE — 0% merchant fees',
  ].filter(Boolean).join('\n');
}

export function shareReceipt(receipt: ReceiptData, phoneNumber?: string): void {
  const text = formatReceipt(receipt);
  const url = phoneNumber
    ? `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  safeWindowOpen(url, { allowRelative: false, allowedHosts: ['wa.me'] });
}

// ── Product sharing ──────────────────────────────────────────────────────

export interface ProductShareData {
  name: string;
  price: number;
  currency: string;
  description?: string;
  merchantName: string;
  storeUrl: string;
  imageUrl?: string;
}

export function formatProductShare(product: ProductShareData): string {
  return [
    `🛍️ *${product.name}* — ${product.currency}${product.price}`,
    product.description ? `\n${product.description}` : '',
    '',
    `🏪 From *${product.merchantName}*`,
    `🔗 Buy now: ${product.storeUrl}`,
    '',
    '0% merchant fees on VFIDE',
  ].filter(Boolean).join('\n');
}

export function shareProduct(product: ProductShareData): void {
  const text = formatProductShare(product);
  safeWindowOpen(`https://wa.me/?text=${encodeURIComponent(text)}`, { allowRelative: false, allowedHosts: ['wa.me'] });
}

// ── Payment request link ─────────────────────────────────────────────────

export interface PaymentLinkData {
  amount: number;
  currency: string;
  merchantName: string;
  merchantAddress: string;
  note?: string;
  appUrl: string;
}

export function formatPaymentRequest(link: PaymentLinkData): string {
  const payUrl = `${link.appUrl}/pay?to=${link.merchantAddress}&amount=${link.amount}&note=${encodeURIComponent(link.note || '')}`;
  return [
    `💰 *${link.merchantName}* is requesting payment`,
    '',
    `Amount: *${link.currency}${link.amount.toFixed(2)}*`,
    link.note ? `Note: ${link.note}` : '',
    '',
    `🔗 Pay now: ${payUrl}`,
    '',
    'Powered by VFIDE — trust-scored payments',
  ].filter(Boolean).join('\n');
}

export function sharePaymentRequest(link: PaymentLinkData, phoneNumber?: string): void {
  const text = formatPaymentRequest(link);
  const url = phoneNumber
    ? `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  safeWindowOpen(url, { allowRelative: false, allowedHosts: ['wa.me'] });
}

// ── Store catalog sharing ────────────────────────────────────────────────

export interface StoreCatalogData {
  merchantName: string;
  storeUrl: string;
  products: { name: string; price: number }[];
  currency: string;
  proofScore: number;
  location?: string;
}

export function formatStoreCatalog(store: StoreCatalogData): string {
  const productList = store.products
    .slice(0, 10) // Max 10 items in a WhatsApp message
    .map(p => `  • ${p.name} — ${store.currency}${p.price}`)
    .join('\n');

  return [
    `🏪 *${store.merchantName}*`,
    store.location ? `📍 ${store.location}` : '',
    `⭐ ProofScore: ${store.proofScore.toLocaleString()}`,
    '',
    productList,
    store.products.length > 10 ? `  ... and ${store.products.length - 10} more` : '',
    '',
    `🔗 Browse full store: ${store.storeUrl}`,
    '',
    'Shop on VFIDE — 0% merchant fees',
  ].filter(Boolean).join('\n');
}

export function shareStoreCatalog(store: StoreCatalogData): void {
  const text = formatStoreCatalog(store);
  safeWindowOpen(`https://wa.me/?text=${encodeURIComponent(text)}`, { allowRelative: false, allowedHosts: ['wa.me'] });
}

// ── Loan reminder ────────────────────────────────────────────────────────

export interface LoanReminderData {
  borrowerName?: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysRemaining: number;
  lenderName: string;
  appUrl: string;
}

export function formatLoanReminder(reminder: LoanReminderData): string {
  const urgency = reminder.daysRemaining <= 1 ? '🚨' : reminder.daysRemaining <= 3 ? '⚠️' : '📋';
  return [
    `${urgency} *Loan Payment Reminder*`,
    '',
    `Amount due: *${reminder.currency}${reminder.amount.toFixed(2)}*`,
    `Due date: ${reminder.dueDate}`,
    `${reminder.daysRemaining <= 0 ? '⏰ OVERDUE' : `${reminder.daysRemaining} day${reminder.daysRemaining !== 1 ? 's' : ''} remaining`}`,
    '',
    `Lender: ${reminder.lenderName}`,
    '',
    `🔗 Repay now: ${reminder.appUrl}/lending`,
    '',
    'On-time repayment earns +0.5 ProofScore',
  ].join('\n');
}

export function sendLoanReminder(reminder: LoanReminderData, phoneNumber: string): void {
  const text = formatLoanReminder(reminder);
  safeWindowOpen(`https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, { allowRelative: false, allowedHosts: ['wa.me'] });
}

// ── Server-side: WhatsApp Business API (for automated messages) ──────────

export interface WhatsAppAPIConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
}

export async function sendWhatsAppTemplate(
  config: WhatsAppAPIConfig,
  to: string,
  templateName: string,
  languageCode: string,
  parameters: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiVersion = config.apiVersion || 'v18.0';
  const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: parameters.length > 0 ? [{
            type: 'body',
            parameters: parameters.map(p => ({ type: 'text', text: p })),
          }] : undefined,
        },
      }),
    });

    const data = await response.json();
    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || 'Unknown error' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ── Template names for WhatsApp Business API ─────────────────────────────
// These templates must be pre-approved by WhatsApp
export const WHATSAPP_TEMPLATES = {
  PAYMENT_RECEIVED: 'vfide_payment_received',     // "You received {{1}} from {{2}}"
  ORDER_NOTIFICATION: 'vfide_new_order',            // "New order: {{1}} from {{2}}"
  LOAN_DUE_REMINDER: 'vfide_loan_reminder',         // "Payment of {{1}} due on {{2}}"
  LOAN_OVERDUE: 'vfide_loan_overdue',               // "Payment of {{1}} is overdue"
  BADGE_EARNED: 'vfide_badge_earned',               // "You earned the {{1}} badge!"
  SCORE_MILESTONE: 'vfide_score_milestone',         // "ProofScore reached {{1}}"
} as const;
