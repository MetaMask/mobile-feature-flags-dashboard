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

export type GroupedFlag = {
  name: string;
  value: FlagValue;
  group: 'threshold' | 'config';
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
