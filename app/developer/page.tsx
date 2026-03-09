'use client';

import React, { useState } from 'react';

const SDK_CODE_SNIPPET = `// Install: npm install @vfide/sdk

import { VFIDEWidget } from '@vfide/sdk';

// 1. Embed a payment button
<VFIDEWidget.PaymentButton
  to="0x1234..."
  amount="0.01"
  token="ETH"
  onSuccess={(tx) => console.log('Paid!', tx)}
/>

// 2. Request payment via API
const payment = await VFIDE.requestPayment({
  to: merchantAddress,
  amount: '10.00',
  token: 'USDC',
  metadata: { orderId: '12345' }
});

// 3. Create streaming payment
const stream = await VFIDE.createStream({
  to: recipientAddress,
  amount: '100',
  token: 'USDC',
  duration: 30 * 24 * 60 * 60 // 30 days
});

// 4. Verify payment
const verified = await VFIDE.verifyPayment(txHash);`;

const WEBHOOK_CODE = `// Webhook endpoint example (Node.js)
app.post('/webhooks/vfide', (req, res) => {
  const { event, data, signature } = req.body;
  
  // Verify webhook signature
  if (!VFIDE.verifyWebhook(signature, req.body)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  switch (event) {
    case 'payment.completed':
      // Handle successful payment
      fulfillOrder(data.metadata.orderId);
      break;
    case 'stream.started':
      // Handle stream creation
      activateSubscription(data.streamId);
      break;
    case 'stream.depleted':
      // Handle stream ending
      pauseSubscription(data.streamId);
      break;
  }
  
  res.json({ received: true });
});`;

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<'sdk' | 'webhooks' | 'api'>('sdk');
  const [apiKey] = useState('vfide_pk_test_xxxxxxxxxxxx');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const onCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Developer Tools</h1>
        <p className="text-muted-foreground">Integrate VFIDE payments into your app</p>
      </div>

      {/* API Key */}
      <div className="bg-card rounded-xl p-4 border">
        <h3 className="font-medium mb-3">API Key</h3>
        <p className="text-xs text-amber-500 mb-3">Demo key for local/testing UI only.</p>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              readOnly
              aria-label="Developer demo API key"
              className="w-full p-3 bg-muted border border-border rounded-lg font-mono text-sm"
            />
          </div>
          <button
            onClick={() => setShowKey(!showKey)}
            className="px-4 py-2 bg-muted rounded-lg text-sm"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={onCopyApiKey}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Use a real server-issued key in production.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['sdk', 'webhooks', 'api'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {tab === 'sdk' ? 'SDK' : tab}
          </button>
        ))}
      </div>

      {/* SDK Tab */}
      {activeTab === 'sdk' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4 border">
            <h3 className="font-medium mb-2">Quick Start</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>{SDK_CODE_SNIPPET}</code>
            </pre>
            <button className="mt-3 px-4 py-2 bg-muted rounded-lg text-sm">
              📋 Copy Code
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-4 border">
              <div className="text-2xl mb-2">🔘</div>
              <h4 className="font-medium">Payment Buttons</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Drop-in components for one-click payments
              </p>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="text-2xl mb-2">🔄</div>
              <h4 className="font-medium">Streaming</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Create subscriptions with per-second payments
              </p>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="text-2xl mb-2">🔐</div>
              <h4 className="font-medium">Escrow</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Conditional payments with programmable release
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4 border">
            <h3 className="font-medium mb-3">Webhook URL</h3>
            <input
              type="text"
              placeholder="https://yourapp.com/webhooks/vfide"
              className="w-full p-3 bg-muted border border-border rounded-lg font-mono text-sm"
            />
            <button className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
              Save Webhook
            </button>
          </div>

          <div className="bg-card rounded-xl p-4 border">
            <h3 className="font-medium mb-2">Example Handler</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>{WEBHOOK_CODE}</code>
            </pre>
          </div>

          <div className="bg-card rounded-xl p-4 border">
            <h3 className="font-medium mb-3">Event Types</h3>
            <div className="space-y-2">
              {[
                { event: 'payment.completed', desc: 'A payment was confirmed on-chain' },
                { event: 'payment.failed', desc: 'A payment transaction failed' },
                { event: 'stream.started', desc: 'A new streaming payment began' },
                { event: 'stream.depleted', desc: 'A stream ran out of funds' },
                { event: 'escrow.released', desc: 'Escrow funds were released' },
                { event: 'escrow.refunded', desc: 'Escrow was refunded to sender' },
              ].map((item) => (
                <div key={item.event} className="flex justify-between p-2 bg-muted rounded-lg">
                  <code className="text-sm font-mono text-primary">{item.event}</code>
                  <span className="text-sm text-muted-foreground">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4 border">
            <h3 className="font-medium mb-3">REST API Endpoints</h3>
            <div className="space-y-3">
              {[
                { method: 'POST', path: '/v1/payments', desc: 'Create a payment request' },
                { method: 'GET', path: '/v1/payments/:id', desc: 'Get payment status' },
                { method: 'POST', path: '/v1/streams', desc: 'Create a streaming payment' },
                { method: 'GET', path: '/v1/streams/:id', desc: 'Get stream details' },
                { method: 'DELETE', path: '/v1/streams/:id', desc: 'Cancel a stream' },
                { method: 'POST', path: '/v1/escrow', desc: 'Create conditional escrow' },
                { method: 'POST', path: '/v1/escrow/:id/release', desc: 'Release escrow funds' },
              ].map((endpoint) => (
                <div key={endpoint.path} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                    endpoint.method === 'POST'
                      ? 'bg-green-500/20 text-green-500'
                      : endpoint.method === 'DELETE'
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-blue-500/20 text-blue-500'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-sm font-mono flex-1">{endpoint.path}</code>
                  <span className="text-sm text-muted-foreground">{endpoint.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border">
            <h3 className="font-medium mb-2">Rate Limits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">1,000</div>
                <div className="text-sm text-muted-foreground">Requests/minute (test)</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">10,000</div>
                <div className="text-sm text-muted-foreground">Requests/minute (prod)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resources */}
      <div className="grid md:grid-cols-3 gap-4">
        <a href="/docs" className="bg-card rounded-xl p-4 border hover:border-primary transition-colors">
          <div className="text-2xl mb-2">📚</div>
          <h4 className="font-medium">Documentation</h4>
          <p className="text-sm text-muted-foreground">Full API reference</p>
        </a>
        <a href="https://github.com/Scorpio861104/Vfide" target="_blank" rel="noopener noreferrer" className="bg-card rounded-xl p-4 border hover:border-primary transition-colors">
          <div className="text-2xl mb-2">💻</div>
          <h4 className="font-medium">GitHub</h4>
          <p className="text-sm text-muted-foreground">Open source SDK</p>
        </a>
        <a href="https://discord.gg/vfide" target="_blank" rel="noopener noreferrer" className="bg-card rounded-xl p-4 border hover:border-primary transition-colors">
          <div className="text-2xl mb-2">💬</div>
          <h4 className="font-medium">Discord</h4>
          <p className="text-sm text-muted-foreground">Developer community</p>
        </a>
      </div>
    </div>
  );
}
