import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal & Terms - VFIDE",
  description: "VFIDE legal terms, privacy policy, and service agreements. Important information about using the protocol.",
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
