-- Down migration for 20260511_160000_split_writer_role.sql
--
-- Restores the previous state: vfide_app regains write privileges on
-- Pattern F tables, vfide_app_writer is revoked and dropped.
--
-- Run this BEFORE the application's writer DB pool is switched to
-- DATABASE_URL_WRITER. If the writer pool is already in use, this
-- migration will break those backend jobs.

BEGIN;

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
BEGIN
    FOREACH tbl IN ARRAY pattern_f LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            CONTINUE;
        END IF;

        -- Restore writes to vfide_app
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO vfide_app',
                tbl
            );
        END IF;

        -- Strip vfide_app_writer
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app_writer') THEN
            EXECUTE format(
                'REVOKE ALL ON public.%I FROM vfide_app_writer',
                tbl
            );
        END IF;
    END LOOP;
END$$;

-- Drop the role itself (only if no remaining grants reference it)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app_writer') THEN
        REVOKE USAGE ON SCHEMA public FROM vfide_app_writer;
        DROP ROLE vfide_app_writer;
        RAISE NOTICE 'Dropped role vfide_app_writer.';
    END IF;
END$$;

COMMIT;
