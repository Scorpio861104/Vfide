-- Migration: Drop orphaned streams + flashloan_lanes tables
-- Created: 2026-05-17
--
-- The `streams` table backed `/api/streams` (now deleted; payroll uses the
-- on-chain PayrollManager contract directly via hooks/usePayroll.ts).
-- The `flashloan_lanes` + `flashloan_lane_events` tables backed
-- `/api/flashloans/lanes/*` (now deleted; flash loans use the on-chain
-- VFIDEFlashLoan contract via hooks/useFlashLoan.ts).
--
-- Both API routes were removed in R31 of the Tier-3 audit (2026-05-17)
-- because no frontend code called them — the off-chain DB-backed flow had
-- been superseded by direct on-chain calls weeks earlier, and the routes
-- existed only as dead attack surface.
--
-- Note: `enterprise_orders` and `time_locks` (introduced in the same
-- migration as `streams`) are still used and stay.

BEGIN;

DROP TABLE IF EXISTS flashloan_lane_events;
DROP TABLE IF EXISTS flashloan_lanes;
DROP TABLE IF EXISTS streams;

COMMIT;
