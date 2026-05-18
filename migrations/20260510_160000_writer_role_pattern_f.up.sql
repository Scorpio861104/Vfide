-- Migration: writer-role split for Pattern F tables
-- Creates vfide_app_writer role and moves INSERT/UPDATE/DELETE on the 26
-- high-write Pattern F tables from the shared vfide_app role to this new
-- dedicated writer role. vfide_app_writer inherits all grants from
-- vfide_app via role membership, retaining SELECT on every table.
--
-- Pattern F tables are identified as tables with high write frequency and
-- no need for the broad DML grants that the shared vfide_app role carries.
-- Splitting write privileges narrows the blast radius if a read-path
-- service credential is compromised.

BEGIN;

-- 1. Create the writer role (NOBYPASSRLS ensures row-level security is
--    always enforced regardless of session_replication_role setting).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app_writer') THEN
    CREATE ROLE vfide_app_writer
      INHERIT
      NOBYPASSRLS
      NOSUPERUSER
      NOCREATEROLE
      NOCREATEDB
      NOLOGIN;
  END IF;
END
$$;

-- 2. vfide_app_writer inherits the base grants (SELECT, etc.) from vfide_app.
GRANT vfide_app TO vfide_app_writer;

-- 3. Grant INSERT/UPDATE/DELETE on Pattern F tables to vfide_app_writer.
GRANT INSERT, UPDATE, DELETE ON
  daily_quests,
  platform_categories,
  prize_tiers,
  monthly_prize_pool,
  achievement_milestones,
  weekly_challenges,
  merchant_webhook_deliveries,
  merchant_invoice_items,
  merchant_order_items,
  merchant_product_variants,
  merchant_digital_assets,
  merchant_digital_deliveries,
  coupon_redemptions,
  installment_payments,
  audit_events,
  security_alert_dispatches,
  security_webhook_replay_events,
  flashloan_lanes,
  flashloan_lane_events,
  vault_identities,
  merchant_wholesale_group_buys,
  seer_analytics_daily_rollup,
  seer_reason_code_daily_rollup,
  performance_metrics,
  indexed_events,
  indexer_state
TO vfide_app_writer;

-- 4. Remove INSERT/UPDATE/DELETE on Pattern F tables from the shared role.
--    vfide_app retains SELECT so read-path services are unaffected.
REVOKE INSERT, UPDATE, DELETE ON
  daily_quests,
  platform_categories,
  prize_tiers,
  monthly_prize_pool,
  achievement_milestones,
  weekly_challenges,
  merchant_webhook_deliveries,
  merchant_invoice_items,
  merchant_order_items,
  merchant_product_variants,
  merchant_digital_assets,
  merchant_digital_deliveries,
  coupon_redemptions,
  installment_payments,
  audit_events,
  security_alert_dispatches,
  security_webhook_replay_events,
  flashloan_lanes,
  flashloan_lane_events,
  vault_identities,
  merchant_wholesale_group_buys,
  seer_analytics_daily_rollup,
  seer_reason_code_daily_rollup,
  performance_metrics,
  indexed_events,
  indexer_state
FROM vfide_app;

COMMIT;
