import type { Disposable, EventBus, EventHandler } from '@netx/sdk';

export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<EventHandler>>();

  function getOrCreate(event: string): Set<EventHandler> {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    return set;
  }

  const bus: EventBus = {
    emit(event: string, payload: unknown): void {
      const set = listeners.get(event);
      if (set) {
        for (const handler of set) {
          try {
            handler(payload);
          } catch (err) {
            console.error(`[EventBus] Error in handler for "${event}":`, err);
          }
        }
      }

      // Wildcard support: "canvas:device:added" also fires "canvas:*" listeners
      const parts = event.split(':');
      for (let i = parts.length - 1; i > 0; i--) {
        const wildcard = parts.slice(0, i).join(':') + ':*';
        const wildcardSet = listeners.get(wildcard);
        if (wildcardSet) {
          for (const handler of wildcardSet) {
            try {
              handler(payload);
            } catch (err) {
              console.error(`[EventBus] Error in wildcard handler for "${wildcard}":`, err);
            }
          }
        }
      }
    },

    on(event: string, handler: EventHandler): Disposable {
      const set = getOrCreate(event);
      set.add(handler);
      return {
        dispose() {
          set.delete(handler);
          if (set.size === 0) {
            listeners.delete(event);
          }
        },
      };
    },

    once(event: string, handler: EventHandler): Disposable {
      const wrapper: EventHandler = (payload) => {
        disposable.dispose();
        handler(payload);
      };
      const disposable = bus.on(event, wrapper);
      return disposable;
    },

    off(event: string, handler: EventHandler): void {
      const set = listeners.get(event);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          listeners.delete(event);
        }
      }
    },
  };

  return bus;
}
