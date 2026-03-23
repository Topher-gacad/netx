import { useState, useEffect, useCallback } from 'react';
import type { EventBus } from '@netx/sdk';

interface Notification {
  id: number;
  message: string;
  level: 'info' | 'warn' | 'error';
}

const levelColors = {
  info: 'var(--accent)',
  warn: 'var(--warning)',
  error: 'var(--error)',
};

let nextId = 0;

export function NotificationToast({ eventBus }: { eventBus: EventBus }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((payload: { message: string; level: 'info' | 'warn' | 'error' }) => {
    const id = nextId++;
    setNotifications((prev) => [...prev.slice(-4), { id, ...payload }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    const disposable = eventBus.on('ui:notification', addNotification as (payload: unknown) => void);
    return () => disposable.dispose();
  }, [eventBus, addNotification]);

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '52px',
        right: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 1000,
      }}
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            border: `1px solid ${levelColors[n.level]}`,
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '12px',
            boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: levelColors[n.level],
              flexShrink: 0,
            }}
          />
          {n.message}
        </div>
      ))}
    </div>
  );
}
