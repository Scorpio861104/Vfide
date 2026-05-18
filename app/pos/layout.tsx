import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Point of Sale - VFIDE",
  description: "Full-featured crypto POS system. Product management, QR payments, and instant settlement.",
};

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
