'use client';

import React, { useState } from 'react';

const SDK_CODE_SNIPPET = `// Example checkout widget

import { VFIDEWidget } from '@vfide/sdk';

// 1. Embed a payment button
<VFIDEWidget.PaymentButton
  to="0x1234..."
  amount="0.01"
  token="ETH"
  onSuccess={(tx) => handlePaymentSuccess(tx)}
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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 pt-20 pb-24 md:pb-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrations Center</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Connect checkout, subscriptions, and payout flows with clear guides and safe defaults.
        </p>
      </div>

      {/* Access */}
      <div className="bg-card rounded-xl p-4 border">
        <h3 className="font-medium mb-2">Access & Safety</h3>
        <p className="text-sm text-muted-foreground">
          Keys and secrets are issued from secure merchant settings only. This page does not expose live credentials.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a href="/merchant" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
            Open Merchant Portal
          </a>
          <a href="/security-center" className="inline-flex items-center justify-center rounded-lg bg-muted px-4 py-2 text-sm">
            Review Security Center
          </a>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Never share keys in chat, screenshots, client code, or browser storage.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(['sdk', 'webhooks', 'api'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${
              activeTab === tab
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/50 text-muted-foreground'
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
            <h3 className="font-medium mb-2">Checkout Quick Start</h3>
            <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto text-xs sm:text-sm font-mono">
              <code>{SDK_CODE_SNIPPET}</code>
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">If code looks crowded on mobile, swipe horizontally inside the snippet.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
             
              className="w-full p-3 bg-muted border border-border rounded-lg font-mono text-xs sm:text-sm"
             aria-label="https://yourapp.com/webhooks/vfide" />
            <button className="mt-3 w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
              Save Webhook
            </button>
          </div>

          <div className="bg-card rounded-xl p-4 border">
            <h3 className="font-medium mb-2">Example Handler</h3>
            <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto text-xs sm:text-sm font-mono">
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
                <div key={item.event} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-2 bg-muted rounded-lg">
                  <code className="text-xs sm:text-sm font-mono text-primary break-all">{item.event}</code>
                  <span className="text-xs sm:text-sm text-muted-foreground">{item.desc}</span>
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
                <div key={endpoint.path} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 bg-muted rounded-lg min-w-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                    endpoint.method === 'POST'
                      ? 'bg-green-500/20 text-green-500'
                      : endpoint.method === 'DELETE'
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-blue-500/20 text-blue-500'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-xs sm:text-sm font-mono break-all sm:flex-1">{endpoint.path}</code>
                  <span className="text-xs sm:text-sm text-muted-foreground">{endpoint.desc}</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <p className="text-sm text-muted-foreground">Community support</p>
        </a>
      </div>
    </div>
  );
}
