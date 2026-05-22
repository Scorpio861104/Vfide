-- Migration: 20260510_140000_complete_rls_baseline.sql
--
-- Purpose:
--   Close the RLS gaps left by 20260510_120000_grant_vfide_app_and_baseline_rls.sql.
--   That migration covered 31 tables with an obvious owner address column.
--   This migration covers the remaining ~72 tables grouped by ownership
--   pattern.
--
-- Patterns covered:
--   A. user_id FK to users.id (~28 tables)        → join through users.wallet_address
--   B. address PRIMARY KEY = wallet (~5 tables)   → direct compare
--   C. dual address (from/to or sender/recipient) → OR-match
--   D. actor FK columns (creator_id, sender_id…)  → join through users.id
--   E. group_id FK (group membership context)     → membership lookup
--   F. system/lookup tables (no user ownership)   → read-public, deny-write
--
-- Policy naming convention (matches the previous migration):
--   <table>_read_own
--   <table>_insert_own
--   <table>_update_own
--   <table>_delete_own
--
-- Idempotent: re-runnable. Each policy is created only if absent.

BEGIN;

-- Helper: a stable expression for the current authenticated wallet.
-- Returns NULL when no context is set, which causes all `= …` comparisons
-- to be FALSE under standard RLS semantics → no rows visible.

-- ============================================================================
-- PATTERN A: user_id FK to users (current user resolves via users.wallet_address)
-- ============================================================================
DO $$
DECLARE
    tbl text;
    tables_user_id text[] := ARRAY[
        'notifications',
        'badges',
        'transactions',
        'token_balances',
        'activities',
        'monthly_leaderboard',
        'push_subscriptions',
        'notification_preferences',
        'notification_hub_preferences',
        'user_privacy_settings',
        'user_badges',
        'security_violations',
        'two_factor_codes',
        'time_locks',
        'enterprise_orders',
        'user_presence',
        'user_daily_rewards',
        'user_quest_progress',
        'user_weekly_progress',
        'user_achievement_progress',
        'achievement_notifications',
        'user_streaks',
        'user_onboarding',
        'daily_rewards',
        'sync_state',
        'onboarding_progress',
        'error_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_user_id LOOP
        -- Skip if table doesn't exist (defensive)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            CONTINUE;
        END IF;
        -- Skip if any policy already exists for this table
        IF EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
        ) THEN
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = %I.user_id
                      AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
                )
            )
        $q$, tbl || '_read_own', tbl, tbl);

        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = %I.user_id
                      AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
                )
            )
        $q$, tbl || '_insert_own', tbl, tbl);

        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = %I.user_id
                      AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = %I.user_id
                      AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
                )
            )
        $q$, tbl || '_update_own', tbl, tbl, tbl);

        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = %I.user_id
                      AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
                )
            )
        $q$, tbl || '_delete_own', tbl, tbl);

        RAISE NOTICE 'Pattern A (user_id): added owner-only policies on %', tbl;
    END LOOP;
END$$;

-- ============================================================================
-- PATTERN B: `address` column IS the wallet (PRIMARY KEY or FK)
-- ============================================================================
DO $$
DECLARE
    tbl text;
    tables_address text[] := ARRAY[
        'security_account_events',
        'security_account_locks',
        'security_event_logs',
        'encryption_key_directory'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_address LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
        ) THEN
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT USING (address = current_setting(''app.current_user_address'', true)::text)',
            tbl || '_read_own', tbl
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (address = current_setting(''app.current_user_address'', true)::text)',
            tbl || '_insert_own', tbl
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE USING (address = current_setting(''app.current_user_address'', true)::text) WITH CHECK (address = current_setting(''app.current_user_address'', true)::text)',
            tbl || '_update_own', tbl
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE USING (address = current_setting(''app.current_user_address'', true)::text)',
            tbl || '_delete_own', tbl
        );

        RAISE NOTICE 'Pattern B (address): added owner-only policies on %', tbl;
    END LOOP;
END$$;

-- ============================================================================
-- PATTERN B2: `user_id` column stores a wallet address directly (VARCHAR)
-- analytics_events stores the wallet in user_id (VARCHAR 42), not a FK int.
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'analytics_events'
    ) THEN
        RAISE NOTICE 'analytics_events table not found, skipping Pattern B2';
    ELSIF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analytics_events'
    ) THEN
        RAISE NOTICE 'analytics_events already has RLS policies, skipping Pattern B2';
    ELSE
        EXECUTE 'ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY';

        EXECUTE $q$
            CREATE POLICY analytics_events_read_own ON public.analytics_events FOR SELECT
            USING (LOWER(user_id) = LOWER(current_setting('app.current_user_address', true)::text))
        $q$;
        EXECUTE $q$
            CREATE POLICY analytics_events_insert_own ON public.analytics_events FOR INSERT
            WITH CHECK (LOWER(user_id) = LOWER(current_setting('app.current_user_address', true)::text))
        $q$;
        EXECUTE $q$
            CREATE POLICY analytics_events_update_own ON public.analytics_events FOR UPDATE
            USING (LOWER(user_id) = LOWER(current_setting('app.current_user_address', true)::text))
            WITH CHECK (LOWER(user_id) = LOWER(current_setting('app.current_user_address', true)::text))
        $q$;
        EXECUTE $q$
            CREATE POLICY analytics_events_delete_own ON public.analytics_events FOR DELETE
            USING (LOWER(user_id) = LOWER(current_setting('app.current_user_address', true)::text))
        $q$;

        RAISE NOTICE 'Pattern B2 (user_id as wallet): added owner-only policies on analytics_events';
    END IF;
END$$;

-- ============================================================================
-- PATTERN C: dual-address (sender + recipient / from + to)
-- Either side of a payment/stream can see it.
-- ============================================================================
DO $$
DECLARE
    tbl text;
    from_col text;
    to_col text;
    -- (table, from_column, to_column)
    rec record;
BEGIN
    FOR rec IN
        SELECT * FROM (VALUES
            ('payment_requests',           'from_address',   'to_address'),
            ('streams',                    'sender_address', 'recipient_address'),
            ('merchant_wholesale_orders',  'buyer_merchant_address', 'seller_merchant_address'),
            ('loans',                      'lender_address', 'borrower_address'),
            ('flash_loans',                'lender_address', 'borrower_address')
        ) AS t(tbl, from_col, to_col)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = rec.tbl
        ) THEN
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = rec.tbl
        ) THEN
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.tbl);

        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR SELECT
            USING (
                LOWER(%I) = LOWER(current_setting('app.current_user_address', true)::text)
                OR LOWER(%I) = LOWER(current_setting('app.current_user_address', true)::text)
            )
        $q$, rec.tbl || '_read_party', rec.tbl, rec.from_col, rec.to_col);

        -- INSERT: only as the originator
        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR INSERT
            WITH CHECK (LOWER(%I) = LOWER(current_setting('app.current_user_address', true)::text))
        $q$, rec.tbl || '_insert_originator', rec.tbl, rec.from_col);

        -- UPDATE: either party (e.g. recipient accepting, sender cancelling)
        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR UPDATE
            USING (
                LOWER(%I) = LOWER(current_setting('app.current_user_address', true)::text)
                OR LOWER(%I) = LOWER(current_setting('app.current_user_address', true)::text)
            )
        $q$, rec.tbl || '_update_party', rec.tbl, rec.from_col, rec.to_col);

        RAISE NOTICE 'Pattern C (dual-address): added party policies on %', rec.tbl;
    END LOOP;
END$$;

-- ============================================================================
-- PATTERN D: actor-id FK (creator_id, sender_id, uploaded_by, etc.)
-- Resolve via users.id → users.wallet_address.
-- ============================================================================
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN
        SELECT * FROM (VALUES
            ('groups',              'creator_id'),
            ('group_invites',       'created_by'),
            ('attachments',         'uploaded_by'),
            ('message_reports',     'reporter_id'),
            ('group_messages',      'sender_id'),
            ('message_reactions',   'user_id'),
            ('message_edits',       NULL::text),  -- no actor column, skip
            ('staff_activity_log',  'staff_id')
        ) AS t(tbl, actor_col)
    LOOP
        IF rec.actor_col IS NULL THEN CONTINUE; END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = rec.tbl
        ) THEN
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = rec.tbl
        ) THEN
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.tbl);

        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = %I.%I
                      AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
                )
            )
        $q$, rec.tbl || '_read_own', rec.tbl, rec.tbl, rec.actor_col);

        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = %I.%I
                      AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
                )
            )
        $q$, rec.tbl || '_insert_own', rec.tbl, rec.tbl, rec.actor_col);

        RAISE NOTICE 'Pattern D (actor): added owner-only policies on %', rec.tbl;
    END LOOP;
END$$;

-- ============================================================================
-- PATTERN E: group_id FK — visible to current group members
-- ============================================================================
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN
        SELECT * FROM (VALUES
            ('group_members',  'group_id'),
            ('group_messages', 'group_id')
        ) AS t(tbl, group_col)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = rec.tbl
        ) THEN
            CONTINUE;
        END IF;
        IF EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = rec.tbl
        ) THEN
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'group_members'
        ) THEN
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.tbl);

        EXECUTE format($q$
            CREATE POLICY %I ON public.%I FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM group_members gm
                    JOIN users u ON u.id = gm.user_id
                    WHERE gm.group_id = %I.%I
                      AND LOWER(u.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
                )
            )
        $q$, rec.tbl || '_read_member', rec.tbl, rec.tbl, rec.group_col);

        RAISE NOTICE 'Pattern E (group): added member-only read policy on %', rec.tbl;
    END LOOP;
END$$;

-- ============================================================================
-- PATTERN F: read-public, write-system-only
-- Lookup / reference tables where the data itself is not sensitive but
-- nobody but a service role should INSERT/UPDATE/DELETE.
-- We do NOT enable RLS on these — they remain readable to any role with
-- SELECT, and writes are gated by GRANT (only the service writer role
-- gets INSERT/UPDATE/DELETE). For the testnet this is acceptable; mainnet
-- should additionally split a `vfide_app_writer` role from `vfide_app`.
-- ============================================================================
-- Tables in this bucket (left intentionally un-RLSed):
--   platform_categories, daily_quests, weekly_challenges,
--   achievement_milestones, prize_tiers, monthly_prize_pool,
--   seer_analytics_daily_rollup, seer_reason_code_daily_rollup,
--   performance_metrics, indexed_events, indexer_state,
--   merchant_webhook_deliveries, merchant_invoice_items,
--   merchant_order_items, merchant_product_variants,
--   merchant_digital_assets, merchant_digital_deliveries,
--   coupon_redemptions, installment_payments, audit_events,
--   security_alert_dispatches, security_webhook_replay_events,
--   flashloan_lanes, flashloan_lane_events,
--   vault_identities, merchant_wholesale_group_buys
--
-- This is documented here in the migration history so future audits see
-- the explicit decision rather than treating their RLS absence as a bug.

COMMIT;
