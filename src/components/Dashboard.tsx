'use client';

import { useMemo, useState } from 'react';

import { formatDuration } from '@/lib/flags';
import type { GroupedFlag } from '@/lib/types';

type FlagSectionProps = {
  title: string;
  description: string;
  flags: GroupedFlag[];
  emptyMessage: string;
  showRolloutIndicators?: boolean;
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function RolloutBadges({ flag }: { flag: GroupedFlag }) {
  if (!flag.isFullyRolledOut || !flag.rolledOutSince) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
        Fully rolled out
      </span>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
        {flag.daysFullyRolledOut !== null
          ? formatDuration(flag.daysFullyRolledOut)
          : '—'}
      </span>
      {flag.isOver180Days ? (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
          180+ days — consider cleanup
        </span>
      ) : null}
    </div>
  );
}

function FlagCard({
  flag,
  showRolloutIndicators = false,
}: {
  flag: GroupedFlag;
  showRolloutIndicators?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="break-all font-mono text-sm font-semibold text-slate-900">
              {flag.name}
            </h3>
            {showRolloutIndicators ? <RolloutBadges flag={flag} /> : null}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {expanded ? 'Hide value' : 'Show value'}
          </button>
        </div>
        {expanded ? (
          <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
            {formatJson(flag.value)}
          </pre>
        ) : null}
      </div>
    </article>
  );
}

function FlagSection({
  title,
  description,
  flags,
  emptyMessage,
  showRolloutIndicators = false,
}: FlagSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          {flags.length} flag{flags.length === 1 ? '' : 's'}
        </p>
      </div>
      {flags.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-3">
          {flags.map((flag) => (
            <FlagCard
              key={flag.name}
              flag={flag}
              showRolloutIndicators={showRolloutIndicators}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type DashboardProps = {
  flags: GroupedFlag[];
  fetchedAt: string | null;
  sourceUrl: string;
  onRefresh: () => void;
  isRefreshing: boolean;
};

export function Dashboard({
  flags,
  fetchedAt,
  sourceUrl,
  onRefresh,
  isRefreshing,
}: DashboardProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'threshold' | 'config' | 'rolled-out'>(
    'threshold',
  );

  const filteredFlags = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return flags;
    }

    return flags.filter((flag) =>
      flag.name.toLowerCase().includes(normalizedQuery),
    );
  }, [flags, query]);

  const thresholdFlags = filteredFlags.filter(
    (flag) => flag.group === 'threshold',
  );
  const configFlags = filteredFlags.filter((flag) => flag.group === 'config');
  const fullyRolledOutFlags = thresholdFlags.filter(
    (flag) => flag.isFullyRolledOut,
  );
  const over180DayFlags = fullyRolledOutFlags.filter(
    (flag) => flag.isOver180Days,
  );

  const tabs = [
    {
      id: 'threshold' as const,
      label: 'Threshold',
      count: thresholdFlags.length,
    },
    {
      id: 'config' as const,
      label: 'Config',
      count: configFlags.length,
    },
    {
      id: 'rolled-out' as const,
      label: 'Fully rolled out',
      count: fullyRolledOutFlags.length,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
              MetaMask Mobile
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Feature Flags Dashboard
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Live view of production mobile feature flags. Threshold flags use
              array rollout configs; config flags are everything else. Fully
              rolled out threshold flags are tracked in local storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh flags'}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total flags</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {flags.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Threshold flags</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {flags.filter((flag) => flag.group === 'threshold').length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Fully rolled out</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">
              {fullyRolledOutFlags.length}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">180+ days rolled out</p>
            <p className="mt-1 text-2xl font-semibold text-amber-900">
              {over180DayFlags.length}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            <p>
              Source:{' '}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-600 hover:underline"
              >
                client-config API
              </a>
            </p>
            {fetchedAt ? (
              <p className="mt-1">
                Last fetched: {new Date(fetchedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <label className="flex w-full max-w-md flex-col gap-1 text-sm text-slate-600 sm:items-end">
            <span>Search flags</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by flag name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {activeTab === 'threshold' ? (
        <FlagSection
          title="Threshold flags"
          description="Array-based rollout flags. A flag is fully rolled out when every variant scope value is 1."
          flags={thresholdFlags}
          emptyMessage="No threshold flags match your search."
          showRolloutIndicators
        />
      ) : null}

      {activeTab === 'config' ? (
        <FlagSection
          title="Config flags"
          description="All non-array feature flag values."
          flags={configFlags}
          emptyMessage="No config flags match your search."
        />
      ) : null}

      {activeTab === 'rolled-out' ? (
        <FlagSection
          title="Fully rolled out threshold flags"
          description="Threshold flags where every array entry has scope.value = 1. Timestamps are stored in local storage under fullyRolledOut."
          flags={fullyRolledOutFlags}
          emptyMessage="No fully rolled out threshold flags match your search."
          showRolloutIndicators
        />
      ) : null}
    </div>
  );
}
