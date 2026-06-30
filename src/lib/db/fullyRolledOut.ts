import { neon } from '@neondatabase/serverless';

import { buildFullyRolledOutKey } from '@/lib/flags';
import type { FullyRolledOutStorage } from '@/lib/types';

type FullyRolledOutRow = {
  context_key: string;
  flag_name: string;
  recorded_at: string;
};

let schemaReady: Promise<void> | null = null;

function getSql() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    return null;
  }

  return neon(connectionString);
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

export function parseFullyRolledOutKey(
  key: string,
): { contextKey: string; flagName: string } | null {
  const parts = key.split('/');

  if (parts.length < 3) {
    return null;
  }

  return {
    contextKey: `${parts[0]}/${parts[1]}`,
    flagName: parts.slice(2).join('/'),
  };
}

export async function ensureFullyRolledOutSchema(): Promise<void> {
  const sql = getSql();

  if (!sql) {
    return;
  }

  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS fully_rolled_out_flags (
        context_key VARCHAR(64) NOT NULL,
        flag_name VARCHAR(512) NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (context_key, flag_name)
      )
    `.then(() => undefined);
  }

  await schemaReady;
}

export async function getFullyRolledOutTimestamps(): Promise<FullyRolledOutStorage> {
  const sql = getSql();

  if (!sql) {
    return {};
  }

  await ensureFullyRolledOutSchema();

  const rows = (await sql`
    SELECT context_key, flag_name, recorded_at
    FROM fully_rolled_out_flags
  `) as FullyRolledOutRow[];

  return rows.reduce<FullyRolledOutStorage>((accumulator, row) => {
    accumulator[buildFullyRolledOutKey(row.context_key, row.flag_name)] =
      new Date(row.recorded_at).toISOString();

    return accumulator;
  }, {});
}

export async function recordNewFullyRolledOutFlags(
  keys: string[],
  recordedAt = new Date().toISOString(),
): Promise<void> {
  const sql = getSql();

  if (!sql || keys.length === 0) {
    return;
  }

  await ensureFullyRolledOutSchema();

  const entries = keys
    .map((key) => parseFullyRolledOutKey(key))
    .filter((entry): entry is { contextKey: string; flagName: string } =>
      Boolean(entry),
    );

  await Promise.all(
    entries.map(({ contextKey, flagName }) =>
      sql`
        INSERT INTO fully_rolled_out_flags (context_key, flag_name, recorded_at)
        VALUES (${contextKey}, ${flagName}, ${recordedAt})
        ON CONFLICT (context_key, flag_name) DO NOTHING
      `,
    ),
  );
}
