import type {
  ContextFlagsResult,
  ContextKey,
  FlagByName,
  FlagClient,
  FlagContext,
  FlagEnvironment,
  FlagGroup,
  FlagValue,
  FlagVariant,
  FullyRolledOutStorage,
  GroupedFlag,
  RawFlagEntry,
  ThresholdVariant,
} from './types';

export const FLAGS_API_URL =
  'https://client-config.api.cx.metamask.io/v1/flags';

export const FLAG_DISTRIBUTION = 'main' as const;
export const FLAG_CLIENTS: FlagClient[] = ['mobile', 'extension'];
export const FLAG_ENVIRONMENTS: FlagEnvironment[] = ['dev', 'prod', 'test'];

export const DEFAULT_FLAGS_PARAMS = {
  client: 'mobile',
  distribution: FLAG_DISTRIBUTION,
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

export function getContextKey(
  client: FlagClient,
  environment: FlagEnvironment,
): ContextKey {
  return `${client}/${environment}`;
}

export function parseContextKey(contextKey: ContextKey): FlagContext {
  const [client, environment] = contextKey.split('/') as [
    FlagClient,
    FlagEnvironment,
  ];

  return {
    client,
    environment,
    distribution: FLAG_DISTRIBUTION,
  };
}

export function buildFullyRolledOutKey(
  contextKey: ContextKey,
  flagName: string,
): string {
  return `${contextKey}/${flagName}`;
}

export function getAllContexts(
  clients: FlagClient[] = FLAG_CLIENTS,
  environments: FlagEnvironment[] = FLAG_ENVIRONMENTS,
): FlagContext[] {
  return clients.flatMap((client) =>
    environments.map((environment) => ({
      client,
      environment,
      distribution: FLAG_DISTRIBUTION,
    })),
  );
}

export function parseFlagsResponse(
  raw: RawFlagEntry[],
): Record<string, FlagValue> {
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

export function getFlagGroup(value: FlagValue): FlagGroup {
  return isThresholdFlag(value) ? 'threshold' : 'config';
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

export function valuesAreEqual(
  left: FlagValue | null,
  right: FlagValue | null,
): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  return stableStringify(left) === stableStringify(right);
}

export function buildFlagVariant(
  context: FlagContext,
  flagName: string,
  value: FlagValue | undefined,
  rolledOutTimestamps: FullyRolledOutStorage,
  now = new Date(),
): FlagVariant {
  const contextKey = getContextKey(context.client, context.environment);
  const present = value !== undefined;
  const group = present ? getFlagGroup(value) : 'config';
  const isFullyRolledOut =
    present && group === 'threshold' && isFullyRolledOutThresholdFlag(value);
  const rolledOutSince = isFullyRolledOut
    ? (rolledOutTimestamps[buildFullyRolledOutKey(contextKey, flagName)] ??
      null)
    : null;
  const daysFullyRolledOut = rolledOutSince
    ? getDaysBetween(new Date(rolledOutSince), now)
    : null;

  return {
    context,
    contextKey,
    value: present ? value : null,
    present,
    group,
    isFullyRolledOut,
    rolledOutSince,
    daysFullyRolledOut,
    isOver180Days:
      daysFullyRolledOut !== null &&
      daysFullyRolledOut >= FULLY_ROLLED_OUT_DAYS_THRESHOLD,
  };
}

export function groupFlagsByName(
  contextResults: ContextFlagsResult[],
  rolledOutTimestamps: FullyRolledOutStorage,
  now = new Date(),
): FlagByName[] {
  const flagNames = new Set<string>();

  for (const result of contextResults) {
    for (const name of Object.keys(result.flags)) {
      flagNames.add(name);
    }
  }

  return [...flagNames]
    .map((name) => {
      const variants = contextResults.map((result) =>
        buildFlagVariant(
          result.context,
          name,
          result.flags[name],
          rolledOutTimestamps,
          now,
        ),
      );

      const presentVariants = variants.filter((variant) => variant.present);
      const groups = new Set(presentVariants.map((variant) => variant.group));
      const group: FlagByName['group'] =
        groups.size === 0
          ? 'config'
          : groups.size === 1
            ? [...groups][0]
            : 'mixed';

      const presentValues = presentVariants.map((variant) => variant.value);
      const hasAbsentContexts =
        presentVariants.length > 0 &&
        presentVariants.length < variants.length;
      const hasValueMismatch =
        hasAbsentContexts ||
        (presentValues.length > 1 &&
          presentValues.some(
            (value, index) =>
              index > 0 && !valuesAreEqual(presentValues[0], value),
          ));

      return {
        name,
        variants,
        group,
        hasValueMismatch,
        presentIn: presentVariants.length,
        totalContexts: variants.length,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function groupFlags(
  flags: Record<string, FlagValue>,
  rolledOutTimestamps: FullyRolledOutStorage,
  now = new Date(),
): GroupedFlag[] {
  return Object.entries(flags)
    .map(([name, value]) => {
      const group = getFlagGroup(value);
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
  fullyRolledOutKeys: string[],
  recordedAt = new Date().toISOString(),
): FullyRolledOutStorage {
  const next: FullyRolledOutStorage = { ...existing };

  for (const key of fullyRolledOutKeys) {
    if (!next[key]) {
      next[key] = recordedAt;
    }
  }

  return next;
}

export function collectFullyRolledOutKeys(
  contextResults: ContextFlagsResult[],
): string[] {
  const keys: string[] = [];

  for (const result of contextResults) {
    const contextKey = getContextKey(
      result.context.client,
      result.context.environment,
    );

    for (const [name, value] of Object.entries(result.flags)) {
      if (isFullyRolledOutThresholdFlag(value)) {
        keys.push(buildFullyRolledOutKey(contextKey, name));
      }
    }
  }

  return keys;
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

export function formatContextLabel(contextKey: ContextKey): string {
  const { client, environment } = parseContextKey(contextKey);
  return `${client} / ${environment}`;
}
