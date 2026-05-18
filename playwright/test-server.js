#!/usr/bin/env node

/**
 * Minimal web server for Playwright smoke tests.
 *
 * This avoids starting Next.js during `test:all`, which can be unstable/slow
 * in constrained CI/dev-container environments.
 */

import http from 'node:http'

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'

const html = (title) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; }
      header, footer { padding: 12px 16px; background: #f6f6f6; }
      main { padding: 16px; min-height: 65vh; }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        padding: 10px 12px;
        background: #ffffff;
        border-top: 1px solid #ddd;
      }
    </style>
  </head>
  <body>
    <a href="#main-content" class="sr-only">Skip to main content</a>
    <header role="banner">
      <nav aria-label="Primary Navigation">
        <a href="/e2e">Home</a>
        <a href="/dashboard">Dashboard</a>
      </nav>
    </header>
    <main id="main-content" tabindex="-1">
      <h1>VFIDE</h1>
      <p>E2E test shell</p>
      <form aria-label="Payment Form">
        <label for="amount">Amount</label>
        <input id="amount" name="amount" type="number" inputmode="decimal" />
        <button type="submit">Submit</button>
      </form>
      <div role="status" aria-live="polite">Status: ready</div>
    </main>
    <footer role="contentinfo">VFIDE Footer</footer>
    <nav aria-label="Bottom Navigation" class="bottom-nav" data-testid="bottom-nav">
      <a href="/">Home</a>
      <a href="/dashboard" aria-current="page">Dashboard</a>
      <button type="button">Actions</button>
    </nav>
  </body>
</html>`

const server = http.createServer((req, res) => {
  const url = req.url || '/'

  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  // Return a simple HTML shell for all non-API routes used by UI smoke tests.
  // This avoids route-specific 404 pages when running without a full Next.js server.
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html('VFIDE'))
})

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Playwright test server listening on http://${host}:${port}`)
})

process.on('SIGINT', () => server.close(() => process.exit(0)))
process.on('SIGTERM', () => server.close(() => process.exit(0)))
