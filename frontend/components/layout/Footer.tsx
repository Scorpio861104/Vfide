import Link from "next/link";
import { Github, Twitter, MessageCircle, ExternalLink } from "lucide-react";

const footerLinks = {
  product: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/merchant", label: "Merchant Portal" },
    { href: "/vault", label: "Vault Manager" },
    { href: "/pay", label: "Payments" },
  ],
  community: [
    { href: "/governance", label: "Governance" },
    { href: "/token-launch", label: "Token Launch" },
    { href: "https://github.com/Scorpio861104/Vfide", label: "GitHub", external: true },
    { href: "#", label: "Discord", soon: true },
  ],
  resources: [
    { href: "/docs", label: "Documentation" },
    { href: "/about", label: "About" },
    { href: "/live-demo", label: "Live Demo" },
  ],
  legal: [
    { href: "/legal", label: "Legal & Terms" },
    { href: "/guardians", label: "Guardians" },
  ],
};

const socialLinks = [
  { href: "https://github.com/Scorpio861104/Vfide", icon: Github, label: "GitHub" },
  { href: "#", icon: Twitter, label: "Twitter" },
  { href: "#", icon: MessageCircle, label: "Discord" },
];

export function Footer() {
  return (
    <footer className="relative bg-[#08080A] border-t border-[#1F1F2A] overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00F0FF]/3 rounded-full blur-[150px]" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2L35 8V18C35 28 28 35 20 38C12 35 5 28 5 18V8L20 2Z" fill="url(#footer-shield)" stroke="#00F0FF" strokeWidth="1"/>
                <path d="M12 12L20 28L28 12" stroke="#F8F8FC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="footer-shield" x1="20" y1="2" x2="20" y2="38" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1A1A1D"/>
                    <stop offset="1" stopColor="#0F0F12"/>
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-xl font-[family-name:var(--font-display)] font-bold text-[#F8F8FC] group-hover:text-[#00F0FF] transition-colors">
                VFIDE
              </span>
            </Link>
            <p className="text-[#6B6B78] text-sm leading-relaxed max-w-xs mb-6">
              The decentralized payment protocol where trust is earned, not bought. Zero processing fees, instant settlement.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-[#16161D] border border-[#1F1F2A] flex items-center justify-center text-[#6B6B78] hover:text-[#00F0FF] hover:border-[#00F0FF]/30 transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[#F8F8FC] font-semibold mb-4 text-sm">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-[#6B6B78] hover:text-[#00F0FF] text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-[#F8F8FC] font-semibold mb-4 text-sm">Community</h4>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  {link.soon ? (
                    <span className="text-[#4A4A55] text-sm flex items-center gap-1">
                      {link.label}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1F2A] text-[#6B6B78]">Soon</span>
                    </span>
                  ) : link.external ? (
                    <a 
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6B6B78] hover:text-[#00F0FF] text-sm transition-colors inline-flex items-center gap-1"
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link 
                      href={link.href}
                      className="text-[#6B6B78] hover:text-[#00F0FF] text-sm transition-colors"
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
            <h4 className="text-[#F8F8FC] font-semibold mb-4 text-sm">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-[#6B6B78] hover:text-[#00F0FF] text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[#F8F8FC] font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-[#6B6B78] hover:text-[#00F0FF] text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="pt-8 border-t border-[#1F1F2A]">
          <div className="max-w-3xl mx-auto text-center mb-6">
            <p className="text-[#4A4A55] text-xs leading-relaxed">
              <strong className="text-[#6B6B78]">DISCLAIMER:</strong> VFIDE tokens are utility tokens for governance and payments, 
              NOT investment securities. No guarantee of profits or returns. Cryptocurrency involves risk of total loss. 
              Not financial, legal, or tax advice. See{" "}
              <Link href="/legal" className="text-[#00F0FF] hover:underline">Legal & Terms</Link> for full details.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4A4A55]">
            <p>© 2025 VFIDE Protocol. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
              <span>Base Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
