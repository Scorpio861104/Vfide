import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merchant Portal - VFIDE",
  description: "Accept crypto payments with no processor fees. Burn fees (0.25-5%) and Base gas fees apply. Dashboard and analytics included.",
};

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
