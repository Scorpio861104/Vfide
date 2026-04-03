export const metadata = { title: 'Legal — VFIDE Protocol', description: 'Protocol terms, privacy policy, and disclaimers.' };

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-24">
      <div className="container mx-auto px-4 max-w-3xl py-12">
        <h1 className="text-4xl font-bold text-white mb-8">Legal</h1>
        <section className="mb-10"><h2 className="text-2xl font-bold text-white mb-3">Protocol Disclaimer</h2><p className="text-gray-400 leading-relaxed">VFIDE is a decentralized payment protocol on public blockchain infrastructure. It is not a bank, MSB, payment processor, or financial institution. VFIDE does not custody, control, or transmit user funds.</p></section>
        <section className="mb-10"><h2 className="text-2xl font-bold text-white mb-3">Privacy</h2><p className="text-gray-400 leading-relaxed">VFIDE does not collect PII. Wallet addresses and transactions are public on-chain data. Email/phone login is handled by third-party wallet providers under their own privacy policies.</p></section>
        <section className="mb-10"><h2 className="text-2xl font-bold text-white mb-3">Third-Party Services</h2><p className="text-gray-400 leading-relaxed">Fiat on-ramp services are operated by independent regulated entities. Their KYC requirements are their responsibility.</p></section>
        <section><h2 className="text-2xl font-bold text-white mb-3">Risk Disclosure</h2><p className="text-gray-400 leading-relaxed">DeFi protocols carry inherent risks including smart contract vulnerabilities and token price volatility. Only use funds you can afford to lose.</p></section>
      </div>
    </div>
  );
}
