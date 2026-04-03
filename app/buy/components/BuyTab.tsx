'use client';

import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

const PROVIDERS = [
  { name: 'MoonPay', baseUrl: 'https://buy.moonpay.com' },
  { name: 'Transak', baseUrl: 'https://global.transak.com' },
  { name: 'Ramp', baseUrl: 'https://app.ramp.network' },
];

const QUICK_AMOUNTS = [100, 250, 500, 1000];
const DEFAULT_PROVIDER = PROVIDERS[0] ?? { name: 'MoonPay', baseUrl: 'https://buy.moonpay.com' };

export function BuyTab() {
  const { isConnected, address } = useAccount();
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_PROVIDER);
  const [amount, setAmount] = useState(250);

  const checkoutUrl = useMemo(() => {
    if (!selectedProvider || !address) {
      return '';
    }

    const params = new URLSearchParams({
      walletAddress: address,
      baseCurrencyAmount: String(amount),
      currencyCode: 'USD',
      defaultCryptoCurrency: 'USDC',
    });

    return `${selectedProvider.baseUrl}?${params.toString()}`;
  }, [address, amount, selectedProvider]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h3 className="mb-2 text-xl font-bold text-white">Buy VFIDE with Fiat</h3>
        {!isConnected ? (
          <p className="text-gray-400">Connect your wallet to receive purchased crypto and enable on-ramp checkout.</p>
        ) : (
          <p className="text-gray-400">Choose a Provider and launch a trusted fiat on-ramp with your wallet prefilled.</p>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-6 rounded-2xl border border-white/10 bg-white/3 p-6">
          <div>
            <h4 className="mb-3 text-lg font-semibold text-white">Quick Amount</h4>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount)}
                  className={`rounded-xl border px-4 py-2 font-bold ${
                    amount === quickAmount
                      ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-300'
                      : 'border-white/10 bg-white/5 text-gray-300'
                  }`}
                >
                  ${quickAmount}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-lg font-semibold text-white">Choose a Provider</h4>
            <div className="grid gap-3 md:grid-cols-3">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.name}
                  onClick={() => setSelectedProvider(provider)}
                  className={`rounded-2xl border p-4 text-left ${
                    selectedProvider.name === provider.name
                      ? 'border-cyan-500/30 bg-cyan-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-gray-300'
                  }`}
                >
                  <div className="text-lg font-bold">{provider.name}</div>
                  <div className="text-sm text-gray-400">Wallet prefill + crypto checkout</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              if (checkoutUrl) {
                window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-bold text-white"
          >
            Buy with {selectedProvider.name}
          </button>
        </div>
      ) : null}
    </div>
  );
}
