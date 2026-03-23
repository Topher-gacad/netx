import type { Disposable } from './common.js';

export interface StateStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe<T>(key: string, listener: (value: T | undefined) => void): Disposable;
  getSnapshot(): Record<string, unknown>;
}
