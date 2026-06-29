import { NextResponse } from 'next/server';

import {
  buildFlagsUrl,
  DEFAULT_FLAGS_PARAMS,
  parseFlagsResponse,
} from '@/lib/flags';
import type { RawFlagEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(buildFlagsUrl(DEFAULT_FLAGS_PARAMS), {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch flags (${response.status})` },
        { status: response.status },
      );
    }

    const raw = (await response.json()) as RawFlagEntry[];
    const flags = parseFlagsResponse(raw);

    return NextResponse.json({
      flags,
      fetchedAt: new Date().toISOString(),
      source: buildFlagsUrl(DEFAULT_FLAGS_PARAMS),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error fetching flags';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
