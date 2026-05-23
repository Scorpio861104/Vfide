import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Owner Control Panel - VFIDE",
  description: "Unified administrative interface for VFIDE protocol management. Configure all system settings, manage Howey-safe mode, and monitor real-time status.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function ControlPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
