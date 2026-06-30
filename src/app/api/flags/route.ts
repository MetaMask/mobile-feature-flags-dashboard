import { NextResponse } from 'next/server';

import {
  getFullyRolledOutTimestamps,
  isDatabaseConfigured,
  recordNewFullyRolledOutFlags,
} from '@/lib/db/fullyRolledOut';
import {
  buildFlagsUrl,
  collectFullyRolledOutKeys,
  FLAG_CLIENTS,
  FLAG_DISTRIBUTION,
  FLAG_ENVIRONMENTS,
  getAllContexts,
  getContextKey,
  parseFlagsResponse,
} from '@/lib/flags';
import type {
  ContextFlagsResult,
  FlagClient,
  FlagEnvironment,
  RawFlagEntry,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

function parseListParam(
  value: string | null,
  allowed: readonly string[],
): string[] | null {
  if (!value) {
    return null;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const invalid = items.filter((item) => !allowed.includes(item));
  if (invalid.length > 0) {
    throw new Error(`Invalid parameter values: ${invalid.join(', ')}`);
  }

  return items;
}

async function fetchContextFlags(
  client: FlagClient,
  environment: FlagEnvironment,
): Promise<ContextFlagsResult> {
  const context = {
    client,
    environment,
    distribution: FLAG_DISTRIBUTION,
  };
  const contextKey = getContextKey(client, environment);
  const source = buildFlagsUrl({
    client,
    distribution: FLAG_DISTRIBUTION,
    environment,
  });

  try {
    const response = await fetch(source, { next: { revalidate: 60 } });

    if (!response.ok) {
      return {
        context,
        contextKey,
        flags: {},
        source,
        error: `Failed to fetch flags (${response.status})`,
      };
    }

    const raw = (await response.json()) as RawFlagEntry[];

    return {
      context,
      contextKey,
      flags: parseFlagsResponse(raw),
      source,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error fetching flags';

    return {
      context,
      contextKey,
      flags: {},
      source,
      error: message,
    };
  }
}

async function buildFlagsResponse(results: ContextFlagsResult[]) {
  const fullyRolledOutKeys = collectFullyRolledOutKeys(results);

  if (isDatabaseConfigured()) {
    await recordNewFullyRolledOutFlags(fullyRolledOutKeys);
  }

  const fullyRolledOut = await getFullyRolledOutTimestamps();

  return {
    contexts: results,
    fetchedAt: new Date().toISOString(),
    distribution: FLAG_DISTRIBUTION,
    fullyRolledOut,
    rolloutTrackingEnabled: isDatabaseConfigured(),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clients =
      (parseListParam(searchParams.get('clients'), FLAG_CLIENTS) as
        | FlagClient[]
        | null) ?? FLAG_CLIENTS;
    const environments =
      (parseListParam(searchParams.get('environments'), FLAG_ENVIRONMENTS) as
        | FlagEnvironment[]
        | null) ?? FLAG_ENVIRONMENTS;

    const contexts = getAllContexts(clients, environments);
    const results = await Promise.all(
      contexts.map(({ client, environment }) =>
        fetchContextFlags(client, environment),
      ),
    );

    const failedContexts = results.filter((result) => result.error);
    if (failedContexts.length === results.length) {
      return NextResponse.json(
        {
          error: failedContexts[0]?.error ?? 'Failed to fetch feature flags',
          ...(await buildFlagsResponse(results)),
        },
        { status: 502 },
      );
    }

    return NextResponse.json(await buildFlagsResponse(results));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error fetching flags';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
