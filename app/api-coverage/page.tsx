/**
 * /api-coverage — Internal API endpoint testing dashboard.
 *
 * This is a developer-only surface that lets you ping every API route
 * with arbitrary bodies and inspect responses. It exposes the entire
 * API endpoint inventory and is therefore NOT safe to expose in
 * production: a curious visitor could enumerate the surface and replay
 * sample requests against live infra.
 *
 * Server-side gate:
 *   - In production builds (NODE_ENV === 'production') we 404 unless
 *     the operator has explicitly opted in via NEXT_PUBLIC_ENABLE_API_COVERAGE=true.
 *   - In dev/test the dashboard is always available.
 *
 * The robots.ts also disallows /api-coverage/ as defense-in-depth so
 * search engines don't index it even if it ever ships in production.
 */
import { notFound } from 'next/navigation';
import ApiCoverageClient from './ApiCoverageClient';

export const dynamic = 'force-dynamic';

export default function ApiCoveragePage() {
  const isProd = process.env.NODE_ENV === 'production';
  const explicitlyEnabled = process.env.NEXT_PUBLIC_ENABLE_API_COVERAGE === 'true';

  if (isProd && !explicitlyEnabled) {
    notFound();
  }

  return <ApiCoverageClient />;
}
