import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscriptions — Tracker (Auto-Debit Coming Soon) - VFIDE",
  description:
    "Record and track recurring payment schedules today. Automatic on-chain debits via SubscriptionManager.sol are not yet shipped — for now, the next-payment date is a reminder, not an automated transfer.",
};

export default function SubscriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
