import { FULLY_ROLLED_OUT_STORAGE_KEY } from './flags';
import type { FullyRolledOutStorage } from './types';

export function readFullyRolledOutStorage(): FullyRolledOutStorage {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(FULLY_ROLLED_OUT_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<FullyRolledOutStorage>(
      (accumulator, [key, value]) => {
        if (typeof value === 'string') {
          accumulator[key] = value;
        }
        return accumulator;
      },
      {},
    );
  } catch {
    return {};
  }
}

export function writeFullyRolledOutStorage(
  storage: FullyRolledOutStorage,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    FULLY_ROLLED_OUT_STORAGE_KEY,
    JSON.stringify(storage),
  );
}
