import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout - VFIDE Pay",
  description: "Secure crypto payment checkout. QR scans default to instant settlement; escrow protection available for checkout.",
};

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
