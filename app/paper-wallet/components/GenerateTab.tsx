'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { FileText, RefreshCw, Copy, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface GeneratedWallet {
  address: string;
  privateKey: string;
  mnemonic: string;
}

export function GenerateTab() {
  const [wallet, setWallet] = useState<GeneratedWallet | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = useCallback(() => {
    const w = ethers.Wallet.createRandom();
    setWallet({
      address: w.address,
      privateKey: w.privateKey,
      mnemonic: w.mnemonic?.phrase ?? '',
    });
    setShowKey(false);
    setShowMnemonic(false);
  }, []);

  function copy(value: string, key: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      // Best-effort clipboard hygiene: clear copied value after 30 seconds.
      setTimeout(() => {
        navigator.clipboard.readText()
          .then((current) => {
            if (current === value) {
              return navigator.clipboard.writeText('');
            }
            return Promise.resolve();
          })
          .catch(() => {
            // Ignore clipboard permission/runtime errors in hardened browser contexts.
          });
      }, 30_000);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className="text-red-400" />
          <p className="text-red-400 text-xs font-semibold">Security Warning</p>
        </div>
        <p className="text-xs text-gray-400">
          This page generates keys inside your browser. Keys are never sent to VFIDE servers.
          However, this page is delivered over the internet — if your browser, device, or network is compromised, generated keys could be exposed.
          For real funds, use a hardware wallet (Ledger, Trezor) or generate keys on a fully offline machine using a downloadable tool.
          Never share your private key or seed phrase. VFIDE does not store this data — if you lose it, the funds cannot be recovered.
        </p>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold">Generate New Wallet</h3>
        </div>

        {!wallet ? (
          <button
            onClick={generate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors"
          >
            <RefreshCw size={16} /> Generate Wallet
          </button>
        ) : (
          <div className="space-y-4">
            {/* Address */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Public Address</p>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                <p className="text-sm text-white font-mono flex-1 break-all">{wallet.address}</p>
                <button onClick={() => copy(wallet.address, 'address')} className="flex-shrink-0 text-gray-400 hover:text-cyan-400 transition-colors">
                  <Copy size={13} />
                </button>
              </div>
              {copied === 'address' && (
                <p className="text-xs text-amber-300 mt-1">
                  Copied. Clipboard will be auto-cleared in ~30 seconds (best effort).
                </p>
              )}
            </div>

            {/* Private key */}
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Private Key</p>
              <div className="flex items-center gap-2 bg-white/5 border border-red-500/20 rounded-lg px-3 py-2.5">
                <p className="text-sm font-mono flex-1 break-all text-red-300/80">
                  {showKey ? wallet.privateKey : '•'.repeat(20)}
                </p>
                <button onClick={() => setShowKey((v) => !v)} className="flex-shrink-0 text-gray-400 hover:text-cyan-400">
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <p className="text-xs text-amber-300/90 mt-1">
                Copy for private key is intentionally disabled to reduce clipboard exfiltration risk.
              </p>
            </div>

            {/* Mnemonic */}
            {wallet.mnemonic && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Recovery Phrase (24 words)</p>
                <div className="bg-white/5 border border-red-500/20 rounded-lg p-3">
                  {showMnemonic ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {wallet.mnemonic.split(' ').map((w, i) => (
                        <p key={i} className="text-xs text-gray-300 font-mono">
                          <span className="text-gray-600 mr-1">{i + 1}.</span>{w}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center">[Hidden for security]</p>
                  )}
                  <button
                    onClick={() => setShowMnemonic((v) => !v)}
                    className="mt-2 text-xs text-gray-400 hover:text-cyan-400 flex items-center gap-1"
                  >
                    {showMnemonic ? <EyeOff size={10} /> : <Eye size={10} />}
                    {showMnemonic ? 'Hide' : 'Reveal phrase'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={generate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-colors"
              >
                <RefreshCw size={14} /> New
              </button>
            </div>
            <p className="text-xs text-amber-300/90">
              Print is disabled to avoid exposing plaintext secrets in printer queues, PDF history, and shared-device caches.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
