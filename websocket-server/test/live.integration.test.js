const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { execSync } = require('node:child_process');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const JWT_SECRET = 'ws-test-secret';
const ALLOWED_ORIGIN = 'http://allowed.test';
const DISALLOWED_ORIGIN = 'http://blocked.test';
const AUTH_TIMEOUT_MS = 200;
const ACL_REFRESH_MS = 100;

let serverProcess;
let wsUrl;
let aclPath;
let serverPort;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = address && typeof address === 'object' ? address.port : null;
      srv.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        if (!port) {
          reject(new Error('Failed to allocate free port'));
          return;
        }
        resolve(port);
      });
    });
  });
}

function createAcl(grants) {
  return JSON.stringify(
    {
      version: 1,
      updatedAt: new Date().toISOString(),
      grants,
    },
    null,
    2,
  );
}

function writeAcl(grants) {
  fs.writeFileSync(aclPath, createAcl(grants), 'utf8');
}

function signToken(address) {
  return jwt.sign(
    { address },
    JWT_SECRET,
    {
      issuer: 'vfide',
      audience: 'vfide-app',
      expiresIn: '5m',
    },
  );
}

function waitForServerReady(port) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket server startup timed out'));
    }, 10_000);

    const onExit = (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`WebSocket server exited before ready (code=${code}, signal=${signal})`));
    };

    const onData = (chunk) => {
      const line = chunk.toString();
      if (line.includes(`listening on port ${port}`)) {
        clearTimeout(timeout);
        serverProcess.stdout.off('data', onData);
        serverProcess.off('exit', onExit);
        resolve();
      }
    };

    serverProcess.on('exit', onExit);
    serverProcess.stdout.on('data', onData);
  });
}

function connectClient(origin = ALLOWED_ORIGIN) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { headers: { origin } });
    const onOpen = () => {
      ws.off('error', onError);
      ws.on('error', () => {});
      resolve(ws);
    };
    const onError = (err) => {
      ws.off('open', onOpen);
      reject(err);
    };

    ws.once('open', onOpen);
    ws.once('error', onError);
  });
}

function requestUpgradeStatus(origin = DISALLOWED_ORIGIN) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: serverPort }, () => {
      const req = [
        'GET / HTTP/1.1',
        `Host: 127.0.0.1:${serverPort}`,
        'Connection: Upgrade',
        'Upgrade: websocket',
        'Sec-WebSocket-Version: 13',
        'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
        `Origin: ${origin}`,
        '',
        '',
      ].join('\r\n');
      socket.write(req);
    });

    socket.once('data', (chunk) => {
      const firstLine = chunk.toString().split('\r\n')[0] || '';
      const status = Number(firstLine.split(' ')[1] || 0);
      socket.end();
      resolve(status);
    });

    socket.once('error', (err) => {
      reject(err);
    });
  });
}

function waitForMessage(ws, predicate, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for websocket message'));
    }, timeoutMs);

    const onMessage = (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (predicate(msg)) {
        cleanup();
        resolve(msg);
      }
    };

    const cleanup = () => {
      clearTimeout(timer);
      ws.off('message', onMessage);
    };

    ws.on('message', onMessage);
  });
}

function waitForClose(ws, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timed out waiting for websocket close'));
    }, timeoutMs);

    ws.once('close', (code, reasonBuffer) => {
      clearTimeout(timer);
      resolve({ code, reason: reasonBuffer.toString() });
    });
  });
}

function authenticate(ws, address) {
  return sendAndWait(
    ws,
    {
      type: 'auth',
      payload: { token: signToken(address) },
    },
    (msg) => msg.type === 'authenticated',
  );
}

function subscribe(ws, topic) {
  return sendAndWait(
    ws,
    {
      type: 'subscribe',
      payload: { topic },
    },
    (msg) => msg.type === 'subscribed' || msg.type === 'error',
  );
}

function sendAndWait(ws, outbound, predicate, timeoutMs = 2_000) {
  const pending = waitForMessage(ws, predicate, timeoutMs);
  ws.send(JSON.stringify(outbound));
  return pending;
}

test.before(async () => {
  const port = await getFreePort();
  serverPort = port;
  wsUrl = `ws://127.0.0.1:${port}`;
  aclPath = path.join(os.tmpdir(), `vfide-ws-acl-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);

  writeAcl({
    'chat.alpha': ['0x1111111111111111111111111111111111111111'],
    'chat.beta': ['0x2222222222222222222222222222222222222222'],
  });

  execSync('npm run build', { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });

  serverProcess = spawn('node', ['dist/index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      WS_PORT: String(port),
      JWT_SECRET,
      ALLOWED_ORIGINS: ALLOWED_ORIGIN,
      WS_AUTH_TIMEOUT_MS: String(AUTH_TIMEOUT_MS),
      WS_TOPIC_ACL_PATH: aclPath,
      WS_TOPIC_ACL_REFRESH_MS: String(ACL_REFRESH_MS),
      WS_TOPIC_ACL_ALLOW_MISSING: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForServerReady(port);
});

test.after(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3_000);
      serverProcess.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  if (aclPath && fs.existsSync(aclPath)) {
    fs.unlinkSync(aclPath);
  }
});

test('rejects websocket upgrade from disallowed origin', async () => {
  const statusCode = await requestUpgradeStatus(DISALLOWED_ORIGIN);
  assert.equal(statusCode, 403);
});

test('closes unauthenticated sessions after auth timeout', async () => {
  const ws = await connectClient();

  const timeoutError = await waitForMessage(
    ws,
    (msg) => msg.type === 'error' && msg.payload?.code === 'AUTH_TIMEOUT',
    3_000,
  );
  assert.equal(timeoutError.payload.code, 'AUTH_TIMEOUT');

  const closed = await waitForClose(ws, 3_000);
  assert.equal(closed.code, 4001);
  assert.match(closed.reason, /Authentication timeout/i);
});

test('applies ACL refresh updates to subsequent subscription checks', async () => {
  const userA = '0x1111111111111111111111111111111111111111';
  const userB = '0x2222222222222222222222222222222222222222';

  const wsA = await connectClient();
  const wsB = await connectClient();

  try {
    await authenticate(wsA, userA);
    await authenticate(wsB, userB);

    const beforeUpdate = await subscribe(wsA, 'chat.alpha');
    assert.equal(beforeUpdate.type, 'subscribed');

    writeAcl({
      'chat.alpha': [],
      'chat.beta': [userB],
    });

    await new Promise((resolve) => setTimeout(resolve, ACL_REFRESH_MS * 3));

    const denied = await subscribe(wsA, 'chat.alpha');
    assert.equal(denied.type, 'error');
    assert.equal(denied.payload.code, 'UNAUTHORIZED_TOPIC');

    const allowed = await subscribe(wsB, 'chat.beta');
    assert.equal(allowed.type, 'subscribed');
  } finally {
    wsA.close();
    wsB.close();
  }
});

test('enforces topic isolation by authenticated address grants', async () => {
  const userA = '0x1111111111111111111111111111111111111111';
  const userB = '0x2222222222222222222222222222222222222222';

  writeAcl({
    'chat.alpha': [userA],
    'chat.beta': [userB],
  });
  await new Promise((resolve) => setTimeout(resolve, ACL_REFRESH_MS * 3));

  const wsA = await connectClient();
  const wsB = await connectClient();

  try {
    await authenticate(wsA, userA);
    await authenticate(wsB, userB);

    const aAlpha = await subscribe(wsA, 'chat.alpha');
    assert.equal(aAlpha.type, 'subscribed');

    const aBeta = await subscribe(wsA, 'chat.beta');
    assert.equal(aBeta.type, 'error');
    assert.equal(aBeta.payload.code, 'UNAUTHORIZED_TOPIC');

    const bBeta = await subscribe(wsB, 'chat.beta');
    assert.equal(bBeta.type, 'subscribed');

    const bAlpha = await subscribe(wsB, 'chat.alpha');
    assert.equal(bAlpha.type, 'error');
    assert.equal(bAlpha.payload.code, 'UNAUTHORIZED_TOPIC');
  } finally {
    wsA.close();
    wsB.close();
  }
});
