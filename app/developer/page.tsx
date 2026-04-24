'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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

const WEBHOOK_CODE = `import crypto from 'node:crypto';
import express from 'express';

const app = express();
app.use('/webhooks/vfide', express.raw({ type: '*/*' }));

function verifyWebhook(body, signature, timestampHeader, secret) {
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) return false;

  const expected = 'v1=' + crypto.createHmac('sha256', secret).update(timestamp + '.' + body).digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.post('/webhooks/vfide', (req, res) => {
  const signature = req.header('X-Webhook-Signature');
  const timestamp = req.header('X-Webhook-Timestamp');

  if (!signature || !timestamp || !verifyWebhook(req.body, signature, timestamp, process.env.VFIDE_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(req.body.toString('utf8'));

  switch (payload.event) {
    case 'payment.completed':
      fulfillOrder(payload.data.order_number);
      break;
    case 'refund.completed':
      updateRefundState(payload.data);
      break;
    case 'subscription.renewed':
      extendSubscription(payload.data);
      break;
  }

  return res.json({ received: true });
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
            <h3 className="font-medium mb-3">Merchant Webhook Setup</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Register and rotate webhook endpoints in Merchant Portal. VFIDE delivers signed HTTPS POST requests to your server for the events you subscribe to.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/merchant" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
                Open Merchant Portal
              </Link>
              <Link href="/security-center" className="inline-flex items-center justify-center rounded-lg bg-muted px-4 py-2 text-sm">
                Review Replay Protection
              </Link>
            </div>
            <div className="mt-4 rounded-lg border bg-muted p-3 text-xs sm:text-sm">
              <div className="font-medium mb-2">Management API</div>
              <code className="block break-all">GET /api/merchant/webhooks</code>
              <code className="block break-all">POST /api/merchant/webhooks</code>
              <code className="block break-all">PATCH /api/merchant/webhooks</code>
              <code className="block break-all">DELETE /api/merchant/webhooks?id=&lt;endpointId&gt;</code>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border">
            <h3 className="font-medium mb-2">Example Handler</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Verify the raw request body using the signing secret created in Merchant Portal. Current deliveries include the <code>X-Webhook-Signature</code> and <code>X-Webhook-Timestamp</code> headers.
            </p>
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
                { event: 'refund.completed', desc: 'A refund finished successfully' },
                { event: 'escrow.released', desc: 'Escrow funds were released' },
                { event: 'subscription.renewed', desc: 'A subscription cycle renewed' },
                { event: 'subscription.payment_failed', desc: 'A subscription renewal payment failed' },
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
                <div key={`${endpoint.method}-${endpoint.path}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 bg-muted rounded-lg min-w-0">
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
