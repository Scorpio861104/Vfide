import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo - VFIDE",
  description: "Experience VFIDE in action. Real-time trust scoring, fee calculations, and payment demonstrations.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function LiveDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
