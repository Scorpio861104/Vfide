import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live - VFIDE",
  description: "Experience VFIDE in action. Real-time trust scoring, fee calculations, and payment activity.",
};

export default function LiveDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
