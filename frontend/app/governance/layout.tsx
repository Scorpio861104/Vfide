import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Governance - VFIDE DAO",
  description: "Participate in VFIDE governance. Vote on proposals, view discussions, and shape the future of decentralized payments.",
};

export default function GovernanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
