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

const html = (title) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>
    <nav aria-label="E2E Navigation">
      <a href="/e2e">Home</a>
    </nav>
    <main>
      <h1>VFIDE</h1>
    </main>
  </body>
</html>`

const server = http.createServer((req, res) => {
  const url = req.url || '/'

  if (url === '/' || url === '/e2e') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html('VFIDE'))
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
