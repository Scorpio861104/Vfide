import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Token Launch - VFIDE",
  description: "VFIDE token launch — acquire VFIDE through the treasury.",
};

export default function TokenLaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
