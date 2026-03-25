import { useState, useEffect } from 'react';
import type { CanvasAPI, EventBus, ID } from '@netx/sdk';

interface PrinterConfig {
  hostname: string;
  network: {
    method: 'static' | 'dhcp';
    ip: string;
    mask: string;
    gateway: string;
    dns: string;
  };
  services: {
    ipp: boolean;
    lpd: boolean;
    airprint: boolean;
    snmp: boolean;
  };
  status: {
    tonerBlack: number;
    tonerCyan: number;
    tonerMagenta: number;
    tonerYellow: number;
    paperTray: 'OK' | 'Low' | 'Empty';
    jobsInQueue: number;
  };
  security: {
    adminPassword: string;
    webAccess: boolean;
  };
}

const printerConfigs = new Map<ID, PrinterConfig>();

export function getPrinterConfigs(): Record<string, PrinterConfig> {
  const result: Record<string, PrinterConfig> = {};
  for (const [id, cfg] of printerConfigs) result[id] = cfg;
  return result;
}

export function restorePrinterConfigs(data: Record<string, PrinterConfig>) {
  for (const [id, cfg] of Object.entries(data)) {
    printerConfigs.set(id, cfg);
  }
}

function getOrCreateConfig(deviceId: ID, label: string): PrinterConfig {
  let cfg = printerConfigs.get(deviceId);
  if (!cfg) {
    cfg = {
      hostname: label,
      network: { method: 'static', ip: '', mask: '255.255.255.0', gateway: '', dns: '8.8.8.8' },
      services: { ipp: true, lpd: true, airprint: false, snmp: true },
      status: { tonerBlack: 85, tonerCyan: 62, tonerMagenta: 44, tonerYellow: 71, paperTray: 'OK', jobsInQueue: 0 },
      security: { adminPassword: 'admin', webAccess: true },
    };
    printerConfigs.set(deviceId, cfg);
  }
  return cfg;
}

let prDeviceId: ID | null = null;
let prCanvasAPI: CanvasAPI | null = null;
let prEventBus: EventBus | null = null;
let prForceUpdate: (() => void) | null = null;

export function openPrinterGUI(deviceId: ID, canvasAPI: CanvasAPI, eventBus: EventBus) {
  prDeviceId = deviceId;
  prCanvasAPI = canvasAPI;
  prEventBus = eventBus;
  prForceUpdate?.();
}

export function closePrinterGUI() {
  prDeviceId = null;
  prForceUpdate?.();
}

function emitConfig(deviceId: ID, config: PrinterConfig) {
  if (!prEventBus || !prCanvasAPI) return;

  const interfaces = new Map<string, { ip?: string; mask?: string; shutdown: boolean }>();
  interfaces.set('Ethernet0', { ip: config.network.ip || undefined, mask: config.network.mask, shutdown: false });

  prEventBus.emit('cli:config-changed', {
    deviceId,
    config: {
      hostname: config.hostname,
      interfaces,
      staticRoutes: config.network.gateway
        ? [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: config.network.gateway }]
        : [],
    },
  });

  const ips: string[] = [];
  if (config.network.ip) ips.push(config.network.ip);

  prCanvasAPI.updateDevice(deviceId, {
    label: config.hostname,
    config: { ...prCanvasAPI.getDevice(deviceId)?.config, ips, hostname: config.hostname },
  });
}

export function PrinterGUIPanel() {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('status');

  useEffect(() => {
    prForceUpdate = () => setTick((t) => t + 1);
    return () => { prForceUpdate = null; };
  }, []);

  if (!prDeviceId || !prCanvasAPI) return null;
  const device = prCanvasAPI.getDevice(prDeviceId);
  if (!device) return null;

  const config = getOrCreateConfig(prDeviceId, device.label);

  const tabs = [
    { id: 'status', label: 'Status' },
    { id: 'network', label: 'Network' },
    { id: 'services', label: 'Print Services' },
    { id: 'security', label: 'Security' },
  ];

  const update = (partial: Partial<PrinterConfig>) => {
    const updated = { ...config, ...partial };
    printerConfigs.set(prDeviceId!, updated);
    emitConfig(prDeviceId!, updated);
    setTick((t) => t + 1);
  };

  const inputStyle: React.CSSProperties = {
    padding: '5px 8px', background: '#fff', border: '1px solid #ccc',
    borderRadius: '3px', color: '#333', fontSize: '13px', width: '100%', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#666', marginBottom: '3px', display: 'block' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f8f8', color: '#333' }}>
      {/* HP-style header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 14px',
        background: '#0096d6', color: '#fff',
      }}>
        <span style={{ fontWeight: 700, fontSize: '15px', marginRight: '10px' }}>HP</span>
        <span style={{ fontSize: '12px' }}>Embedded Web Server — {config.hostname}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#e8e8e8', borderBottom: '2px solid #0096d6' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px', background: activeTab === tab.id ? '#fff' : '#e8e8e8',
              border: 'none', borderTop: activeTab === tab.id ? '2px solid #0096d6' : '2px solid transparent',
              color: activeTab === tab.id ? '#0096d6' : '#666', fontSize: '12px',
              cursor: 'pointer', fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>

        {activeTab === 'status' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#0096d6', marginBottom: '12px' }}>Printer Status</h3>
            <div style={{ padding: '14px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4caf50' }} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Ready</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px', fontSize: '13px' }}>
                <span style={{ color: '#888' }}>Model:</span><span>HP LaserJet Pro MFP</span>
                <span style={{ color: '#888' }}>IP Address:</span>
                <span style={{ color: config.network.ip ? '#0096d6' : '#cc0000' }}>
                  {config.network.ip || 'Not configured'}
                </span>
                <span style={{ color: '#888' }}>Paper Tray:</span>
                <span style={{ color: config.status.paperTray === 'OK' ? '#4caf50' : '#ff9800' }}>
                  {config.status.paperTray}
                </span>
                <span style={{ color: '#888' }}>Jobs in Queue:</span><span>{config.status.jobsInQueue}</span>
              </div>
            </div>

            {/* Toner levels */}
            <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Supply Levels</h4>
            {[
              { name: 'Black', level: config.status.tonerBlack, color: '#333' },
              { name: 'Cyan', level: config.status.tonerCyan, color: '#00bcd4' },
              { name: 'Magenta', level: config.status.tonerMagenta, color: '#e91e63' },
              { name: 'Yellow', level: config.status.tonerYellow, color: '#ffeb3b' },
            ].map((toner) => (
              <div key={toner.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ width: '60px', fontSize: '12px', color: '#666' }}>{toner.name}</span>
                <div style={{ flex: 1, height: '14px', background: '#e8e8e8', borderRadius: '7px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${toner.level}%`, height: '100%', borderRadius: '7px',
                    background: toner.color, transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ width: '35px', fontSize: '12px', color: '#666', textAlign: 'right' }}>{toner.level}%</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'network' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#0096d6', marginBottom: '12px' }}>Network Configuration</h3>
            <div style={{ padding: '14px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>IP Configuration Method</label>
                <select style={{ ...inputStyle, width: '200px' }} value={config.network.method}
                  onChange={(e) => update({ network: { ...config.network, method: e.target.value as 'static' | 'dhcp' } })}>
                  <option value="static">Manual (Static IP)</option>
                  <option value="dhcp">Automatic (DHCP)</option>
                </select>
              </div>

              {config.network.method === 'static' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>IP Address</label>
                    <input style={inputStyle} value={config.network.ip} placeholder="e.g., 192.168.1.50"
                      onChange={(e) => update({ network: { ...config.network, ip: e.target.value } })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Subnet Mask</label>
                    <input style={inputStyle} value={config.network.mask}
                      onChange={(e) => update({ network: { ...config.network, mask: e.target.value } })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Default Gateway</label>
                    <input style={inputStyle} value={config.network.gateway}
                      onChange={(e) => update({ network: { ...config.network, gateway: e.target.value } })} />
                  </div>
                  <div>
                    <label style={labelStyle}>DNS Server</label>
                    <input style={inputStyle} value={config.network.dns}
                      onChange={(e) => update({ network: { ...config.network, dns: e.target.value } })} />
                  </div>
                </div>
              )}

              {config.network.method === 'dhcp' && (
                <div style={{ padding: '10px', background: '#f0f8ff', borderRadius: '4px', fontSize: '13px', color: '#0096d6' }}>
                  Printer will obtain IP address automatically from DHCP server.
                  Use "ipconfig /renew" equivalent on the printer's LCD panel.
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <label style={labelStyle}>Hostname</label>
                <input style={{ ...inputStyle, width: '200px' }} value={config.hostname}
                  onChange={(e) => update({ hostname: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#0096d6', marginBottom: '12px' }}>Print Services</h3>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
              Enable protocols that allow devices on the network to send print jobs.
            </p>
            {[
              { key: 'ipp', label: 'IPP (Internet Printing Protocol)', desc: 'Modern print protocol. Used by Windows, macOS, Linux. Recommended.', port: '631' },
              { key: 'lpd', label: 'LPD/LPR (Line Printer Daemon)', desc: 'Legacy Unix print protocol. Compatible with older systems.', port: '515' },
              { key: 'airprint', label: 'AirPrint', desc: 'Apple devices can print without installing drivers. Works over Bonjour/mDNS.', port: '631 (Bonjour)' },
              { key: 'snmp', label: 'SNMP (Simple Network Management Protocol)', desc: 'Allows network monitoring tools to check printer status, toner levels, paper jams.', port: '161' },
            ].map((svc) => (
              <div key={svc.key} style={{
                padding: '12px', background: '#fff', borderRadius: '6px',
                border: `1px solid ${config.services[svc.key as keyof typeof config.services] ? '#4caf5040' : '#ddd'}`,
                marginBottom: '6px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{svc.label}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.services[svc.key as keyof typeof config.services]}
                      onChange={(e) => update({ services: { ...config.services, [svc.key]: e.target.checked } })} />
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      color: config.services[svc.key as keyof typeof config.services] ? '#4caf50' : '#999',
                    }}>
                      {config.services[svc.key as keyof typeof config.services] ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>{svc.desc}</div>
                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>Port: {svc.port}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#0096d6', marginBottom: '12px' }}>Security Settings</h3>
            <div style={{ padding: '14px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Administrator Password</label>
                <input style={{ ...inputStyle, width: '200px' }} type="password" value={config.security.adminPassword}
                  onChange={(e) => update({ security: { ...config.security, adminPassword: e.target.value } })} />
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                  Used to access this web interface. Default: admin
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={config.security.webAccess}
                  onChange={(e) => update({ security: { ...config.security, webAccess: e.target.checked } })} />
                Allow Web Access (Embedded Web Server)
              </label>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', marginLeft: '26px' }}>
                If disabled, the printer can only be managed from its LCD control panel.
              </div>
            </div>

            <div style={{ padding: '12px', background: '#fff8e1', borderRadius: '6px', border: '1px solid #ffe082', marginTop: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f57f17', marginBottom: '4px' }}>Security Best Practice</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Always change the default admin password. Unsecured printers are a common entry point for network attacks.
                Disable SNMP if not needed for monitoring.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
