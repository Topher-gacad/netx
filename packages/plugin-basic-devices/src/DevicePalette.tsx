import { useCallback } from 'react';
import type { CanvasAPI } from '@netx/sdk';
import { SwitchIcon } from './icons/SwitchIcon.js';
import { RouterIcon } from './icons/RouterIcon.js';
import { PCIcon } from './icons/PCIcon.js';
import { ServerIcon } from './icons/ServerIcon.js';
import { FirewallIcon } from './icons/FirewallIcon.js';
import { HubIcon } from './icons/HubIcon.js';
import { WirelessAPIcon } from './icons/WirelessAPIcon.js';
import { L3SwitchIcon } from './icons/L3SwitchIcon.js';
import { PfSenseIcon } from './icons/PfSenseIcon.js';
import { TpLinkIcon } from './icons/TpLinkIcon.js';
import { LaptopIcon } from './icons/LaptopIcon.js';
import { IPPhoneIcon } from './icons/IPPhoneIcon.js';
import { PrinterIcon } from './icons/PrinterIcon.js';
import { NASIcon } from './icons/NASIcon.js';
import { Switch24Icon } from './icons/Switch24Icon.js';
import { UnmanagedSwitchIcon } from './icons/UnmanagedSwitchIcon.js';

const DEVICE_ENTRIES = [
  // --- Network Infrastructure ---
  { type: 'router', label: 'Router', icon: RouterIcon, desc: 'Cisco ISR 1941' },
  { type: 'switch', label: 'Switch 8', icon: SwitchIcon, desc: 'Catalyst 2960, 8-port (L2)' },
  { type: 'switch-24', label: 'Switch 24', icon: Switch24Icon, desc: 'Catalyst 2960, 24-port (L2)' },
  { type: 'switch-unmanaged', label: 'Unmanaged SW', icon: UnmanagedSwitchIcon, desc: '5-Port, no config (plug & play)' },
  { type: 'l3-switch', label: 'L3 Switch', icon: L3SwitchIcon, desc: 'Catalyst 3560 (Routes + Switches)' },
  // --- Security & Firewalls ---
  { type: 'firewall', label: 'Firewall', icon: FirewallIcon, desc: 'Cisco ASA 5505 (CLI)' },
  { type: 'pfsense', label: 'pfSense', icon: PfSenseIcon, desc: 'Netgate SG-3100 (Web GUI)' },
  { type: 'tplink', label: 'TP-Link', icon: TpLinkIcon, desc: 'Archer AX50 (Home Router)' },
  // --- Endpoints ---
  { type: 'pc', label: 'PC', icon: PCIcon, desc: 'Desktop Workstation' },
  { type: 'laptop', label: 'Laptop', icon: LaptopIcon, desc: 'Portable (WiFi + Ethernet)' },
  { type: 'server', label: 'Server', icon: ServerIcon, desc: 'Rack Server (2 NICs)' },
  { type: 'nas', label: 'NAS', icon: NASIcon, desc: 'Synology Storage (2 NICs)' },
  { type: 'ip-phone', label: 'IP Phone', icon: IPPhoneIcon, desc: 'Cisco 7941 (SW + PC ports)' },
  { type: 'printer', label: 'Printer', icon: PrinterIcon, desc: 'HP LaserJet (Network)' },
  // --- Other ---
  { type: 'hub', label: 'Hub', icon: HubIcon, desc: '4-Port Hub (broadcasts all)' },
  { type: 'wireless-ap', label: 'AP', icon: WirelessAPIcon, desc: 'Wireless Access Point' },
];

let paletteCanvas: CanvasAPI | null = null;

export function setCanvasAPI(api: CanvasAPI) {
  paletteCanvas = api;
}

export function DevicePalette() {
  const handleDragStart = useCallback((e: React.DragEvent, deviceType: string) => {
    e.dataTransfer.setData('netx/device-type', deviceType);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <div>
      <h3 style={{
        fontSize: '14px', fontWeight: 600, color: 'var(--accent)',
        marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        Devices
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.4' }}>
        Drag a device onto the canvas, or click to add at a random position.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {DEVICE_ENTRIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <div
              key={entry.type}
              draggable
              onDragStart={(e) => handleDragStart(e, entry.type)}
              onClick={() => {
                if (!paletteCanvas) return;
                const x = 150 + Math.random() * 300;
                const y = 100 + Math.random() * 200;
                paletteCanvas.addDevice(entry.type, { x, y });
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: '6px',
                color: 'var(--text-primary)', cursor: 'grab',
                textAlign: 'left', transition: 'border-color 0.15s',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              <div style={{ color: 'var(--accent)', flexShrink: 0 }}>
                <Icon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{entry.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{entry.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '14px', padding: '10px', background: 'var(--bg-primary)',
        borderRadius: '6px', border: '1px solid var(--border-color)',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Controls:</div>
        <ul style={{
          listStyle: 'none', padding: 0, fontSize: '12px',
          color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px',
        }}>
          <li><span style={{ color: 'var(--accent)' }}>Drag device</span> — Drop onto canvas</li>
          <li><span style={{ color: 'var(--accent)' }}>Drag on canvas</span> — Move device</li>
          <li><span style={{ color: 'var(--accent)' }}>Click port</span> — Start cable</li>
          <li><span style={{ color: 'var(--accent)' }}>Double-click device</span> — Open CLI</li>
          <li><span style={{ color: 'var(--accent)' }}>Scroll wheel</span> — Zoom</li>
          <li><span style={{ color: 'var(--accent)' }}>Delete key</span> — Remove selected</li>
        </ul>
      </div>
    </div>
  );
}
