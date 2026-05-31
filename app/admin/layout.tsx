import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel - VFIDE",
  description: "VFIDE administrative dashboard for protocol management and governance controls.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
