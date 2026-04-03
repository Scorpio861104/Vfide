'use client';

import { useState } from 'react';
import { useConnect } from 'wagmi';

export function ConnectTab() {
  const { connect, connectors = [] } = useConnect();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h3 className="mb-4 text-2xl font-bold text-white">Select Your Hardware Wallet</h3>
        <div className="flex flex-wrap gap-3">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                setSelectedWallet(connector.name);
                connect({ connector });
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white"
            >
              {connector.name}
            </button>
          ))}
        </div>
      </div>

      {selectedWallet ? (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6">
          <h3 className="mb-2 text-2xl font-bold text-white">Verify {selectedWallet}</h3>
          <p className="mb-3 text-cyan-100">Firmware Verification</p>
          <ul className="space-y-2 text-sm text-gray-200">
            <li>• Confirm you are on the latest firmware before signing transactions.</li>
            <li>• Install Ledger Live or Trezor Suite on your desktop first.</li>
            <li>• Verify the displayed receiving address directly on-device.</li>
          </ul>
          <button className="mt-4 rounded-xl bg-white/10 px-4 py-2 font-bold text-white">Download Ledger App</button>
        </div>
      ) : null}
    </div>
  );
}
