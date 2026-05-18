import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Paper Wallet Generator | VFIDE',
  robots: { index: false, follow: false },
};

export default function PaperWalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
