import { useStore } from 'zustand';
import { uiStore } from '@netx/kernel';
import { useAuth } from '../auth/AuthContext.js';

export function Toolbar() {
  const { user, logout } = useAuth();
  const toolbarItems = useStore(uiStore, (s) => s.toolbarItems);

  const sorted = [...toolbarItems].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  // Group items by group name
  const groups = new Map<string, typeof sorted>();
  for (const item of sorted) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        minHeight: '36px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '4px 12px',
        gap: '4px 8px',
      }}
    >
      {/* App title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
        <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '16px' }}>NetX</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>v0.1.0</span>
      </div>

      {/* Toolbar items from plugins */}
      {Array.from(groups.entries()).map(([group, items], gi) => (
        <div key={group} style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {gi > 0 && (
            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 6px' }} />
          )}
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                title={item.tooltip ?? item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: item.isActive?.() ? 'var(--bg-tertiary)' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User menu */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user.role === 'admin' && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('netx:toggle-admin'))}
              style={{
                padding: '4px 10px', background: 'var(--warning)15',
                border: '1px solid var(--warning)30', borderRadius: '4px',
                color: 'var(--warning)', cursor: 'pointer', fontSize: '11px',
              }}
            >
              Users
            </button>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {user.role === 'admin' && <span style={{ color: 'var(--warning)', marginRight: '4px' }}>Admin</span>}
            {user.username}
          </span>
          <button
            onClick={logout}
            style={{
              padding: '4px 10px', background: 'transparent',
              border: '1px solid var(--border-color)', borderRadius: '4px',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px',
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
