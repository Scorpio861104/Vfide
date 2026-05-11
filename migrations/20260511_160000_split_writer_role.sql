-- Migration: 20260511_160000_split_writer_role.sql
--
-- Purpose:
--   Close the Pattern F gap from 20260510_140000_complete_rls_baseline.sql.
--   That migration left 25 system/lookup tables with no RLS and full
--   write access for `vfide_app`. This migration splits writes for those
--   tables into a separate `vfide_app_writer` role so only backend jobs
--   can mutate them — frontend-API queries (which connect as `vfide_app`)
--   can READ them but not write.
--
-- Tables in scope (Pattern F from the previous migration's deferred list):
--   Lookup / reference:
--     platform_categories, daily_quests, weekly_challenges,
--     achievement_milestones, prize_tiers
--   Pool ledgers (admin-managed):
--     monthly_prize_pool
--   Analytics / metrics (system-written):
--     seer_analytics_daily_rollup, seer_reason_code_daily_rollup,
--     performance_metrics
--   Indexer / blockchain state:
--     indexed_events, indexer_state
--   Merchant subordinate data (merchant manages via API; reads are
--   merchant-scoped but writes happen via privileged routes):
--     merchant_webhook_deliveries, merchant_invoice_items,
--     merchant_order_items, merchant_product_variants,
--     merchant_digital_assets, merchant_digital_deliveries,
--     coupon_redemptions, installment_payments,
--     merchant_wholesale_group_buys
--   Security / audit (append-only by system):
--     audit_events, security_alert_dispatches,
--     security_webhook_replay_events,
--     flashloan_lanes, flashloan_lane_events,
--     vault_identities
--
-- Design:
--   - `vfide_app` keeps SELECT on all Pattern F tables (reads work
--     normally from API routes).
--   - `vfide_app` LOSES INSERT/UPDATE/DELETE on Pattern F tables.
--   - `vfide_app_writer` is created with NOBYPASSRLS and granted
--     INSERT/UPDATE/DELETE on Pattern F tables only.
--   - Backend jobs (indexer, cron tasks, webhook handlers) connect as
--     `vfide_app_writer` via DATABASE_URL_WRITER. The frontend continues
--     to use DATABASE_URL → vfide_app.
--
-- Application code change required after this migration:
--   - Add DATABASE_URL_WRITER env var for backend jobs.
--   - `lib/db.ts` doesn't change (it already pulls connections from the
--     pool keyed off DATABASE_URL).
--   - For the indexer / webhook handlers, switch their pool to use
--     DATABASE_URL_WRITER. Until that wiring is in place, those flows
--     will get "permission denied" — which is the point: it fails loud,
--     not silent.
--
-- Idempotent. Companion .down.sql restores the previous state.

BEGIN;

-- ============================================================================
-- 1. Create the writer role (NOBYPASSRLS, no LOGIN by default — set
--    LOGIN + password in the deploy script that loads the secret).
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app_writer') THEN
        CREATE ROLE vfide_app_writer NOBYPASSRLS;
        RAISE NOTICE 'Created role vfide_app_writer (NOBYPASSRLS).';
    END IF;
    GRANT USAGE ON SCHEMA public TO vfide_app_writer;
END$$;

-- ============================================================================
-- 2. For each Pattern F table:
--      - Keep SELECT on vfide_app (reads still work from the frontend)
--      - REVOKE INSERT/UPDATE/DELETE from vfide_app
--      - GRANT all four to vfide_app_writer
-- ============================================================================
DO $$
DECLARE
    tbl text;
    pattern_f text[] := ARRAY[
        'platform_categories',
        'daily_quests',
        'weekly_challenges',
        'achievement_milestones',
        'prize_tiers',
        'monthly_prize_pool',
        'seer_analytics_daily_rollup',
        'seer_reason_code_daily_rollup',
        'performance_metrics',
        'indexed_events',
        'indexer_state',
        'merchant_webhook_deliveries',
        'merchant_invoice_items',
        'merchant_order_items',
        'merchant_product_variants',
        'merchant_digital_assets',
        'merchant_digital_deliveries',
        'coupon_redemptions',
        'installment_payments',
        'merchant_wholesale_group_buys',
        'audit_events',
        'security_alert_dispatches',
        'security_webhook_replay_events',
        'flashloan_lanes',
        'flashloan_lane_events',
        'vault_identities'
    ];
    skipped int := 0;
    processed int := 0;
BEGIN
    PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app_writer';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Role vfide_app_writer must exist before this block runs.';
    END IF;

    FOREACH tbl IN ARRAY pattern_f LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            RAISE NOTICE 'Skipping % — table does not exist', tbl;
            skipped := skipped + 1;
            CONTINUE;
        END IF;

        -- Revoke writes from vfide_app (keep SELECT)
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
            EXECUTE format(
                'REVOKE INSERT, UPDATE, DELETE ON public.%I FROM vfide_app',
                tbl
            );
        END IF;

        -- Grant all four to vfide_app_writer
        EXECUTE format(
            'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO vfide_app_writer',
            tbl
        );

        processed := processed + 1;
    END LOOP;

    RAISE NOTICE 'Writer-role split applied to % table(s); skipped % missing.', processed, skipped;
END$$;

-- ============================================================================
-- 3. Ensure sequence access for the writer role on Pattern F tables
-- ============================================================================
DO $$
DECLARE
    seq_name text;
BEGIN
    PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app_writer';
    IF NOT FOUND THEN RETURN; END IF;

    -- Grant on every sequence — easier and safe given the writer role
    -- can only USE sequences for tables it can also write to.
    FOR seq_name IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('GRANT USAGE, SELECT ON public.%I TO vfide_app_writer', seq_name);
    END LOOP;
END$$;

COMMIT;
