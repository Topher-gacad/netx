export function HelloPanel() {
  return (
    <div>
      <h3
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--accent)',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Device Palette
      </h3>
      <p
        style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          marginBottom: '16px',
        }}
      >
        Use the toolbar to add devices. Click a port on one device, then click a port on another to connect them with a cable.
      </p>
      <div
        style={{
          padding: '12px',
          background: 'var(--bg-primary)',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Controls:
        </div>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            fontSize: '10px',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <li><span style={{ color: 'var(--accent)' }}>Click + Drag</span> — Move device</li>
          <li><span style={{ color: 'var(--accent)' }}>Click port</span> — Start connection</li>
          <li><span style={{ color: 'var(--accent)' }}>Mouse wheel</span> — Zoom in/out</li>
          <li><span style={{ color: 'var(--accent)' }}>Middle click + drag</span> — Pan</li>
          <li><span style={{ color: 'var(--accent)' }}>Shift + click</span> — Multi-select</li>
        </ul>
      </div>
    </div>
  );
}
