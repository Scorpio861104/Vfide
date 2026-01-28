import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VFIDE - Decentralized Payment Protocol",
  description: "Accept crypto payments. Build trust. No merchant processor fees.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F0F12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-zinc-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ padding: '2rem', color: 'white' }}>
          <h1>VFIDE - Testing Minimal Layout</h1>
          <p>If you can see this, the basic Next.js setup is working.</p>
        </div>
        {children}
      </body>
    </html>
  );
}
