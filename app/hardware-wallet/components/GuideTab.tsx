'use client';

import { BookOpen, Shield, Download, Plug, Key, CheckCircle } from 'lucide-react';

const LEDGER_STEPS = [
  { icon: <Download size={16} className="text-cyan-400" />, title: 'Install Ledger Live', desc: 'Download Ledger Live from ledger.com/start. Initialize your device and write down your 24-word recovery phrase offline.' },
  { icon: <Download size={16} className="text-purple-400" />, title: 'Install Ethereum App', desc: 'In Ledger Live, go to Manager → App Catalog. Search for Ethereum and install it on your device.' },
  { icon: <Plug size={16} className="text-green-400" />, title: 'Connect via USB', desc: 'Use the Connect tab on the left. Select Ledger, plug in your device, unlock it, and open the Ethereum app.' },
  { icon: <Key size={16} className="text-yellow-400" />, title: 'Derive Account', desc: 'VFIDE will request permission to read your accounts. Select the address you want to use and confirm.' },
  { icon: <CheckCircle size={16} className="text-green-400" />, title: 'Sign Transactions', desc: 'All VFIDE operations will prompt confirmation on the hardware device screen before broadcasting.' },
];

const TREZOR_STEPS = [
  { icon: <Download size={16} className="text-cyan-400" />, title: 'Download Trezor Suite', desc: 'Get Trezor Suite from trezor.io/start. Set up your device and secure your seed phrase.' },
  { icon: <Shield size={16} className="text-purple-400" />, title: 'Enable Bridge', desc: 'Trezor Bridge runs in the background to allow browser communication. Install it from Trezor Suite if prompted.' },
  { icon: <Plug size={16} className="text-green-400" />, title: 'Connect USB', desc: 'Plug in your Trezor and unlock it using your PIN. The device should show the home screen.' },
  { icon: <Key size={16} className="text-yellow-400" />, title: 'Connect in VFIDE', desc: 'Use the Connect tab, select Trezor, and follow the browser popup to grant access.' },
  { icon: <CheckCircle size={16} className="text-green-400" />, title: 'Confirm on Device', desc: 'Every transaction will appear on the Trezor screen for manual confirmation before signing.' },
];

export function GuideTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Ledger Setup Guide</h3>
        </div>
        <div className="space-y-4">
          {LEDGER_STEPS.map((step, i) => (
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

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-purple-400" />
          <h3 className="text-white font-semibold text-sm">Trezor Setup Guide</h3>
        </div>
        <div className="space-y-4">
          {TREZOR_STEPS.map((step, i) => (
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

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={14} className="text-yellow-400" />
          <p className="text-yellow-400 text-xs font-semibold">Security Reminder</p>
        </div>
        <p className="text-xs text-gray-400">Never enter your seed phrase online or into any software. VFIDE will never ask for your recovery phrase.</p>
      </div>
    </div>
  );
}
