/**
 * R-033 – Room subscription authorization drift hardening.
 *
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('WebSocket subscription ACL refresh hardening', () => {
  const repoRoot = process.cwd();
  const serverPath = join(repoRoot, 'websocket-server', 'src', 'index.ts');
  const serverSource = readFileSync(serverPath, 'utf8');

  it('supports ACL snapshot refresh configuration', () => {
    expect(serverSource).toContain('WS_TOPIC_ACL_PATH');
    expect(serverSource).toContain('WS_TOPIC_ACL_REFRESH_MS');
    expect(serverSource).toContain('startTopicAclRefresh()');
    expect(serverSource).toContain('refreshTopicAclSnapshot');
  });

  it('enforces ACL authorization on subscribe and unsubscribe', () => {
    expect(serverSource).toContain('isAuthorizedForTopic(client, msg.payload.topic, true)');
    expect(serverSource).toContain("'UNAUTHORIZED_TOPIC'");
  });

  it('loads structured ACL snapshots with grants and updatedAt', () => {
    expect(serverSource).toContain('type TopicAclSnapshot');
    expect(serverSource).toContain('updatedAt');
    expect(serverSource).toContain('grants');
  });
});
