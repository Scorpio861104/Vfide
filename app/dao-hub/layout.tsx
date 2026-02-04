import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DAO Hub - VFIDE",
  description: "DAO-only operations hub for proposals, disputes, and council messaging.",
};

export default function DaoHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
