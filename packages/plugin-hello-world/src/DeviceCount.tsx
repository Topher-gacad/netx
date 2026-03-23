import { useEffect, useState } from 'react';

export function DeviceCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Simple polling for device count via DOM observation
    // In production, this would subscribe to the canvas store
    const interval = setInterval(() => {
      const devices = document.querySelectorAll('[data-device-id]');
      setCount(devices.length);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
      Devices: <span style={{ color: 'var(--accent)' }}>{count}</span>
    </span>
  );
}
