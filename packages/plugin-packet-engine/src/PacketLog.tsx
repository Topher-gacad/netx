import { useEffect, useState } from 'react';

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const logEntries: LogEntry[] = [];
let logId = 0;
let logUpdateFn: (() => void) | null = null;

export function addLogEntry(message: string, type: 'success' | 'error' | 'info') {
  const time = new Date().toLocaleTimeString();
  logEntries.push({ id: logId++, time, message, type });
  if (logEntries.length > 50) logEntries.shift();
  logUpdateFn?.();
}

export function PacketLog() {
  const [, setTick] = useState(0);

  useEffect(() => {
    logUpdateFn = () => setTick((t) => t + 1);
    return () => { logUpdateFn = null; };
  }, []);

  const colors = { success: '#00ff88', error: '#ff4444', info: '#00bceb' };

  return (
    <div style={{ height: '100%', overflow: 'auto', fontFamily: 'monospace', fontSize: '11px' }}>
      <h3 style={{
        fontSize: '11px', fontWeight: 600, color: 'var(--accent)',
        marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        Packet Log
      </h3>
      {logEntries.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          No packets sent yet. Use <span style={{ color: 'var(--accent)' }}>ping</span> in the CLI.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[...logEntries].reverse().map((entry) => (
            <div key={entry.id} style={{ display: 'flex', gap: '6px', lineHeight: '1.5' }}>
              <span style={{ color: '#555', flexShrink: 0 }}>{entry.time}</span>
              <span style={{ color: colors[entry.type] }}>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
