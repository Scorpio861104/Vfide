import { Pool } from 'pg';

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_LOOKBACK_DAYS = 365;

function parseDays(value: string | undefined): number {
  if (!value) return DEFAULT_LOOKBACK_DAYS;
  if (!/^\d+$/.test(value.trim())) {
    throw new Error('days must be a positive integer');
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error('days must be a positive integer');
  }

  return Math.min(parsed, MAX_LOOKBACK_DAYS);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const lookbackDays = parseDays(process.argv[2] ?? process.env.SEER_ANALYTICS_ROLLUP_DAYS);

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query<{
      start_date: string;
      end_date: string;
      rows_updated: number;
    }>(
      `
      WITH bounds AS (
        SELECT
          (CURRENT_DATE - ($1::int - 1))::date AS start_date,
          CURRENT_DATE::date AS end_date
      ),
      refresh AS (
        SELECT refresh_seer_analytics_rollup(start_date, end_date)
        FROM bounds
      )
      SELECT
        b.start_date::text AS start_date,
        b.end_date::text AS end_date,
        (
          SELECT COUNT(*)::int
          FROM seer_analytics_daily_rollup s
          WHERE s.day BETWEEN b.start_date AND b.end_date
        ) AS rows_updated
      FROM bounds b
      CROSS JOIN refresh r
      `,
      [lookbackDays]
    );

    const row = result.rows[0];
    console.log(
      JSON.stringify(
        {
          success: true,
          lookbackDays,
          window: {
            startDate: row?.start_date ?? null,
            endDate: row?.end_date ?? null,
          },
          rowsUpdated: row?.rows_updated ?? 0,
        },
        null,
        2
      )
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
