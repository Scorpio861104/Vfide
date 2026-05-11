'use client';

import { useMemo, useState } from 'react';

type Endpoint = {
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  note?: string;
};

const UNMAPPED_ENDPOINTS: Endpoint[] = [
  { route: '/api/attachments/upload', method: 'POST', note: 'multipart upload endpoint' },
  { route: '/api/attachments/sample-id', method: 'GET', note: 'replace sample-id with a real attachment id' },
  { route: '/api/auth', method: 'POST', note: 'SIWE auth exchange route' },
  { route: '/api/auth/challenge', method: 'POST' },
  { route: '/api/auth/logout', method: 'POST' },
  { route: '/api/auth/revoke', method: 'POST' },
  { route: '/api/csrf', method: 'GET' },
  { route: '/api/endorsements', method: 'GET' },
  { route: '/api/errors', method: 'POST', note: 'client error reporting' },
  { route: '/api/friends', method: 'GET' },
  { route: '/api/gamification', method: 'GET' },
  { route: '/api/indexer/poll', method: 'GET' },
  { route: '/api/performance/metrics', method: 'POST' },
  { route: '/api/pos/charge', method: 'POST' },
  { route: '/api/privacy/delete', method: 'POST' },
  { route: '/api/push/subscribe', method: 'POST' },
  { route: '/api/quests/achievements', method: 'GET' },
  { route: '/api/quests/achievements/claim', method: 'POST' },
  { route: '/api/quests/claim', method: 'POST' },
  { route: '/api/quests/daily', method: 'GET' },
  { route: '/api/quests/notifications', method: 'GET' },
  { route: '/api/quests/onboarding', method: 'GET' },
  { route: '/api/quests/streak', method: 'GET' },
  { route: '/api/quests/weekly', method: 'GET' },
  { route: '/api/quests/weekly/claim', method: 'POST' },
  { route: '/api/referral', method: 'POST' },
  { route: '/api/sync', method: 'GET' },
  { route: '/api/ussd', method: 'POST' },
];

type ResultMap = Record<string, string>;

type BodyMap = Record<string, string>;

const DEFAULT_BODIES: BodyMap = {
  '/api/auth': '{"address":"0x0000000000000000000000000000000000000000"}',
  '/api/auth/challenge': '{"address":"0x0000000000000000000000000000000000000000"}',
  '/api/errors': '{"message":"client test"}',
  '/api/performance/metrics': '{"metric":"api_coverage_ping","value":1}',
  '/api/pos/charge': '{"amount":1,"currency":"USDC"}',
  '/api/privacy/delete': '{"reason":"coverage-check"}',
  '/api/push/subscribe': '{"subscription":{}}',
  '/api/quests/achievements/claim': '{"achievementId":"sample"}',
  '/api/quests/claim': '{"questId":"sample"}',
  '/api/quests/weekly/claim': '{"week":"sample"}',
  '/api/referral': '{"code":"sample"}',
  '/api/ussd': '{"text":"*123#"}',
  '/api/attachments/upload': '{"note":"Use proper multipart/form-data for real upload tests"}',
};

export default function ApiCoveragePage() {
  const [routes, setRoutes] = useState<Record<string, string>>(() =>
    Object.fromEntries(UNMAPPED_ENDPOINTS.map((e) => [e.route, e.route]))
  );
  const [bodies, setBodies] = useState<BodyMap>(DEFAULT_BODIES);
  const [results, setResults] = useState<ResultMap>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const rows = useMemo(() => UNMAPPED_ENDPOINTS, []);

  const run = async (endpoint: Endpoint) => {
    const key = `${endpoint.method} ${endpoint.route}`;
    const target = routes[endpoint.route] || endpoint.route;
    setLoadingKey(key);
    try {
      const init: RequestInit = { method: endpoint.method, headers: {} };
      if (endpoint.method !== 'GET') {
        (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
        const candidate = bodies[endpoint.route];
        init.body = candidate && candidate.trim().length > 0 ? candidate : '{}';
      }
      const response = await fetch(target, init);
      const text = await response.text();
      const shortText = text.length > 240 ? `${text.slice(0, 240)}...` : text;
      setResults((prev) => ({
        ...prev,
        [key]: `${response.status} ${response.statusText} | ${shortText || '(empty)'}`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setResults((prev) => ({ ...prev, [key]: `ERROR | ${message}` }));
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <section className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">API Coverage Console</h1>
        <p className="text-zinc-300 text-sm">
          UI verification surface for API routes that previously had no direct frontend wiring.
          Use this page to validate route reachability before testnet deployment.
        </p>
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-xs text-zinc-300">
          Total previously uncovered routes: {rows.length}
        </div>
      </section>

      <section className="max-w-6xl mx-auto mt-6 grid gap-4">
        {rows.map((endpoint) => {
          const key = `${endpoint.method} ${endpoint.route}`;
          const routeValue = routes[endpoint.route] || endpoint.route;
          const bodyValue = bodies[endpoint.route] || '';
          const isLoading = loadingKey === key;
          return (
            <article key={key} className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-300">{endpoint.method}</span>
                <span className="font-mono text-sm text-zinc-200">{endpoint.route}</span>
              </div>

              {endpoint.note ? <p className="text-xs text-zinc-400">{endpoint.note}</p> : null}

              <label className="block text-xs text-zinc-300">
                Request path
                <input
                  value={routeValue}
                  onChange={(event) =>
                    setRoutes((prev) => ({ ...prev, [endpoint.route]: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>

              {endpoint.method !== 'GET' ? (
                <label className="block text-xs text-zinc-300">
                  JSON body
                  <textarea
                    value={bodyValue}
                    onChange={(event) =>
                      setBodies((prev) => ({ ...prev, [endpoint.route]: event.target.value }))
                    }
                    rows={4}
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100"
                  />
                </label>
              ) : null}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => run(endpoint)}
                  disabled={isLoading}
                  className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-60"
                >
                  {isLoading ? 'Running...' : 'Run request'}
                </button>
                <span className="text-xs text-zinc-400">{results[key] || 'No request yet'}</span>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
