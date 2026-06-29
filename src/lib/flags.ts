import type {
  FlagValue,
  FullyRolledOutStorage,
  GroupedFlag,
  RawFlagEntry,
  ThresholdVariant,
} from './types';

export const FLAGS_API_URL =
  'https://client-config.api.cx.metamask.io/v1/flags';

export const DEFAULT_FLAGS_PARAMS = {
  client: 'mobile',
  distribution: 'main',
  environment: 'prod',
} as const;

export const FULLY_ROLLED_OUT_STORAGE_KEY = 'fullyRolledOut';
export const FULLY_ROLLED_OUT_DAYS_THRESHOLD = 180;

export function buildFlagsUrl(
  params: Record<string, string> = DEFAULT_FLAGS_PARAMS,
): string {
  const search = new URLSearchParams(params);
  return `${FLAGS_API_URL}?${search.toString()}`;
}

export function parseFlagsResponse(raw: RawFlagEntry[]): Record<string, FlagValue> {
  return raw.reduce<Record<string, FlagValue>>((accumulator, entry) => {
    const [name, value] = Object.entries(entry)[0] ?? [];
    if (name) {
      accumulator[name] = value;
    }
    return accumulator;
  }, {});
}

export function isThresholdFlag(value: FlagValue): boolean {
  return Array.isArray(value);
}

export function isThresholdVariant(value: unknown): value is ThresholdVariant {
  return typeof value === 'object' && value !== null && 'scope' in value;
}

export function isFullyRolledOutThresholdFlag(value: FlagValue): boolean {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  return value.every((item) => {
    if (!isThresholdVariant(item)) {
      return false;
    }

    return item.scope?.value === 1;
  });
}

export function groupFlags(
  flags: Record<string, FlagValue>,
  rolledOutTimestamps: FullyRolledOutStorage,
  now = new Date(),
): GroupedFlag[] {
  return Object.entries(flags)
    .map(([name, value]) => {
      const group: GroupedFlag['group'] = isThresholdFlag(value)
        ? 'threshold'
        : 'config';
      const isFullyRolledOut =
        group === 'threshold' && isFullyRolledOutThresholdFlag(value);
      const rolledOutSince = isFullyRolledOut
        ? (rolledOutTimestamps[name] ?? null)
        : null;
      const daysFullyRolledOut = rolledOutSince
        ? getDaysBetween(new Date(rolledOutSince), now)
        : null;

      return {
        name,
        value,
        group,
        isFullyRolledOut,
        rolledOutSince,
        daysFullyRolledOut,
        isOver180Days:
          daysFullyRolledOut !== null &&
          daysFullyRolledOut >= FULLY_ROLLED_OUT_DAYS_THRESHOLD,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function mergeFullyRolledOutTimestamps(
  existing: FullyRolledOutStorage,
  currentlyFullyRolledOut: string[],
  recordedAt = new Date().toISOString(),
): FullyRolledOutStorage {
  const next: FullyRolledOutStorage = { ...existing };

  for (const flagName of currentlyFullyRolledOut) {
    if (!next[flagName]) {
      next[flagName] = recordedAt;
    }
  }

  return next;
}

export function getDaysBetween(start: Date, end: Date): number {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const difference = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(difference / millisecondsPerDay));
}

export function formatDuration(days: number): string {
  if (days === 0) {
    return 'Less than 1 day';
  }

  if (days === 1) {
    return '1 day';
  }

  if (days < 30) {
    return `${days} days`;
  }

  const months = Math.floor(days / 30);
  const remainingDays = days % 30;

  if (days < 365) {
    return remainingDays > 0
      ? `${months} mo ${remainingDays} d`
      : `${months} mo`;
  }

  const years = Math.floor(days / 365);
  const remainingAfterYears = days % 365;
  const remainingMonths = Math.floor(remainingAfterYears / 30);

  return remainingMonths > 0
    ? `${years} yr ${remainingMonths} mo`
    : `${years} yr`;
}
