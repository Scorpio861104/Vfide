import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Token Launch - VFIDE Presale",
  description: "Participate in the VFIDE token presale. Three commitment tiers with governance utility.",
};

export default function TokenLaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
