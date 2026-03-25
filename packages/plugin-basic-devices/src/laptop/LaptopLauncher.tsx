import { useState, useEffect } from 'react';
import type { ID } from '@netx/sdk';

let launcherDeviceId: ID | null = null;
let launcherForceUpdate: (() => void) | null = null;
let onChoiceFn: ((choice: 'terminal' | 'wifi' | 'network') => void) | null = null;

export function openLaptopLauncher(deviceId: ID, onChoice: (choice: 'terminal' | 'wifi' | 'network') => void) {
  launcherDeviceId = deviceId;
  onChoiceFn = onChoice;
  launcherForceUpdate?.();
}

export function closeLaptopLauncher() {
  launcherDeviceId = null;
  onChoiceFn = null;
  launcherForceUpdate?.();
}

export function LaptopLauncherPanel() {
  const [, setTick] = useState(0);

  useEffect(() => {
    launcherForceUpdate = () => setTick((t) => t + 1);
    return () => { launcherForceUpdate = null; };
  }, []);

  if (!launcherDeviceId) return null;

  const handleChoice = (choice: 'terminal' | 'wifi' | 'network') => {
    const fn = onChoiceFn;
    closeLaptopLauncher();
    fn?.(choice);
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0078d4', color: '#fff',
    }}>
      {/* Windows-style header */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #0078d4, #005a9e)',
        borderBottom: '1px solid #005a9e',
      }}>
        <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>Windows 11</div>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>What would you like to do?</div>
      </div>

      {/* Options */}
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f3f3f3' }}>

        {/* Command Prompt */}
        <button
          onClick={() => handleChoice('terminal')}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px', background: '#fff', border: '1px solid #e0e0e0',
            borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0078d4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,120,212,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{
            width: '40px', height: '40px', borderRadius: '8px', background: '#1a1a1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color: '#00ff88', fontSize: '16px', fontFamily: 'monospace', fontWeight: 700 }}>&gt;_</span>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>Command Prompt</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Open terminal — ping, ipconfig, traceroute</div>
          </div>
        </button>

        {/* WiFi Settings */}
        <button
          onClick={() => handleChoice('wifi')}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px', background: '#fff', border: '1px solid #e0e0e0',
            borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0078d4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,120,212,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{
            width: '40px', height: '40px', borderRadius: '8px', background: '#0078d4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M2 10a14 14 0 0120 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <path d="M6 14a8 8 0 0112 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="18" r="2" fill="#fff" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>WiFi Settings</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Connect to wireless network, view available SSIDs</div>
          </div>
        </button>

      </div>

      {/* Footer */}
      <div style={{ padding: '8px 16px', background: '#e8e8e8', borderTop: '1px solid #d0d0d0', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', color: '#888' }}>Tip: Use Command Prompt for ipconfig /release, /renew, and ping</span>
      </div>
    </div>
  );
}
