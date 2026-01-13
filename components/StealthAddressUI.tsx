'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useStealth } from '@/lib/stealthAddresses';
import { useWallet } from '@/lib/crypto';
import { toast } from '@/lib/toast';

// ============================================================================
// Stealth Address UI Component
// ============================================================================

export default function StealthAddressUI() {
  const { wallet } = useWallet();
  const address = wallet?.address;
  const {
    profile,
    loading,
    error,
    encodedMetaAddress,
    privacyScore,
    initialize,
    getReceiveAddress,
    createPaymentAddress,
  } = useStealth(address);

  const [recipientMetaAddress, setRecipientMetaAddress] = useState('');
  const [generatedAddress, setGeneratedAddress] = useState<{
    address: string;
    ephemeralPubKey: string;
    viewTag: string;
  } | null>(null);
  const [receiveAddress, setReceiveAddress] = useState<{
    address: string;
    ephemeralPubKey: string;
    viewTag: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'receive' | 'send' | 'privacy'>('receive');

  // Initialize on mount
  useEffect(() => {
    if (address && !profile) {
      initialize();
    }
  }, [address, profile, initialize]);

  const handleGenerateReceiveAddress = useCallback(async () => {
    try {
      const addr = await getReceiveAddress();
      setReceiveAddress(addr);
      toast.success('New stealth address generated');
    } catch (err) {
      toast.error('Failed to generate address');
      console.error(err);
    }
  }, [getReceiveAddress]);

  const handleCreatePaymentAddress = useCallback(async () => {
    if (!recipientMetaAddress) {
      toast.error('Please enter recipient stealth meta-address');
      return;
    }

    try {
      const addr = await createPaymentAddress(recipientMetaAddress);
      setGeneratedAddress(addr);
      toast.success('Payment address created');
    } catch (err) {
      toast.error('Invalid meta-address or failed to create address');
      console.error(err);
    }
  }, [recipientMetaAddress, createPaymentAddress]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={initialize}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Private Payments</h2>
          <p className="text-sm text-muted-foreground">
            Use stealth addresses for enhanced privacy
          </p>
        </div>
        {privacyScore && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Privacy Score</div>
              <div className="text-lg font-bold text-primary">{privacyScore.score}/100</div>
            </div>
            <PrivacyScoreRing score={privacyScore.score} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['receive', 'send', 'privacy'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Receive Tab */}
      {activeTab === 'receive' && (
        <div className="space-y-4">
          {/* Your Stealth Meta-Address */}
          <div className="bg-card rounded-xl p-4 border">
            <h4 className="font-medium mb-2">Your Stealth Meta-Address</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Share this with senders so they can pay you privately
            </p>
            {encodedMetaAddress ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted p-2 rounded text-xs font-mono break-all">
                  {encodedMetaAddress}
                </code>
                <button
                  onClick={() => copyToClipboard(encodedMetaAddress, 'Meta-address')}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  aria-label="Copy meta-address"
                >
                  <CopyIcon />
                </button>
              </div>
            ) : (
              <button
                onClick={initialize}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
              >
                Generate Stealth Identity
              </button>
            )}
          </div>

          {/* Generate One-Time Address */}
          <div className="bg-card rounded-xl p-4 border">
            <h4 className="font-medium mb-2">Generate One-Time Receive Address</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Each address can only be used once for maximum privacy
            </p>
            <button
              onClick={handleGenerateReceiveAddress}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Generate New Address
            </button>

            {receiveAddress && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-sm font-medium text-green-500 mb-2">
                  ✓ Stealth Address Generated
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <code className="ml-2 font-mono">{receiveAddress.address}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">View Tag:</span>
                    <code className="ml-2 font-mono">{receiveAddress.viewTag}</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send Tab */}
      {activeTab === 'send' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4 border">
            <h4 className="font-medium mb-2">Send Private Payment</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Enter the recipient&apos;s stealth meta-address to generate a one-time payment address
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Recipient Meta-Address
                </label>
                <textarea
                  value={recipientMetaAddress}
                  onChange={(e) => setRecipientMetaAddress(e.target.value)}
                  placeholder="st:eth:0x..."
                  className="w-full p-3 bg-muted border border-border rounded-lg text-sm font-mono resize-none h-20"
                />
              </div>

              <button
                onClick={handleCreatePaymentAddress}
                disabled={!recipientMetaAddress}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Generate Payment Address
              </button>

              {generatedAddress && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
                  <div className="text-sm font-medium text-green-500">
                    ✓ Payment Address Created
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Send funds to:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted p-2 rounded text-xs font-mono break-all">
                        {generatedAddress.address}
                      </code>
                      <button
                        onClick={() => copyToClipboard(generatedAddress.address, 'Address')}
                        className="p-2 bg-primary text-primary-foreground rounded-lg"
                        aria-label="Copy address"
                      >
                        <CopyIcon />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <strong>Important:</strong> Include the following data in the transaction&apos;s
                    announcement log so the recipient can detect the payment:
                  </div>

                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Ephemeral Key:</span>
                      <code className="ml-2 font-mono text-[10px]">
                        {generatedAddress.ephemeralPubKey.slice(0, 32)}...
                      </code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">View Tag:</span>
                      <code className="ml-2 font-mono">{generatedAddress.viewTag}</code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && privacyScore && (
        <div className="space-y-4">
          {/* Score Details */}
          <div className="bg-card rounded-xl p-4 border">
            <h4 className="font-medium mb-4">Privacy Score Breakdown</h4>
            <div className="space-y-4">
              {Object.entries(privacyScore.factors).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span>{value.toFixed(0)}/100</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {privacyScore.recommendations.length > 0 && (
            <div className="bg-card rounded-xl p-4 border">
              <h4 className="font-medium mb-3">Improve Your Privacy</h4>
              <ul className="space-y-2">
                {privacyScore.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <ShieldIcon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Privacy Tips */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <h4 className="font-medium text-primary mb-2">Privacy Best Practices</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use a new stealth address for each transaction</li>
              <li>• Never reuse addresses or link them publicly</li>
              <li>• Wait random intervals between transactions</li>
              <li>• Consider using privacy-focused networks</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="h-32 bg-muted rounded-xl animate-pulse" />
      <div className="h-48 bg-muted rounded-xl animate-pulse" />
    </div>
  );
}

function PrivacyScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  
  return (
    <div className="relative w-12 h-12">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/20"
        />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${score * 0.94} 94`}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function ShieldIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
