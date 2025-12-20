import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About VFIDE - Decentralized Payment Protocol",
  description: "Learn about VFIDE's mission to revolutionize payments with trust-based commerce. No processor fees (burn + gas apply).",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
