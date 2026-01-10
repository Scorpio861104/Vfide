import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout - VFIDE Pay",
  description: "Secure crypto payment checkout. Pay with VFIDE, USDC, or USDT with escrow protection.",
};

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
