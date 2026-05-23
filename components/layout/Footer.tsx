import Link from "next/link";
import { Code2, X, MessageCircle, ArrowUpRight } from "lucide-react";
import { VFIDEMark } from "../ui/VFIDEMark";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
  soon?: boolean;
};

const footerLinks: {
  product:   FooterLink[];
  community: FooterLink[];
  resources: FooterLink[];
  legal:     FooterLink[];
} = {
  product: [
    { href: "/dashboard",        label: "Dashboard" },
    { href: "/merchant",         label: "Merchant Portal" },
    { href: "/vault",            label: "Vault Manager" },
    { href: "/pay",              label: "Payments" },
    { href: "/flashloans",       label: "Flashloans P2P" },
    { href: "/marketplace",      label: "Marketplace" },
  ],
  community: [
    { href: "/governance",                           label: "Governance" },
    { href: "/governance?tab=dao",                    label: "DAO Hub" },  // NAV-6: /dao-hub redirects to governance
    { href: "/fraud",                                label: "Fraud Reporting" },
    { href: "/token-launch",                         label: "Token Launch" },
    { href: "https://github.com/Scorpio861104/Vfide", label: "GitHub",  external: true },
    { href: "https://discord.gg/vfide",              label: "Discord", external: true, soon: true },
  ],
  resources: [
    { href: "/whitepaper/vfide-whitepaper.pdf",         label: "White Paper",   external: true },
    { href: "/whitepaper/vfide-executive-summary.pdf",  label: "1-Page Summary", external: true },
    { href: "/docs",       label: "Documentation" },
    { href: "/onboarding", label: "Setup Wizard" },
    { href: "/about",      label: "About" },
    { href: "/support",    label: "Support" },
  ],
  legal: [
    { href: "/legal",     label: "Legal & Terms" },
    { href: "/guardians", label: "Guardians" },
  ],
};

const socialLinks = [
  { href: "https://github.com/Scorpio861104/Vfide", icon: Code2,          label: "GitHub" },
  { href: "https://twitter.com/VFIDEProtocol",      icon: X,              label: "Twitter" },
  { href: "/support",                                icon: MessageCircle,  label: "Support" },
];

export function Footer() {
  return (
    <footer className="footer-premium overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-cyan-400/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-violet-400/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-16 pb-10">
        {/* ── Main grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-10 mb-14">

          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-5 group">
              <VFIDEMark size={32} glowing={false} animated={false} />
              <span className="logo-wordmark text-xl group-hover:opacity-80 transition-opacity">
                VFIDE
              </span>
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-6">
              The decentralized payment protocol where trust is earned, not bought.
              Zero processing fees, instant settlement, self-custody by default.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-cyan-400 hover:border-cyan-400/25 hover:bg-cyan-400/5 transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h2 className="footer-section-heading">Product</h2>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h2 className="footer-section-heading">Community</h2>
            <ul className="space-y-2.5">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-link"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-50" />
                      {link.soon && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/6 text-zinc-500 ml-1">
                          Soon
                        </span>
                      )}
                    </a>
                  ) : (
                    <Link href={link.href} className="footer-link">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h2 className="footer-section-heading">Resources</h2>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-link"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-50" />
                    </a>
                  ) : (
                    <Link href={link.href} className="footer-link">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h2 className="footer-section-heading">Legal</h2>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="section-divider mb-8" />

        <div className="max-w-3xl mb-6">
          <p className="text-zinc-500 text-xs leading-relaxed">
            <strong className="text-zinc-400">DISCLAIMER:</strong> VFIDE tokens are utility tokens for governance and
            payments, NOT investment securities. No guarantee of profits or returns. Cryptocurrency involves risk of
            total loss. Not financial, legal, or tax advice. See{" "}
            <Link href="/legal" className="text-cyan-400/70 hover:text-cyan-400 underline underline-offset-2 transition-colors">
              Legal & Terms
            </Link>{" "}
            for full details.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-zinc-500 text-xs">© 2025 VFIDE Protocol. All rights reserved.</p>
          <div className="network-badge">
            Base Sepolia Testnet
          </div>
        </div>
      </div>
    </footer>
  );
}
