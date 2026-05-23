import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - VFIDE",
  description: "Your VFIDE dashboard. View your vault balance, ProofScore, badges, and transaction history.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
