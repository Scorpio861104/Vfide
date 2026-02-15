import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Token Launch - VFIDE",
  description: "Participate in the VFIDE token launch. Three commitment tiers with governance utility.",
};

export default function TokenLaunchLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
