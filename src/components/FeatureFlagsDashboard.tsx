'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Dashboard } from '@/components/Dashboard';
import {
  FLAG_CLIENTS,
  FLAG_ENVIRONMENTS,
  groupFlagsByName,
} from '@/lib/flags';
import type {
  FlagByName,
  FlagClient,
  FlagEnvironment,
  FlagsMatrixResponse,
} from '@/lib/types';

function buildFlagsApiUrl(
  clients: FlagClient[],
  environments: FlagEnvironment[],
): string {
  const params = new URLSearchParams({
    clients: clients.join(','),
    environments: environments.join(','),
  });

  return `/api/flags?${params.toString()}`;
}

export function FeatureFlagsDashboard() {
  const [flags, setFlags] = useState<FlagByName[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [rolloutTrackingEnabled, setRolloutTrackingEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedClients, setSelectedClients] =
    useState<FlagClient[]>(FLAG_CLIENTS);
  const [selectedEnvironments, setSelectedEnvironments] =
    useState<FlagEnvironment[]>(FLAG_ENVIRONMENTS);

  const loadFlags = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response = await fetch(
          buildFlagsApiUrl(selectedClients, selectedEnvironments),
        );
        const payload = (await response.json()) as FlagsMatrixResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load feature flags');
        }

        setFlags(groupFlagsByName(payload.contexts, payload.fullyRolledOut));
        setFetchedAt(payload.fetchedAt);
        setRolloutTrackingEnabled(payload.rolloutTrackingEnabled);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load feature flags';
        setFlags([]);
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedClients, selectedEnvironments],
  );

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  const contextCount = useMemo(
    () => selectedClients.length * selectedEnvironments.length,
    [selectedClients, selectedEnvironments],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm font-medium text-slate-600">
          Loading feature flags across {contextCount} contexts…
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
        rolloutTrackingEnabled={rolloutTrackingEnabled}
        selectedClients={selectedClients}
        selectedEnvironments={selectedEnvironments}
        onClientsChange={setSelectedClients}
        onEnvironmentsChange={setSelectedEnvironments}
        onRefresh={() => void loadFlags(true)}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}
