import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

export function getConnectionString(): string {
  let rawNeonUrl = process.env.NEON_DATABASE_URL || "";
  if (rawNeonUrl) {
    rawNeonUrl = rawNeonUrl.replace(/^psql\s+/i, "").replace(/^'|'$/g, "");
  }
  return rawNeonUrl || process.env.DATABASE_URL || "";
}

const databaseUrl = getConnectionString();
const hasDatabase = !!databaseUrl;

const _pool = hasDatabase ? new Pool({ connectionString: databaseUrl }) : null;
const _db = _pool ? drizzle(_pool, { schema }) : null;

export const pool = _pool as InstanceType<typeof Pool>;
export const db = _db as ReturnType<typeof drizzle<typeof schema>>;
export { hasDatabase };

if (!hasDatabase) {
  console.log("[DB] No database URL found - running in no-database mode");
}
