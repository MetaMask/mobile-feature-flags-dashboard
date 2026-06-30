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

export type FlagGroup = 'boolean' | 'threshold' | 'config' | 'other';

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
  /** Primary type when consistent, otherwise mixed */
  group: FlagGroup | 'mixed';
  /** All types present across contexts */
  groups: FlagGroup[];
  /** True when any client has differing values across its environments */
  hasValueMismatch: boolean;
  /** Clients whose values differ across environments (e.g. mobile dev vs prod) */
  mismatchClients: FlagClient[];
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
  fullyRolledOut: FullyRolledOutStorage;
  rolloutTrackingEnabled: boolean;
  error?: string;
};
