import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Your Vault - VFIDE",
  description: "Manage your VFIDE vault. Deposits, withdrawals, guardian setup, and social recovery controls.",
};

export default function VaultLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
