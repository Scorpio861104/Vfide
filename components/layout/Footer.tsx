import Link from "next/link";
import { Code2, X, MessageCircle, ExternalLink } from "lucide-react";
import { VFIDEMark } from "../ui/VFIDEMark";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
  soon?: boolean;
};

const footerLinks: {
  product: FooterLink[];
  community: FooterLink[];
  resources: FooterLink[];
  legal: FooterLink[];
} = {
  product: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/merchant", label: "Merchant Portal" },
    { href: "/vault", label: "Vault Manager" },
    { href: "/pay", label: "Payments" },
    { href: "/flashloans", label: "Flashloans P2P" },
  ],
  community: [
    { href: "/governance", label: "Governance" },
    { href: "/dao-hub", label: "DAO Hub" },
    { href: "/fraud", label: "Fraud Reporting" },
    { href: "/token-launch", label: "Token Launch" },
    { href: "https://github.com/Scorpio861104/Vfide", label: "GitHub", external: true },
    { href: "https://discord.gg/vfide", label: "Discord", external: true, soon: true },
  ],
  resources: [
    { href: "/docs", label: "Documentation" },
    { href: "/onboarding", label: "Setup wizard" },
    { href: "/about", label: "About" },
    { href: "/support", label: "Support" },
  ],
  legal: [
    { href: "/legal", label: "Legal & Terms" },
    { href: "/guardians", label: "Guardians" },
  ],
};

const socialLinks = [
  { href: "https://github.com/Scorpio861104/Vfide", icon: Code2, label: "GitHub" },
  { href: "https://twitter.com/VFIDEProtocol", icon: X, label: "Twitter" },
  { href: "/support", icon: MessageCircle, label: "Support" },
];

export function Footer() {
  return (
    <footer
      className="relative bg-zinc-950/80 border-t border-white/10 backdrop-blur-xl overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(to bottom, rgba(8,145,178,0.03), transparent)' }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-400/3 rounded-full blur-[150px]" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
              <VFIDEMark size={32} glowing={false} animated={false} />
              <span className="text-xl font-[family-name:var(--font-display)] font-bold text-zinc-50 group-hover:text-cyan-400 transition-colors">
                VFIDE
              </span>
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-6">
              The decentralized payment protocol where trust is earned, not bought. Zero processing fees, instant settlement.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-cyan-400 hover:border-cyan-400/30 transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h2 className="text-zinc-50 font-semibold mb-4 text-sm">Product</h2>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-zinc-400 hover:text-cyan-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h2 className="text-zinc-50 font-semibold mb-4 text-sm">Community</h2>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a 
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-cyan-400 text-sm transition-colors inline-flex items-center gap-1"
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3" />
                      {link.soon && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">Soon</span>
                      )}
                    </a>
                  ) : (
                    <Link 
                      href={link.href}
                      className="text-zinc-400 hover:text-cyan-400 text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h2 className="text-zinc-50 font-semibold mb-4 text-sm">Resources</h2>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-zinc-400 hover:text-cyan-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h2 className="text-zinc-50 font-semibold mb-4 text-sm">Legal</h2>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-zinc-400 hover:text-cyan-400 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="pt-8 border-t border-zinc-800">
          <div className="max-w-3xl mx-auto text-center mb-6">
            <p className="text-zinc-400 text-xs leading-relaxed">
              <strong className="text-zinc-400">DISCLAIMER:</strong> VFIDE tokens are utility tokens for governance and payments, 
              NOT investment securities. No guarantee of profits or returns. Cryptocurrency involves risk of total loss. 
              Not financial, legal, or tax advice. See{" "}
              <Link href="/legal" className="text-sky-200 underline underline-offset-2 hover:text-cyan-200">Legal & Terms</Link> for full details.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
            <p>© 2025 VFIDE Protocol. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>Base Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
