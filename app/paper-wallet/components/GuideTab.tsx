'use client';

import { BookOpen, Shield, Printer, Lock, Archive, AlertTriangle } from 'lucide-react';

const STEPS = [
  { icon: <Shield size={15} className="text-cyan-400" />, title: 'Use an offline device', desc: 'Generate the wallet on a computer that is not connected to the internet. Disable Wi-Fi and Bluetooth before generating.' },
  { icon: <Printer size={15} className="text-green-400" />, title: 'Print immediately', desc: 'Print the address and private key directly. Use a wired printer, not a networked one. Do not save to PDF or cloud storage.' },
  { icon: <AlertTriangle size={15} className="text-yellow-400" />, title: 'Never photograph the key', desc: 'Do not take a photo of your private key or seed phrase. Phone cameras upload to cloud services in the background.' },
  { icon: <Lock size={15} className="text-purple-400" />, title: 'Store securely', desc: 'Keep the paper in a waterproof envelope in a safe or safety deposit box. Consider laminating it. Make 2–3 copies stored in different locations.' },
  { icon: <Archive size={15} className="text-blue-400" />, title: 'Test before funding', desc: 'Verify the address format on the Verify tab before sending any funds. Confirm you can derive the address from the private key.' },
  { icon: <Shield size={15} className="text-red-400" />, title: 'Protect from threats', desc: 'Physical theft is the primary risk. Ensure trusted people know where backups are in case of emergency, but cannot access them without authorization.' },
];

export function GuideTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Paper Wallet Best Practices</h3>
        </div>
        <div className="space-y-5">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-gray-400 font-bold">{i + 1}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">{step.icon}<p className="text-sm text-white font-medium">{step.title}</p></div>
                <p className="text-xs text-gray-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-gray-400 font-semibold mb-2">When to use a paper wallet</p>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>• Long-term cold storage you won’t access for months or years</li>
          <li>• Gifting crypto to someone without a wallet</li>
          <li>• Disaster recovery backup when hardware wallets fail</li>
          <li>• Emergency access copy for inheritance planning</li>
        </ul>
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className="text-yellow-400" />
          <p className="text-yellow-400 text-xs font-semibold">Important: Paper wallets are one-use</p>
        </div>
        <p className="text-xs text-gray-400">
          Once you spend from a paper wallet, the change address may expose your private key. Always sweep the entire balance to a new wallet when spending.
        </p>
      </div>
    </div>
  );
}
