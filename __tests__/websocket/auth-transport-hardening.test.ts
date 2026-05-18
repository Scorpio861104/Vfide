import { readFileSync } from 'fs';
import { join } from 'path';

describe('WebSocket auth transport hardening', () => {
  const repoRoot = process.cwd();
  const clientPath = join(repoRoot, 'lib', 'websocket.ts');
  const serverPath = join(repoRoot, 'websocket-server', 'src', 'index.ts');
  const schemaPath = join(repoRoot, 'websocket-server', 'src', 'schema.ts');

  it('does not place auth credentials in websocket URL query params', () => {
    const clientSource = readFileSync(clientPath, 'utf8');

    expect(clientSource).not.toContain("searchParams.set('token'");
    expect(clientSource).not.toContain("searchParams.set('signature'");
    expect(clientSource).not.toContain("searchParams.set('message'");
    expect(clientSource).toContain("this.emit('auth', authPayload)");
  });

  it('enforces auth message before privileged websocket operations', () => {
    const serverSource = readFileSync(serverPath, 'utf8');

    expect(serverSource).not.toContain("url.searchParams.get('token')");
    expect(serverSource).toContain("msg.type !== 'auth' && !client.isAuthenticated");
    expect(serverSource).toContain("'AUTH_REQUIRED'");
    expect(serverSource).toContain("'AUTH_TIMEOUT'");
  });

  it('defines explicit auth message schema with token payload', () => {
    const schemaSource = readFileSync(schemaPath, 'utf8');

    expect(schemaSource).toContain("type: z.literal('auth')");
    expect(schemaSource).toContain('token: z.string().min(10).max(4096)');
  });
});
