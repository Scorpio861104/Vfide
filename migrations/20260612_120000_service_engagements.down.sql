-- Down: Professional Services Operations Phase 1 (reverse of 20260612_120000_service_engagements.sql)
DROP INDEX IF EXISTS idx_merchant_invoices_engagement;
ALTER TABLE merchant_invoices DROP COLUMN IF EXISTS engagement_id;

DROP TABLE IF EXISTS retainer_accounts;

DROP INDEX IF EXISTS idx_milestone_deliverables_milestone;
DROP TABLE IF EXISTS milestone_deliverables;

DROP INDEX IF EXISTS idx_engagement_milestones_acceptance;
DROP INDEX IF EXISTS idx_engagement_milestones_engagement;
DROP TABLE IF EXISTS engagement_milestones;

DROP INDEX IF EXISTS idx_service_engagements_client;
DROP INDEX IF EXISTS idx_service_engagements_provider;
DROP TABLE IF EXISTS service_engagements;
