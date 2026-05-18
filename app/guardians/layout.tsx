import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guardians - VFIDE",
  description: "Manage vault guardians for social recovery. Add trusted contacts to protect your assets.",
};

export default function GuardiansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
