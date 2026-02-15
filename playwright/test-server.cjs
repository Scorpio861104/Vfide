#!/usr/bin/env node

/**
 * Minimal web server for Playwright smoke tests.
 *
 * This avoids starting Next.js during `test:all`, which can be unstable/slow
 * in constrained CI/dev-container environments.
 */

const http = require('http')

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'

const html = (title, body) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      .skip-link { position: absolute; left: -9999px; }
      .skip-link:focus { left: 8px; top: 8px; background: #fff; color: #000; padding: 4px 8px; }
    </style>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <nav aria-label="E2E Navigation">
      <a href="/e2e">Home</a>
      <a href="/dashboard">Dashboard</a>
      <a href="/about">About</a>
    </nav>
    <main id="main-content" tabindex="-1">
      ${body}
    </main>
  </body>
</html>`

const homeBody = `
  <h1>VFIDE</h1>
  <p>Playwright test page.</p>
  <form aria-label="Contact">
    <label for="email">Email</label>
    <input id="email" type="email" name="email" />
    <button type="submit">Submit</button>
  </form>
`

const dashboardBody = `
  <h1>Dashboard</h1>
  <div role="status" aria-live="polite">Status: ready</div>
`

const aboutBody = `
  <h1>About</h1>
  <p>VFIDE platform overview.</p>
`

const server = http.createServer((req, res) => {
  const url = req.url || '/'

  if (url === '/' || url === '/e2e') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html('VFIDE', homeBody))
    return
  }

  if (url === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html('Dashboard', dashboardBody))
    return
  }

  if (url === '/about') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html('About', aboutBody))
    return
  }

  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not Found')
})

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Playwright test server listening on http://${host}:${port}`)
})

process.on('SIGINT', () => server.close(() => process.exit(0)))
process.on('SIGTERM', () => server.close(() => process.exit(0)))
