'use client';

import { useCallback, useEffect, useState } from 'react';

import { Dashboard } from '@/components/Dashboard';
import {
  buildFlagsUrl,
  DEFAULT_FLAGS_PARAMS,
  groupFlags,
  isFullyRolledOutThresholdFlag,
  mergeFullyRolledOutTimestamps,
} from '@/lib/flags';
import {
  readFullyRolledOutStorage,
  writeFullyRolledOutStorage,
} from '@/lib/fullyRolledOutStorage';
import type { FlagValue, GroupedFlag } from '@/lib/types';

type FlagsApiResponse = {
  flags: Record<string, FlagValue>;
  fetchedAt: string;
  source: string;
  error?: string;
};

export function FeatureFlagsDashboard() {
  const [flags, setFlags] = useState<GroupedFlag[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFlags = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await fetch('/api/flags');
      const payload = (await response.json()) as FlagsApiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to load feature flags');
      }

      const currentlyFullyRolledOut = Object.entries(payload.flags)
        .filter(([, value]) => isFullyRolledOutThresholdFlag(value))
        .map(([name]) => name);

      const existingStorage = readFullyRolledOutStorage();
      const updatedStorage = mergeFullyRolledOutTimestamps(
        existingStorage,
        currentlyFullyRolledOut,
      );
      writeFullyRolledOutStorage(updatedStorage);

      setFlags(groupFlags(payload.flags, updatedStorage));
      setFetchedAt(payload.fetchedAt);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load feature flags';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-600">
          Loading feature flags…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Unable to load flags
          </h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => void loadFlags(true)}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Dashboard
        flags={flags}
        fetchedAt={fetchedAt}
        sourceUrl={buildFlagsUrl(DEFAULT_FLAGS_PARAMS)}
        onRefresh={() => void loadFlags(true)}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}
