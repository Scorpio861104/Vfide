import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#1A1A1F] border-t border-[#2A2A35] py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">
              VFIDE
            </h3>
            <p className="text-[#B8B8BD] text-sm">
              Decentralized Payment Protocol
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[#F5F3E8] font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/dashboard" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Dashboard</Link></li>
              <li><Link href="/merchant" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Merchant Portal</Link></li>
              <li><Link href="/vault" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Vault Manager</Link></li>
              <li><Link href="/pay" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Payments</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-[#F5F3E8] font-semibold mb-4">Community</h4>
            <ul className="space-y-2">
              <li><Link href="/governance" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Governance</Link></li>
              <li><Link href="/token-launch" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Token Launch</Link></li>
              <li><a href="https://github.com/Scorpio861104/Vfide" target="_blank" rel="noopener noreferrer" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">GitHub</a></li>
              <li><span className="text-[#B8B8BD] text-sm cursor-default">Discord (Coming Soon)</span></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[#F5F3E8] font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><Link href="/docs" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Documentation</Link></li>
              <li><Link href="/about" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">About</Link></li>
              <li><Link href="/live-demo" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Live Demo</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[#F5F3E8] font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/legal" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Legal & Terms</Link></li>
              <li><Link href="/guardians" className="text-[#B8B8BD] hover:text-[#00F0FF] text-sm">Guardians</Link></li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 pt-8 border-t border-[#3A3A3F]">
          <div className="max-w-4xl mx-auto text-center mb-6">
            <p className="text-[#8A8A8F] text-xs leading-relaxed">
              <strong className="text-[#B8B8BD]">DISCLAIMER:</strong> VFIDE tokens are utility tokens for governance and payments, 
              NOT investment securities. No guarantee of profits or returns. Cryptocurrency involves risk of total loss. 
              Not financial, legal, or tax advice. See <Link href="/legal" className="text-[#00F0FF] hover:underline">Legal & Terms</Link> for full details.
            </p>
          </div>
          <p className="text-[#8A8A8F] text-sm text-center">© 2025 VFIDE.io - Decentralized Payment Protocol</p>
        </div>
      </div>
    </footer>
  );
}
