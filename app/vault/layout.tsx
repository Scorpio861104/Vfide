import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Vault - VFIDE",
  description: "Manage your VFIDE vault. Deposits, withdrawals, guardian setup, and social recovery controls.",
};

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
