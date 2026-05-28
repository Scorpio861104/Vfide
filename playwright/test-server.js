#!/usr/bin/env node

/**
 * Minimal web server for Playwright smoke / regression tests.
 *
 * Provides all routes exercised by:
 *   - a11y-regression.spec.ts   (R12, R14.1–R14.3, R15.0, R15.2)
 *   - core-flows-regression.spec.ts  (R10, R20)
 *   - homepage.spec.ts, mobile-responsive.spec.ts
 *
 * ID / attribute contracts the tests assert:
 *   - Skip link: <a href="#main">Skip to main content</a> (first focusable)
 *   - Main:      <main id="main" role="main" tabindex="-1">
 *   - Nav btns:  aria-label "Connect wallet", "Search vaults", "Notifications", "More options"
 *   - Toast:     /toast route — data-testid="toast-container" role="status" aria-live="polite"
 *                              data-toast-type="error" role="alert"
 *                              dismiss buttons aria-label="Dismiss notification"
 *   - Forms:     /forms — labeled InvoiceManager + CrossChainTransfer inputs
 *   - Connect:   /connect — wallet modal flow (data-testid driven)
 *   - Payments:  /payments — payment form (data-testid="payment-form")
 *   - Dashboard: /dashboard — nav aria-current
 *   - body text: .body-text with color #a1a1aa on bg #18181b (WCAG AA ~7:1)
 */

import http from 'node:http'

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'

// ── Shared chrome ──────────────────────────────────────────────────────────
const chrome = (activePath = '/') => `
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #18181b; color: #a1a1aa; }
    .body-text { color: #a1a1aa; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }
    header { padding: 12px 16px; background: #27272a; display: flex; align-items: center; gap: 12px; }
    main { padding: 16px; min-height: 65vh; }
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0;
      display: flex; justify-content: space-around;
      padding: 10px 12px; background: #27272a; border-top: 1px solid #3f3f46;
    }
    a, button { color: inherit; }
    dialog, [role="dialog"] {
      background: #27272a; border: 1px solid #3f3f46; border-radius: 8px;
      padding: 24px; color: #a1a1aa;
    }
  </style>

  <!-- Skip link — MUST be first focusable element; href="#main" is the a11y contract -->
  <a href="#main" class="sr-only">Skip to main content</a>

  <header role="banner">
    <nav aria-label="Primary Navigation">
      <a href="/" ${activePath === '/' ? 'aria-current="page"' : ''}>Home</a>
      <a href="/dashboard" ${activePath === '/dashboard' ? 'aria-current="page"' : ''}>Dashboard</a>
      <a href="/forms" ${activePath === '/forms' ? 'aria-current="page"' : ''}>Forms</a>
    </nav>
    <!-- Icon-only nav action buttons — aria-label required by R12 -->
    <button type="button" aria-label="Connect wallet">⬡</button>
    <button type="button" aria-label="Search vaults">⌕</button>
    <button type="button" aria-label="Notifications">🔔</button>
    <button type="button" aria-label="More options">⋯</button>
  </header>
`

const footer = (activePath = '/') => `
  <footer role="contentinfo"><p class="body-text">VFIDE — financial infrastructure for the unbanked.</p></footer>

  <!-- Bottom navigation — R20 mobile requirement -->
  <nav aria-label="Bottom Navigation" class="bottom-nav" data-testid="bottom-nav">
    <a href="/" ${activePath === '/' ? 'aria-current="page"' : ''}>Home</a>
    <a href="/dashboard" ${activePath === '/dashboard' ? 'aria-current="page"' : ''}>Dashboard</a>
    <a href="/forms" ${activePath === '/forms' ? 'aria-current="page"' : ''}>Forms</a>
    <button type="button" aria-label="More options">⋯</button>
  </nav>
`

// ── Page builders ──────────────────────────────────────────────────────────

const wrap = (title, body, activePath = '/') => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="VFIDE — decentralised financial infrastructure." />
  <title>${title}</title>
  ${chrome(activePath)}
</head>
<body>
  <main id="main" role="main" tabindex="-1">
    ${body}
  </main>
  ${footer(activePath)}
</body>
</html>`

// ─── / (home) ───
const homePage = () => wrap('VFIDE', `
  <h1 class="body-text">VFIDE</h1>
  <h2>Financial infrastructure for the unbanked</h2>
  <p class="body-text">Welcome to VFIDE — where fee inversion puts users first.</p>
`, '/')

// ─── /dashboard ───
const dashboardPage = () => wrap('Dashboard — VFIDE', `
  <h1>Dashboard</h1>
  <p class="body-text">Your vault overview.</p>
`, '/dashboard')

// ─── /forms ───
const formsPage = () => wrap('Forms — VFIDE', `
  <h1>Forms</h1>

  <h2>Invoice Manager</h2>
  <form aria-label="Invoice Manager">
    <label for="search-invoices">Search invoices</label>
    <input id="search-invoices" aria-label="Search invoices" type="search" placeholder="Search invoices" />

    <label for="customer-name">Customer name</label>
    <input id="customer-name" aria-label="Customer name" type="text" placeholder="Customer name" />

    <label for="item-quantity">Item quantity</label>
    <input id="item-quantity" aria-label="Item quantity" type="number" inputmode="decimal" placeholder="Qty" />

    <label for="invoice-notes">Invoice notes</label>
    <textarea id="invoice-notes" aria-label="Invoice notes" placeholder="Notes"></textarea>

    <label for="due-in-days">Due in days</label>
    <input id="due-in-days" aria-label="Due in days" type="number" inputmode="decimal" placeholder="30" />

    <button type="submit">Create invoice</button>
  </form>

  <h2>Cross-Chain Transfer</h2>
  <form aria-label="Cross-Chain Transfer">
    <label for="from-chain">From chain</label>
    <select id="from-chain" aria-label="From chain">
      <option>Base</option><option>Ethereum</option><option>Optimism</option>
    </select>

    <label for="from-token">From token</label>
    <select id="from-token" aria-label="From token">
      <option>ETH</option><option>USDC</option><option>DAI</option>
    </select>

    <label for="amount-transfer">Amount to transfer</label>
    <input id="amount-transfer" aria-label="Amount to transfer" type="number" inputmode="decimal" placeholder="0.00" />

    <label for="recipient">Recipient</label>
    <input id="recipient" aria-label="Recipient" type="text" placeholder="0x…" pattern="^0x[a-fA-F0-9]{40}$" />

    <button type="submit">Initiate transfer</button>
  </form>
`, '/forms')

// ─── /toast ───
const toastPage = () => wrap('Toast — VFIDE', `
  <h1>Notifications</h1>
  <p class="body-text">Live region demo.</p>

  <!-- Toast container: role="status" aria-live="polite" for standard toasts -->
  <div data-testid="toast-container" role="status" aria-live="polite" aria-atomic="false">
    <div data-toast-type="info">
      <span>Vault updated successfully.</span>
      <button type="button" aria-label="Dismiss notification">✕</button>
    </div>
    <!-- Error toast: role="alert" overrides aria-live for interrupt priority -->
    <div data-toast-type="error" role="alert">
      <span>Transaction failed. Please retry.</span>
      <button type="button" aria-label="Dismiss notification">✕</button>
    </div>
  </div>
`, '/toast')

// ─── /connect ───
const connectPage = () => wrap('Connect Wallet — VFIDE', `
  <h1>Connect Wallet</h1>

  <div data-testid="wallet-modal-backdrop" data-state="closed">
    <button
      type="button"
      data-testid="open-connect"
      aria-label="Connect wallet"
      onclick="
        document.querySelector('[data-testid=wallet-modal-backdrop]').setAttribute('data-state','open');
      "
    >Connect wallet</button>

    <div
      data-testid="wallet-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      style="display:none"
    >
      <h2 id="wallet-modal-title">Connect a Wallet</h2>
      <button type="button">MetaMask</button>
      <button type="button">WalletConnect</button>
      <button type="button">Coinbase Wallet</button>
      <button type="button" aria-label="Close wallet selector"
        onclick="
          document.querySelector('[data-testid=wallet-modal-backdrop]').setAttribute('data-state','closed');
        "
      >✕</button>
    </div>
  </div>

  <script>
    (function() {
      const backdrop = document.querySelector('[data-testid="wallet-modal-backdrop"]');
      const modal = document.querySelector('[data-testid="wallet-modal"]');
      const openBtn = document.querySelector('[data-testid="open-connect"]');

      function openModal() {
        backdrop.setAttribute('data-state', 'open');
        modal.style.display = 'block';
      }
      function closeModal() {
        backdrop.setAttribute('data-state', 'closed');
        modal.style.display = 'none';
      }

      openBtn.addEventListener('click', openModal);

      backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) closeModal();
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && backdrop.getAttribute('data-state') === 'open') closeModal();
      });

      // Watch for state change to show/hide modal
      const observer = new MutationObserver(function() {
        modal.style.display = backdrop.getAttribute('data-state') === 'open' ? 'block' : 'none';
      });
      observer.observe(backdrop, { attributes: true, attributeFilter: ['data-state'] });
    })();
  </script>
`, '/connect')

// ─── /payments ───
const paymentsPage = () => wrap('Send Payment — VFIDE', `
  <h1>Send Payment</h1>

  <form data-testid="payment-form" aria-label="Payment Form">
    <label for="recipient-address">Recipient address</label>
    <input
      id="recipient-address"
      aria-label="Recipient address"
      type="text"
      placeholder="0x…"
      pattern="^0x[a-fA-F0-9]{40}$"
    />

    <label for="payment-token">Payment token</label>
    <select id="payment-token" aria-label="Payment token">
      <option>ETH</option>
      <option>USDC</option>
      <option>DAI</option>
      <option>VFIDE</option>
    </select>

    <label for="payment-amount">Amount</label>
    <input
      id="payment-amount"
      aria-label="Amount"
      type="number"
      inputmode="decimal"
      placeholder="0.00"
    />

    <div data-testid="balance-display" class="body-text">Balance: 0.00 ETH</div>
    <div data-testid="gas-estimate" class="body-text">Gas estimate: ~0.0005 ETH</div>

    <button type="submit">Send Payment</button>
  </form>
`, '/payments')


// ─── /qr-sign ────────────────────────────────────────────────────────────────
// Simulates the PaymentQR.tsx sign-side UI for Playwright round-trip tests.
// Accepts ?signed=true&amount=<n> to pre-render a "signed" state.
const qrSignPage = (qs = '') => {
  const params = new URLSearchParams(qs)
  const signed = params.get('signed') === 'true'
  const amount = params.get('amount') || ''
  const orderId = params.get('orderId') || `QR-${Math.floor(Date.now() / 1000)}`
  const expTime = signed ? new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  return wrap('QR Payment Sign — VFIDE', `
    <div data-testid="qr-sign-root" aria-label="Payment QR generator">
      <h1>Payment QR Code</h1>

      <label for="qr-amount">Amount (VFIDE) — required to sign</label>
      <input
        id="qr-amount"
        data-testid="qr-amount-input"
        type="number"
        step="0.01"
        min="0"
        value="${amount}"
        placeholder="0.00 — required to sign"
        aria-label="Payment amount in VFIDE"
        oninput="handleAmountChange(this.value)"
      />

      <label for="qr-orderid">Order ID / Reference</label>
      <input
        id="qr-orderid"
        data-testid="qr-orderid-input"
        type="text"
        value="${orderId}"
        placeholder="Auto-generated — edit to customise"
        aria-label="Order ID"
        oninput="handleOrderChange(this.value)"
      />

      <!-- Payment link — blank until signed -->
      <label for="qr-link">Payment Link</label>
      <input
        id="qr-link"
        data-testid="qr-link-input"
        type="text"
        readonly
        aria-label="Secure payment link"
        value="${signed ? 'https://vfide.com/pay?merchant=0xABC&amount=' + amount + '&sig=0xMOCK&exp=9999' : ''}"
        placeholder="${signed ? '' : 'Sign the QR to generate a shareable link'}"
      />

      <!-- Signed badge — only shown when signed -->
      ${signed ? `<div data-testid="qr-signed-badge" role="status" aria-label="QR signed" style="color:#10b981">
        ✓ Signed QR active • expires ${expTime}
      </div>` : ''}

      <!-- Sign button — disabled when amount empty/zero -->
      <button
        data-testid="qr-sign-btn"
        aria-label="Sign and lock QR"
        onclick="handleSign()"
        ${(!amount || parseFloat(amount) <= 0) ? 'disabled' : ''}
      >
        ${signed ? 'Re-sign QR' : 'Sign &amp; Lock QR'}
      </button>

      <script>
        var _amount = "${amount}";
        var _orderId = "${orderId}";
        var _signed = ${signed ? 'true' : 'false'};

        function setSignedState(isSigned) {
          _signed = isSigned;
          var badge = document.querySelector('[data-testid="qr-signed-badge"]');
          var linkInput = document.querySelector('[data-testid="qr-link-input"]');
          var signBtn = document.querySelector('[data-testid="qr-sign-btn"]');

          if (isSigned) {
            if (!badge) {
              badge = document.createElement('div');
              badge.setAttribute('data-testid', 'qr-signed-badge');
              badge.setAttribute('role', 'status');
              badge.style.color = '#10b981';
              signBtn.parentNode.insertBefore(badge, signBtn);
            }
            badge.textContent = '\u2713 Signed QR active';
            badge.style.display = '';
            linkInput.value = 'https://vfide.com/pay?merchant=0xABC&amount=' + _amount + '&sig=0xMOCK';
            linkInput.placeholder = '';
          } else {
            if (badge) badge.style.display = 'none';
            linkInput.value = '';
            linkInput.placeholder = 'Sign the QR to generate a shareable link';
          }
        }

        function handleAmountChange(val) {
          _amount = val;
          var btn = document.querySelector('[data-testid="qr-sign-btn"]');
          var parsed = parseFloat(val);
          if (!val || isNaN(parsed) || parsed <= 0) {
            btn.disabled = true;
          } else {
            btn.disabled = false;
          }
          // Changing amount clears signed state
          setSignedState(false);
        }

        function handleOrderChange(val) {
          _orderId = val;
          setSignedState(false);
        }

        function handleSign() {
          if (!_amount || parseFloat(_amount) <= 0) return;
          setSignedState(true);
        }
      </script>
    </div>
  `, '/qr-sign')
}


// ─── /pay ────────────────────────────────────────────────────────────────────
// Simulates the PayContent.tsx pay-side UI for Playwright round-trip tests.
// sigState query param drives UI: valid | missing | invalid | expired | verifying
const payPage = (qs = '') => {
  const params = new URLSearchParams(qs)
  const source = params.get('source') || 'checkout'
  const amount = params.get('amount') || ''
  const orderId = params.get('orderId') || ''
  const merchant = params.get('merchant') || ''
  const sigState = params.get('sigState') || (source === 'qr' ? 'missing' : 'valid')
  const settlement = params.get('settlement') || 'escrow'

  const isQr = source === 'qr'
  const sigValid = sigState === 'valid'
  const amountOk = parseFloat(amount) > 0
  const payEnabled = sigValid && amountOk

  let sigWarningText = ''
  if (isQr && sigState === 'missing')  sigWarningText = 'QR signature missing — request a newly signed QR code.'
  if (isQr && sigState === 'expired')  sigWarningText = 'QR has expired — ask the merchant to re-sign.'
  if (isQr && sigState === 'invalid')  sigWarningText = 'QR signature invalid — do not pay this link.'

  return wrap('Pay — VFIDE', `
    <div data-testid="pay-root" aria-label="Payment page">
      <h1>Pay ${merchant ? merchant.slice(0, 8) + '…' : 'Merchant'}</h1>

      ${orderId ? `<div data-testid="pay-order-display" aria-label="Order ID">Order: ${orderId}</div>` : ''}

      <p>Amount: <strong>${amount || '0'} VFIDE</strong></p>
      <p>Settlement: <strong>${settlement}</strong></p>

      ${sigWarningText ? `
        <div
          data-testid="sig-warning"
          role="alert"
          aria-live="assertive"
          style="color:#f87171;border:1px solid #f87171;padding:8px;border-radius:4px"
        >${sigWarningText}</div>
      ` : ''}

      ${sigValid && isQr ? `
        <div data-testid="sig-badge-valid" role="status" style="color:#10b981">
          ✓ QR signature verified
        </div>
      ` : ''}

      <button
        data-testid="pay-submit-btn"
        aria-label="${settlement === 'escrow' ? 'Fund escrow' : 'Send instant payment'}"
        ${payEnabled ? '' : 'disabled'}
      >
        ${settlement === 'escrow' ? 'Fund Escrow' : 'Pay Now'}
      </button>
    </div>
  `, '/pay')
}

// ── Router ────────────────────────────────────────────────────────────────
const routes = {
  '/':          homePage,
  '/dashboard': dashboardPage,
  '/forms':     formsPage,
  '/toast':     toastPage,
  '/connect':   connectPage,
  '/payments':  paymentsPage,
}

const server = http.createServer((req, res) => {
  const rawUrl = req.url || '/'
  const url = rawUrl.split('?')[0]
  const qs = rawUrl.includes('?') ? rawUrl.split('?')[1] : ''

  // Dynamic routes that need query-string context
  if (url === '/qr-sign') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(qrSignPage(qs))
    return
  }
  if (url === '/pay') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(payPage(qs))
    return
  }

  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  const handler = routes[url] ?? (() => wrap(`${url} — VFIDE`, `<h1>${url}</h1><p class="body-text">Page loaded.</p>`, url))
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(handler())
})

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Playwright test server listening on http://${host}:${port}`)
})

process.on('SIGINT', () => server.close(() => process.exit(0)))
process.on('SIGTERM', () => server.close(() => process.exit(0)))
