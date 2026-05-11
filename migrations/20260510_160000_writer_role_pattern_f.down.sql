-- Rollback: writer-role split for Pattern F tables
-- Restores INSERT/UPDATE/DELETE on Pattern F tables to vfide_app and
-- drops the vfide_app_writer role.

BEGIN;

-- 1. Restore DML grants to the shared role.
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
TO vfide_app;

-- 2. Remove the writer role (this will fail if any session is currently
--    using it — reassign sessions before running rollback in production).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app_writer') THEN
    REVOKE vfide_app FROM vfide_app_writer;
    DROP ROLE vfide_app_writer;
  END IF;
END
$$;

COMMIT;
