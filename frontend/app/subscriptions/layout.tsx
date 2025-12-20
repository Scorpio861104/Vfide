import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscriptions - VFIDE",
  description: "Manage recurring crypto payments. Create, pause, and cancel subscriptions with smart contract automation.",
};

export default function SubscriptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
