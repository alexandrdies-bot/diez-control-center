import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

export const hasDatabaseUrl = Boolean(databaseUrl);

export const dbPool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })
  : null;

export async function checkDatabaseConnection() {
  if (!dbPool) {
    return {
      ok: false,
      reason: "DATABASE_URL is not configured"
    };
  }

  const result = await dbPool.query<{ now: string }>("select now()::text as now");

  return {
    ok: true,
    now: result.rows[0]?.now ?? null
  };
}
