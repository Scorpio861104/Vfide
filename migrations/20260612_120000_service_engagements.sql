-- Professional Services Operations (Commerce Operations Phase 1)
-- Engagement orchestration layer over the existing CommerceEscrow / merchant_invoices / disputes primitives.
-- On-chain truth = the linked CommerceEscrow ids (one escrow per milestone). These tables sequence them.
-- See docs/PROFESSIONAL_SERVICES_OPERATIONS_BUILD_SPEC.md.

-- ════════════════════════════════════════════════════════
-- ENGAGEMENTS: the agreed scope of work between a provider and a client
-- ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS service_engagements (
  id TEXT PRIMARY KEY,
  provider_address TEXT NOT NULL,                       -- the merchant / professional (lower-cased)
  client_address TEXT NOT NULL,                         -- the buyer (lower-cased)
  title TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',                        -- agreed scope of work (the agreement body)
  terms_hash TEXT,                                       -- 0x-prefixed keccak of the full terms doc (anchor)
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','proposed','accepted','active','completed','cancelled','disputed')),
  engagement_type TEXT NOT NULL DEFAULT 'fixed_milestone'
    CHECK (engagement_type IN ('fixed_milestone','retainer','hourly_capped')),
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  acceptance_window_secs INTEGER NOT NULL DEFAULT 604800, -- 7 days; silence = acceptance (see spec §5)
  proposed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_engagements_provider ON service_engagements(provider_address, status);
CREATE INDEX IF NOT EXISTS idx_service_engagements_client ON service_engagements(client_address, status);

-- ════════════════════════════════════════════════════════
-- MILESTONES: each milestone == one CommerceEscrow (escrow_id). State machine in spec §4.
-- ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS engagement_milestones (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES service_engagements(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,                                  -- ordering: phase 1, 2, 3...
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(18,2) NOT NULL,                         -- this milestone's escrowed value
  escrow_id NUMERIC,                                     -- linked CommerceEscrow id (NULL until funded)
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','defined','funded','submitted','accepted','released','in_dispute','refunded','cancelled')),
  acceptance_deadline TIMESTAMPTZ,                       -- set when a deliverable is submitted = now + window
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (engagement_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_engagement_milestones_engagement ON engagement_milestones(engagement_id, seq);
-- supports the auto-release keeper: find submitted milestones whose acceptance window has elapsed
CREATE INDEX IF NOT EXISTS idx_engagement_milestones_acceptance ON engagement_milestones(status, acceptance_deadline);

-- ════════════════════════════════════════════════════════
-- DELIVERABLES: what the provider submitted (content_hash = the evidence anchor). Resubmission => version++.
-- ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS milestone_deliverables (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL REFERENCES engagement_milestones(id) ON DELETE CASCADE,
  content_hash TEXT,                                     -- 0x-prefixed keccak of the delivered artifact
  uri TEXT,                                              -- pointer to off-chain storage
  note TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestone_deliverables_milestone ON milestone_deliverables(milestone_id, version);

-- ════════════════════════════════════════════════════════
-- RETAINER ACCOUNTS: for engagement_type='retainer' — a single funded escrow drawn down per accepted milestone.
-- ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS retainer_accounts (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES service_engagements(id) ON DELETE CASCADE,
  funded_escrow_id NUMERIC,                              -- the CommerceEscrow acting as the retainer balance
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,              -- remaining undrawn
  draw_policy TEXT NOT NULL DEFAULT 'per_accepted_milestone'
    CHECK (draw_policy IN ('per_accepted_milestone','periodic')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (engagement_id)
);

-- ════════════════════════════════════════════════════════
-- Reuse the existing invoice machinery: tag invoices to an engagement (nullable FK, additive).
-- ════════════════════════════════════════════════════════
ALTER TABLE merchant_invoices ADD COLUMN IF NOT EXISTS engagement_id TEXT;
CREATE INDEX IF NOT EXISTS idx_merchant_invoices_engagement ON merchant_invoices(engagement_id);
