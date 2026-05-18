-- Down migration for 20260510_140000_complete_rls_baseline.sql
--
-- Drops every policy and disables RLS on the tables this migration touched.
-- Pre-existing policies (created by earlier migrations) are untouched
-- because they don't follow the *_read_own/*_insert_own/*_update_own/
-- *_delete_own/*_read_party/*_insert_originator/*_update_party/*_read_member
-- naming convention used by 20260510_140000.

BEGIN;

DO $$
DECLARE
    pol record;
    rls_tbl record;
    suffix_patterns text[] := ARRAY[
        '_read_own',
        '_insert_own',
        '_update_own',
        '_delete_own',
        '_read_party',
        '_insert_originator',
        '_update_party',
        '_read_member'
    ];
    pattern text;
    tables_in_scope text[] := ARRAY[
        -- Pattern A
        'notifications','badges','transactions','token_balances','activities',
        'monthly_leaderboard','push_subscriptions','notification_preferences',
        'notification_hub_preferences','user_privacy_settings','user_badges',
        'analytics_events','security_violations','two_factor_codes','time_locks',
        'enterprise_orders','user_presence','user_daily_rewards',
        'user_quest_progress','user_weekly_progress','user_achievement_progress',
        'achievement_notifications','user_streaks','user_onboarding',
        'daily_rewards','sync_state','onboarding_progress','error_logs',
        -- Pattern B
        'security_account_events','security_account_locks','security_event_logs',
        'encryption_key_directory',
        -- Pattern C
        'payment_requests','streams','merchant_wholesale_orders','loans','flash_loans',
        -- Pattern D
        'groups','group_invites','attachments','message_reports','group_messages',
        'message_reactions','staff_activity_log',
        -- Pattern E
        'group_members'
    ];
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY tables_in_scope LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            CONTINUE;
        END IF;

        FOREACH pattern IN ARRAY suffix_patterns LOOP
            EXECUTE format(
                'DROP POLICY IF EXISTS %I ON public.%I',
                tbl || pattern,
                tbl
            );
        END LOOP;

        -- Only disable RLS if there are no remaining policies
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
        END IF;
    END LOOP;
END$$;

COMMIT;
