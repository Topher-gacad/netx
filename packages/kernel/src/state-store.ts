import { createStore } from 'zustand/vanilla';
import type { Disposable, StateStore } from '@netx/sdk';

type RootState = Record<string, Record<string, unknown>>;

const rootStore = createStore<RootState>(() => ({}));

export function createScopedStore(namespace: string): StateStore {
  return {
    get<T>(key: string): T | undefined {
      const state = rootStore.getState();
      return state[namespace]?.[key] as T | undefined;
    },

    set<T>(key: string, value: T): void {
      rootStore.setState((prev) => ({
        ...prev,
        [namespace]: {
          ...prev[namespace],
          [key]: value,
        },
      }));
    },

    subscribe<T>(key: string, listener: (value: T | undefined) => void): Disposable {
      let prev = this.get<T>(key);
      const unsub = rootStore.subscribe((state) => {
        const next = state[namespace]?.[key] as T | undefined;
        if (!Object.is(next, prev)) {
          prev = next;
          listener(next);
        }
      });
      return { dispose: unsub };
    },

    getSnapshot(): Record<string, unknown> {
      return { ...(rootStore.getState()[namespace] ?? {}) };
    },
  };
}

export function getRootStore() {
  return rootStore;
}

export function resetRootStore(): void {
  rootStore.setState({}, true);
}
