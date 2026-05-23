-- Migration: Seer analytics daily rollup tables and refresh function
-- Created: 2026-03-13T21:00:00.000Z

BEGIN;

CREATE TABLE IF NOT EXISTS seer_analytics_daily_rollup (
  day DATE PRIMARY KEY,
  total_events INTEGER NOT NULL DEFAULT 0,
  allowed_events INTEGER NOT NULL DEFAULT 0,
  warned_events INTEGER NOT NULL DEFAULT 0,
  delayed_events INTEGER NOT NULL DEFAULT 0,
  blocked_events INTEGER NOT NULL DEFAULT 0,
  score_set_events INTEGER NOT NULL DEFAULT 0,
  appeals_opened INTEGER NOT NULL DEFAULT 0,
  appeals_resolved INTEGER NOT NULL DEFAULT 0,
  unique_subjects INTEGER NOT NULL DEFAULT 0,
  avg_score_delta_abs NUMERIC(18, 6) NOT NULL DEFAULT 0,
  avg_confidence NUMERIC(18, 6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seer_analytics_daily_rollup_day ON seer_analytics_daily_rollup(day DESC);

CREATE TABLE IF NOT EXISTS seer_reason_code_daily_rollup (
  day DATE NOT NULL,
  reason_code VARCHAR(32) NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (day, reason_code)
);

CREATE INDEX IF NOT EXISTS idx_seer_reason_code_daily_rollup_day ON seer_reason_code_daily_rollup(day DESC);
CREATE INDEX IF NOT EXISTS idx_seer_reason_code_daily_rollup_code ON seer_reason_code_daily_rollup(reason_code);

CREATE OR REPLACE FUNCTION refresh_seer_analytics_rollup(p_start_date DATE, p_end_date DATE)
RETURNS VOID AS $$
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'p_start_date and p_end_date are required';
  END IF;

  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'p_start_date must be <= p_end_date';
  END IF;

  INSERT INTO seer_analytics_daily_rollup (
    day,
    total_events,
    allowed_events,
    warned_events,
    delayed_events,
    blocked_events,
    score_set_events,
    appeals_opened,
    appeals_resolved,
    unique_subjects,
    avg_score_delta_abs,
    avg_confidence,
    updated_at
  )
  SELECT
    day,
    COUNT(*)::int AS total_events,
    COUNT(*) FILTER (WHERE event_type = 'seer_action_allowed')::int AS allowed_events,
    COUNT(*) FILTER (WHERE event_type = 'seer_action_warned')::int AS warned_events,
    COUNT(*) FILTER (WHERE event_type = 'seer_action_delayed')::int AS delayed_events,
    COUNT(*) FILTER (WHERE event_type = 'seer_action_blocked')::int AS blocked_events,
    COUNT(*) FILTER (WHERE event_type = 'seer_score_set')::int AS score_set_events,
    COUNT(*) FILTER (WHERE event_type = 'seer_appeal_opened')::int AS appeals_opened,
    COUNT(*) FILTER (WHERE event_type = 'seer_appeal_resolved')::int AS appeals_resolved,
    COUNT(DISTINCT user_id)::int AS unique_subjects,
    COALESCE(
      AVG(
        CASE
          WHEN (event_data ->> 'score_delta') ~ '^-?[0-9]+(\.[0-9]+)?$'
          THEN ABS((event_data ->> 'score_delta')::numeric)
        END
      ),
      0
    )::numeric(18, 6) AS avg_score_delta_abs,
    COALESCE(
      AVG(
        CASE
          WHEN (event_data ->> 'confidence') ~ '^[0-9]+(\.[0-9]+)?$'
          THEN (event_data ->> 'confidence')::numeric
        END
      ),
      0
    )::numeric(18, 6) AS avg_confidence,
    NOW() AS updated_at
  FROM (
    SELECT
      DATE_TRUNC('day', timestamp)::date AS day,
      event_type,
      event_data,
      user_id
    FROM analytics_events
    WHERE event_type LIKE 'seer_%'
      AND timestamp >= p_start_date::timestamp
      AND timestamp < (p_end_date::timestamp + INTERVAL '1 day')
  ) AS filtered
  GROUP BY day
  ON CONFLICT (day)
  DO UPDATE SET
    total_events = EXCLUDED.total_events,
    allowed_events = EXCLUDED.allowed_events,
    warned_events = EXCLUDED.warned_events,
    delayed_events = EXCLUDED.delayed_events,
    blocked_events = EXCLUDED.blocked_events,
    score_set_events = EXCLUDED.score_set_events,
    appeals_opened = EXCLUDED.appeals_opened,
    appeals_resolved = EXCLUDED.appeals_resolved,
    unique_subjects = EXCLUDED.unique_subjects,
    avg_score_delta_abs = EXCLUDED.avg_score_delta_abs,
    avg_confidence = EXCLUDED.avg_confidence,
    updated_at = NOW();

  INSERT INTO seer_reason_code_daily_rollup (
    day,
    reason_code,
    count,
    updated_at
  )
  SELECT
    DATE_TRUNC('day', timestamp)::date AS day,
    COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code') AS reason_code,
    COUNT(*)::int AS count,
    NOW() AS updated_at
  FROM analytics_events
  WHERE event_type IN ('seer_reason_code', 'seer_action_blocked', 'seer_action_delayed', 'seer_action_warned')
    AND timestamp >= p_start_date::timestamp
    AND timestamp < (p_end_date::timestamp + INTERVAL '1 day')
    AND COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code') IS NOT NULL
  GROUP BY DATE_TRUNC('day', timestamp)::date, COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code')
  ON CONFLICT (day, reason_code)
  DO UPDATE SET
    count = EXCLUDED.count,
    updated_at = NOW();

  DELETE FROM seer_reason_code_daily_rollup
  WHERE day >= p_start_date
    AND day <= p_end_date
    AND (day, reason_code) NOT IN (
      SELECT
        DATE_TRUNC('day', timestamp)::date AS day,
        COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code') AS reason_code
      FROM analytics_events
      WHERE event_type IN ('seer_reason_code', 'seer_action_blocked', 'seer_action_delayed', 'seer_action_warned')
        AND timestamp >= p_start_date::timestamp
        AND timestamp < (p_end_date::timestamp + INTERVAL '1 day')
        AND COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code') IS NOT NULL
      GROUP BY DATE_TRUNC('day', timestamp)::date, COALESCE(event_data ->> 'reasonCode', event_data ->> 'reason_code')
    );

  DELETE FROM seer_analytics_daily_rollup
  WHERE day >= p_start_date
    AND day <= p_end_date
    AND day NOT IN (
      SELECT DATE_TRUNC('day', timestamp)::date
      FROM analytics_events
      WHERE event_type LIKE 'seer_%'
        AND timestamp >= p_start_date::timestamp
        AND timestamp < (p_end_date::timestamp + INTERVAL '1 day')
      GROUP BY DATE_TRUNC('day', timestamp)::date
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
