import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation - VFIDE",
  description: "VFIDE documentation, tutorials, FAQ, and security information. Learn how to use the protocol.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
