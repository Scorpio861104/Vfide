import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - VFIDE",
  description: "Your VFIDE dashboard. View your vault balance, ProofScore, badges, and transaction history.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
