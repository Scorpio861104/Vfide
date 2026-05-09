# Indexer Lag Monitoring — Status: Covered, with Optional Upgrades

## Context

The v19.x audit series initially flagged "indexer lag monitoring" as a deferred item. This document confirms that the basic check IS implemented (in v19.3 OP-4) and outlines optional improvements for operators who want richer signals.

## What's already in place (v19.3 OP-4)

`/api/health/ready` includes a `checkIndexer()` step that:

- Queries the `indexer_state` table for the last-processed block timestamp
- Compares against `now()`
- Returns `unhealthy` (HTTP 503) if the gap exceeds 5 minutes
- Returns `healthy` (HTTP 200) otherwise

The 5-minute threshold is a deliberate choice:
- Base / zkSync block times are 1–2 seconds; healthy indexer lag should be under 30 seconds
- Polygon block time is ~2 seconds with deeper confirmation depth (20 blocks); healthy lag is under 60 seconds
- 5 minutes is well above any healthy state but below user-noticeable delay

If `/api/health/ready` returns 503 due to indexer lag, the v19.10 maintenance banner (REC-3) automatically displays for users — they see "Service is temporarily unavailable" with a 60-second polling retry. No manual operator action needed for the user-facing degradation.

## What an upgraded version could add

The current check is binary: lag ≤ 5 min → healthy, lag > 5 min → unhealthy. For richer observability, you can add:

### 1. Per-chain lag metric

For multi-chain deploys (v19.11 XCHAIN-2), expose lag PER chain:

```ts
GET /api/health/ready?detailed=1
{
  "status": "healthy",
  "indexers": {
    "8453": { "lastBlockAt": "2026-05-09T...", "lagSeconds": 8 },
    "137":  { "lastBlockAt": "2026-05-09T...", "lagSeconds": 24 },
    "324":  { "lastBlockAt": "2026-05-09T...", "lagSeconds": 11 }
  }
}
```

Wire this into your dashboard so each chain has its own lag time-series. Healthy lag profiles differ across chains, so a single global threshold misses chain-specific regressions.

### 2. Prometheus metrics export

Add a `/api/metrics` endpoint that exposes:

```
# HELP vfide_indexer_lag_seconds Lag between latest chain block and last-indexed block
# TYPE vfide_indexer_lag_seconds gauge
vfide_indexer_lag_seconds{chain_id="8453"} 8
vfide_indexer_lag_seconds{chain_id="137"} 24
vfide_indexer_lag_seconds{chain_id="324"} 11

# HELP vfide_indexer_blocks_processed_total Cumulative blocks processed
# TYPE vfide_indexer_blocks_processed_total counter
vfide_indexer_blocks_processed_total{chain_id="8453"} 12345678
```

Scrape with Prometheus, alert on:
- `vfide_indexer_lag_seconds > 60` for any chain (warn)
- `vfide_indexer_lag_seconds > 300` for any chain (page)
- `rate(vfide_indexer_blocks_processed_total[5m]) == 0` (indexer has stalled even though lag hasn't crossed threshold yet — important early signal)

### 3. Lag derivative

A more sophisticated version: track lag's first derivative (dLag/dt). If lag is growing — even when still under threshold — that's an indexer that's falling behind faster than it can catch up. The binary "is lag > threshold?" check misses this until it's too late.

Implementation sketch:
```sql
-- In a tracking table, sample lag every 60s
INSERT INTO indexer_lag_samples (chain_id, sample_at, lag_seconds)
VALUES ($1, now(), $2);

-- Alert if last 5 samples are all increasing
WITH recent AS (
  SELECT lag_seconds,
         LAG(lag_seconds) OVER (ORDER BY sample_at) AS prev
  FROM indexer_lag_samples
  WHERE chain_id = $1
  ORDER BY sample_at DESC
  LIMIT 5
)
SELECT COUNT(*) AS increasing FROM recent WHERE lag_seconds > prev;
-- If this returns 4 (all 4 transitions show growth), alert
```

## What's deferred

The basic check already triggers user-visible degradation, which is the most important user-facing function. The richer per-chain metrics, Prometheus export, and derivative alerting are operational nice-to-haves that are best added when:

1. There's a specific operational regression that the basic threshold missed (then add the metric that would have caught it)
2. There's an SRE setup with Prometheus already running (then export the metric you have)
3. A specific incident postmortem identifies "lag was growing for 4 minutes before crossing threshold" as a contributor (then add derivative monitoring)

These are reactive additions to operational maturity. There's no architectural reason to ship them all upfront; the basic check is sufficient for a v1 mainnet launch.

## Status

✅ **Basic check shipped (v19.3 OP-4).** `/api/health/ready` covers the user-visible degradation path.
✅ **Multi-chain awareness available (v19.11 XCHAIN-2).** Each chain's indexer is supervised independently.
🔵 **Optional improvements documented.** Add when operational maturity / specific incidents justify them.

## See also

- `app/api/health/ready/route.ts` — the basic readiness endpoint (v19.3 OP-4)
- `lib/indexer/multiChain.ts` — multi-chain indexer supervisor (v19.11 XCHAIN-2)
- `components/system/MaintenanceBanner.tsx` — user-facing degradation banner (v19.11 REC-3)
- `docs/operations/INCIDENT_COMMUNICATION_RUNBOOK.md` — what to do when the banner fires
