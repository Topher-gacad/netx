import { useStore } from 'zustand';
import { uiStore } from '@netx/kernel';

export function StatusBar() {
  const statusBarItems = useStore(uiStore, (s) => s.statusBarItems);

  const leftItems = statusBarItems
    .filter((i) => i.align === 'left')
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const rightItems = statusBarItems
    .filter((i) => i.align === 'right')
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '24px',
        background: 'var(--bg-tertiary)',
        borderTop: '1px solid var(--border-color)',
        padding: '0 12px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {leftItems.map((item) => {
          const Comp = item.component;
          return <Comp key={item.id} />;
        })}
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {rightItems.map((item) => {
          const Comp = item.component;
          return <Comp key={item.id} />;
        })}
      </div>
    </div>
  );
}
