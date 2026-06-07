import pg from "pg";
import type { PoolClient, QueryResultRow } from "pg";

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

  try {
    const result = await dbPool.query<{ now: string }>("select now()::text as now");

    return {
      ok: true,
      now: result.rows[0]?.now ?? null
    };
  } catch (error) {
    const errorCode =
      error instanceof Error && "code" in error
        ? String(error.code)
        : "UNKNOWN";

    return {
      ok: false,
      reason: "DATABASE_CONNECTION_FAILED",
      code: errorCode
    };
  }
}

export async function queryDatabase<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = []
) {
  if (!dbPool) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await dbPool.query<T>(sql, params);
  return result.rows;
}

export async function withDatabaseTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!dbPool) {
    throw new Error("DATABASE_URL is not configured");
  }

  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
