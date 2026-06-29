export type FlagValue = unknown;

export type RawFlagEntry = Record<string, FlagValue>;

export type ThresholdVariant = {
  name?: string;
  scope?: {
    type?: string;
    value?: number;
  };
  value?: unknown;
};

export type FlagClient = 'mobile' | 'extension';
export type FlagEnvironment = 'dev' | 'prod' | 'test';
export type FlagDistribution = 'main';

export type FlagContext = {
  client: FlagClient;
  distribution: FlagDistribution;
  environment: FlagEnvironment;
};

export type ContextKey = `${FlagClient}/${FlagEnvironment}`;

export type FlagGroup = 'threshold' | 'config';

export type FlagVariant = {
  context: FlagContext;
  contextKey: ContextKey;
  value: FlagValue | null;
  present: boolean;
  group: FlagGroup;
  isFullyRolledOut: boolean;
  rolledOutSince: string | null;
  daysFullyRolledOut: number | null;
  isOver180Days: boolean;
};

export type FlagByName = {
  name: string;
  variants: FlagVariant[];
  group: FlagGroup | 'mixed';
  hasValueMismatch: boolean;
  presentIn: number;
  totalContexts: number;
};

/** @deprecated Use FlagByName for multi-context views */
export type GroupedFlag = {
  name: string;
  value: FlagValue;
  group: FlagGroup;
  isFullyRolledOut: boolean;
  rolledOutSince: string | null;
  daysFullyRolledOut: number | null;
  isOver180Days: boolean;
};

export type FlagsApiParams = {
  client: string;
  distribution: string;
  environment: string;
};

export type FullyRolledOutStorage = Record<string, string>;

export type ContextFlagsResult = {
  context: FlagContext;
  contextKey: ContextKey;
  flags: Record<string, FlagValue>;
  source: string;
  error?: string;
};

export type FlagsMatrixResponse = {
  contexts: ContextFlagsResult[];
  fetchedAt: string;
  distribution: FlagDistribution;
  error?: string;
};
