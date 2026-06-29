'use client';

import { useMemo, useState } from 'react';

import { formatContextLabel, formatDuration } from '@/lib/flags';
import type {
  FlagByName,
  FlagClient,
  FlagEnvironment,
  FlagVariant,
} from '@/lib/types';

type DashboardProps = {
  flags: FlagByName[];
  fetchedAt: string | null;
  selectedClients: FlagClient[];
  selectedEnvironments: FlagEnvironment[];
  onClientsChange: (clients: FlagClient[]) => void;
  onEnvironmentsChange: (environments: FlagEnvironment[]) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
};

type ActiveTab =
  | 'all'
  | 'threshold'
  | 'config'
  | 'rolled-out'
  | 'mismatches';

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function toggleSelection<T extends string>(
  current: T[],
  value: T,
  onChange: (next: T[]) => void,
) {
  if (current.includes(value)) {
    const next = current.filter((item) => item !== value);
    if (next.length > 0) {
      onChange(next);
    }
    return;
  }

  onChange([...current, value]);
}

function RolloutBadges({ variant }: { variant: FlagVariant }) {
  if (!variant.isFullyRolledOut || !variant.rolledOutSince) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
        Fully rolled out
      </span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
        {variant.daysFullyRolledOut !== null
          ? formatDuration(variant.daysFullyRolledOut)
          : '—'}
      </span>
      {variant.isOver180Days ? (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
          180+ days
        </span>
      ) : null}
    </div>
  );
}

function VariantCell({ variant }: { variant: FlagVariant }) {
  const [expanded, setExpanded] = useState(false);

  if (!variant.present) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
        Not present
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border px-3 py-3 ${
        variant.group === 'threshold'
          ? 'border-violet-200 bg-violet-50/50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              variant.group === 'threshold'
                ? 'bg-violet-100 text-violet-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {variant.group}
          </span>
          <RolloutBadges variant={variant} />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="shrink-0 rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>
      {expanded ? (
        <pre className="mt-3 max-h-48 overflow-auto rounded bg-slate-950 p-2 text-[11px] leading-relaxed text-slate-100">
          {formatJson(variant.value)}
        </pre>
      ) : null}
    </div>
  );
}

function FlagMatrixCard({ flag }: { flag: FlagByName }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="break-all font-mono text-sm font-semibold text-slate-900">
              {flag.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  flag.group === 'threshold'
                    ? 'bg-violet-100 text-violet-800'
                    : flag.group === 'config'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-orange-100 text-orange-800'
                }`}
              >
                {flag.group}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {flag.presentIn}/{flag.totalContexts} contexts
              </span>
              {flag.hasValueMismatch ? (
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-900">
                  Values differ
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {flag.variants.map((variant) => (
            <div key={variant.contextKey} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {formatContextLabel(variant.contextKey)}
              </p>
              <VariantCell variant={variant} />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleSelection(selected, option, onChange)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Dashboard({
  flags,
  fetchedAt,
  selectedClients,
  selectedEnvironments,
  onClientsChange,
  onEnvironmentsChange,
  onRefresh,
  isRefreshing,
}: DashboardProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');

  const contextCount = selectedClients.length * selectedEnvironments.length;

  const filteredFlags = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return flags.filter((flag) => {
      if (normalizedQuery && !flag.name.toLowerCase().includes(normalizedQuery)) {
        return false;
      }

      if (activeTab === 'threshold') {
        return flag.group === 'threshold' || flag.group === 'mixed';
      }

      if (activeTab === 'config') {
        return flag.group === 'config' || flag.group === 'mixed';
      }

      if (activeTab === 'rolled-out') {
        return flag.variants.some((variant) => variant.isFullyRolledOut);
      }

      if (activeTab === 'mismatches') {
        return flag.hasValueMismatch;
      }

      return true;
    });
  }, [activeTab, flags, query]);

  const fullyRolledOutCount = flags.filter((flag) =>
    flag.variants.some((variant) => variant.isFullyRolledOut),
  ).length;
  const mismatchCount = flags.filter((flag) => flag.hasValueMismatch).length;
  const thresholdCount = flags.filter(
    (flag) => flag.group === 'threshold' || flag.group === 'mixed',
  ).length;
  const configCount = flags.filter(
    (flag) => flag.group === 'config' || flag.group === 'mixed',
  ).length;

  const tabs: { id: ActiveTab; label: string; count: number }[] = [
    { id: 'all', label: 'All flags', count: flags.length },
    { id: 'threshold', label: 'Threshold', count: thresholdCount },
    { id: 'config', label: 'Config', count: configCount },
    { id: 'rolled-out', label: 'Fully rolled out', count: fullyRolledOutCount },
    { id: 'mismatches', label: 'Mismatches', count: mismatchCount },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
              MetaMask
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Feature Flags Dashboard
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Compare feature flags across clients and environments for the main
              distribution. Flags are grouped by name so you can see how each
              value differs between mobile/extension and dev/prod/test.
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Unique flag names</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {flags.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Contexts loaded</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {contextCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Value mismatches</p>
            <p className="mt-1 text-2xl font-semibold text-sky-700">
              {mismatchCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Fully rolled out</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">
              {fullyRolledOutCount}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">180+ days rolled out</p>
            <p className="mt-1 text-2xl font-semibold text-amber-900">
              {
                flags.filter((flag) =>
                  flag.variants.some((variant) => variant.isOver180Days),
                ).length
              }
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <FilterGroup
              label="Client"
              options={['mobile', 'extension'] as const}
              selected={selectedClients}
              onChange={onClientsChange}
            />
            <FilterGroup
              label="Environment"
              options={['dev', 'prod', 'test'] as const}
              selected={selectedEnvironments}
              onChange={onEnvironmentsChange}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              <p>
                Distribution: <span className="font-medium">main</span>
              </p>
              {fetchedAt ? (
                <p className="mt-1">
                  Last fetched: {new Date(fetchedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <label className="flex w-full max-w-md flex-col gap-1 text-sm text-slate-600 sm:items-end">
              <span>Search by flag name</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter flags"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2"
              />
            </label>
          </div>
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

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Flags grouped by name
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Each card shows one flag name with its values across the selected
            client and environment combinations.
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {filteredFlags.length} flag
            {filteredFlags.length === 1 ? '' : 's'} shown
          </p>
        </div>

        {filteredFlags.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No flags match the current filters.
          </p>
        ) : (
          <div className="grid gap-3">
            {filteredFlags.map((flag) => (
              <FlagMatrixCard key={flag.name} flag={flag} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
