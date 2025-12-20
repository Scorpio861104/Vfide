import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel - VFIDE",
  description: "VFIDE administrative dashboard for protocol management and governance controls.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
