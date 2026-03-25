import { useState, useEffect } from 'react';
import type { CanvasAPI, EventBus, ID } from '@netx/sdk';

interface TpLinkConfig {
  deviceName: string;
  wan: { type: 'static' | 'dhcp'; ip: string; mask: string; gateway: string; dns: string };
  lan: { ip: string; mask: string };
  wifi: { enabled: boolean; ssid: string; password: string; channel: number; band: '2.4GHz' | '5GHz' | 'Both' };
  dhcp: { enabled: boolean; startIP: string; endIP: string; leaseTime: number };
  portForward: Array<{ id: number; externalPort: string; internalIP: string; internalPort: string; protocol: string; description: string }>;
  firewall: { spiEnabled: boolean; pingWan: boolean; remoteMgmt: boolean };
}

const tpConfigs = new Map<ID, TpLinkConfig>();

export function getTpLinkConfigs(): Record<string, TpLinkConfig> {
  const result: Record<string, TpLinkConfig> = {};
  for (const [id, cfg] of tpConfigs) result[id] = cfg;
  return result;
}

export function restoreTpLinkConfigs(data: Record<string, TpLinkConfig>) {
  for (const [id, cfg] of Object.entries(data)) {
    tpConfigs.set(id, cfg);
  }
}

function getOrCreateConfig(deviceId: ID, label: string): TpLinkConfig {
  let cfg = tpConfigs.get(deviceId);
  if (!cfg) {
    cfg = {
      deviceName: label,
      wan: { type: 'static', ip: '', mask: '255.255.255.0', gateway: '', dns: '8.8.8.8' },
      lan: { ip: '192.168.0.1', mask: '255.255.255.0' },
      wifi: { enabled: true, ssid: `TP-Link_${Math.random().toString(36).substring(2, 6).toUpperCase()}`, password: '', channel: 6, band: 'Both' },
      dhcp: { enabled: true, startIP: '192.168.0.100', endIP: '192.168.0.200', leaseTime: 120 },
      portForward: [],
      firewall: { spiEnabled: true, pingWan: false, remoteMgmt: false },
    };
    tpConfigs.set(deviceId, cfg);
  }
  return cfg;
}

// Called when TP-Link device is first added to canvas — emits default WiFi + DHCP + config
export function initTpLinkDevice(deviceId: ID, label: string, canvasAPI: CanvasAPI, eventBus: EventBus) {
  const cfg = getOrCreateConfig(deviceId, label);

  // Emit WiFi SSIDs
  eventBus.emit('wifi:ssid-clear', { deviceId });
  if (cfg.wifi.enabled && cfg.wifi.ssid) {
    if (cfg.wifi.band === '2.4GHz' || cfg.wifi.band === 'Both') {
      eventBus.emit('wifi:ssid-available', {
        deviceId, ssid: cfg.wifi.ssid, password: cfg.wifi.password,
        band: '2.4GHz', lanIP: cfg.lan.ip, lanMask: cfg.lan.mask,
      });
    }
    if (cfg.wifi.band === '5GHz' || cfg.wifi.band === 'Both') {
      eventBus.emit('wifi:ssid-available', {
        deviceId, ssid: cfg.wifi.ssid + '_5G', password: cfg.wifi.password,
        band: '5GHz', lanIP: cfg.lan.ip, lanMask: cfg.lan.mask,
      });
    }
  }

  // Register DHCP server — TP-Link has DHCP enabled by default
  if (cfg.dhcp.enabled && cfg.lan.ip) {
    eventBus.emit('pfsense:dhcp-available', {
      deviceId,
      network: cfg.lan.ip.split('.').slice(0, 3).join('.') + '.0',
      mask: cfg.lan.mask,
      gateway: cfg.lan.ip,
      rangeStart: cfg.dhcp.startIP,
      rangeEnd: cfg.dhcp.endIP,
    });
  }

  // Emit network config so packet engine knows about the TP-Link's LAN IP
  const interfaces = new Map<string, { ip?: string; mask?: string; shutdown: boolean }>();
  interfaces.set('LAN1', { ip: cfg.lan.ip || undefined, mask: cfg.lan.mask, shutdown: false });
  interfaces.set('LAN2', { shutdown: false });
  interfaces.set('LAN3', { shutdown: false });
  interfaces.set('LAN4', { shutdown: false });
  if (cfg.wan.ip) {
    interfaces.set('WAN', { ip: cfg.wan.ip, mask: cfg.wan.mask, shutdown: false });
  }

  eventBus.emit('cli:config-changed', {
    deviceId,
    config: {
      hostname: cfg.deviceName,
      interfaces,
      staticRoutes: cfg.wan.gateway ? [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: cfg.wan.gateway }] : [],
    },
  });
}

let tpDeviceId: ID | null = null;
let tpCanvasAPI: CanvasAPI | null = null;
let tpEventBus: EventBus | null = null;
let tpForceUpdate: (() => void) | null = null;

export function openTpLinkGUI(deviceId: ID, canvasAPI: CanvasAPI, eventBus: EventBus) {
  tpDeviceId = deviceId;
  tpCanvasAPI = canvasAPI;
  tpEventBus = eventBus;
  tpForceUpdate?.();
}

export function closeTpLinkGUI() {
  tpDeviceId = null;
  tpForceUpdate?.();
}

function emitConfig(deviceId: ID, config: TpLinkConfig) {
  if (!tpEventBus || !tpCanvasAPI) return;

  const interfaces = new Map<string, { ip?: string; mask?: string; shutdown: boolean }>();
  interfaces.set('WAN', { ip: config.wan.ip || undefined, mask: config.wan.mask, shutdown: false });
  // LAN ports are bridged internally — only register the IP once on LAN1
  // LAN2-4 are switch ports with no individual IP
  interfaces.set('LAN1', { ip: config.lan.ip || undefined, mask: config.lan.mask, shutdown: false });
  interfaces.set('LAN2', { shutdown: false });
  interfaces.set('LAN3', { shutdown: false });
  interfaces.set('LAN4', { shutdown: false });

  // Build ACLs from security settings
  const acls = new Map<number, { number: number; entries: Array<{ action: 'permit' | 'deny'; source: string; wildcard?: string }> }>();

  if (config.firewall.spiEnabled && !config.firewall.pingWan) {
    // Block ping (ICMP) from WAN — SPI blocks unsolicited inbound
    acls.set(100, { number: 100, entries: [
      { action: 'deny', source: 'any' },
    ] });
    // Apply to WAN interface inbound
    const wanIface = interfaces.get('WAN');
    if (wanIface) {
      interfaces.set('WAN', { ...wanIface, accessGroupIn: 100 });
    }
  }

  // If remote management is disabled, still allow LAN traffic
  if (config.firewall.spiEnabled) {
    // Ensure LAN→any is permitted
    acls.set(101, { number: 101, entries: [
      { action: 'permit', source: 'any' },
    ] });
    const lanIface = interfaces.get('LAN1');
    if (lanIface) {
      interfaces.set('LAN1', { ...lanIface, accessGroupIn: 101 });
    }
  }

  tpEventBus.emit('cli:config-changed', {
    deviceId,
    config: {
      hostname: config.deviceName,
      interfaces,
      staticRoutes: config.wan.gateway
        ? [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: config.wan.gateway }]
        : [],
      acls: acls.size > 0 ? acls : undefined,
    },
  });

  // Register DHCP if enabled
  if (config.dhcp.enabled && config.lan.ip) {
    tpEventBus.emit('pfsense:dhcp-available', {
      deviceId,
      network: config.lan.ip.split('.').slice(0, 3).join('.') + '.0',
      mask: config.lan.mask,
      gateway: config.lan.ip,
      rangeStart: config.dhcp.startIP,
      rangeEnd: config.dhcp.endIP,
    });
  }

  // Clear old SSIDs for this device first, then emit current ones
  tpEventBus.emit('wifi:ssid-clear', { deviceId });

  // Emit WiFi SSIDs based on band setting — just like real TP-Link
  if (config.wifi.enabled && config.wifi.ssid) {
    if (config.wifi.band === '2.4GHz' || config.wifi.band === 'Both') {
      tpEventBus.emit('wifi:ssid-available', {
        deviceId,
        ssid: config.wifi.ssid,
        password: config.wifi.password,
        band: '2.4GHz',
        lanIP: config.lan.ip,
        lanMask: config.lan.mask,
      });
    }
    if (config.wifi.band === '5GHz' || config.wifi.band === 'Both') {
      tpEventBus.emit('wifi:ssid-available', {
        deviceId,
        ssid: config.wifi.ssid + '_5G',
        password: config.wifi.password,
        band: '5GHz',
        lanIP: config.lan.ip,
        lanMask: config.lan.mask,
      });
    }
  }

  // Update canvas labels
  const ips: string[] = [];
  if (config.wan.ip) ips.push(`WAN: ${config.wan.ip}`);
  if (config.lan.ip) ips.push(`LAN: ${config.lan.ip}`);
  if (config.wifi.enabled) ips.push(`WiFi: ${config.wifi.ssid}`);

  tpCanvasAPI.updateDevice(deviceId, {
    label: config.deviceName,
    config: { ...tpCanvasAPI.getDevice(deviceId)?.config, ips, hostname: config.deviceName, wifiSSID: config.wifi.ssid, wifiEnabled: config.wifi.enabled },
  });
}

export function TpLinkGUIPanel() {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('status');

  useEffect(() => {
    tpForceUpdate = () => setTick((t) => t + 1);
    return () => { tpForceUpdate = null; };
  }, []);

  if (!tpDeviceId || !tpCanvasAPI) return null;

  const device = tpCanvasAPI.getDevice(tpDeviceId);
  if (!device) return null;

  const config = getOrCreateConfig(tpDeviceId, device.label);

  const tabs = [
    { id: 'status', label: 'Status' },
    { id: 'wan', label: 'Internet' },
    { id: 'wireless', label: 'Wireless' },
    { id: 'lan', label: 'LAN / DHCP' },
    { id: 'forwarding', label: 'Forwarding' },
    { id: 'security', label: 'Security' },
  ];

  const update = (partial: Partial<TpLinkConfig>) => {
    const updated = { ...config, ...partial };
    tpConfigs.set(tpDeviceId!, updated);
    emitConfig(tpDeviceId!, updated);
    setTick((t) => t + 1);
  };

  const inputStyle = {
    padding: '5px 8px', background: '#fff', border: '1px solid #d0d0d0',
    borderRadius: '3px', color: '#333', fontSize: '13px', width: '100%', outline: 'none',
  };
  const labelStyle = { fontSize: '12px', color: '#666', marginBottom: '3px', display: 'block' as const };
  const sectionStyle = { padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0', marginBottom: '10px' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f4f4', color: '#333' }}>
      {/* TP-Link header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 14px',
        background: '#00b4a0', color: '#fff',
      }}>
        <span style={{ fontWeight: 700, fontSize: '15px', marginRight: '10px' }}>TP-LINK</span>
        <span style={{ fontSize: '12px', opacity: 0.8 }}>Archer AX50 — {config.deviceName}</span>
      </div>

      {/* Tab navigation */}
      <div style={{
        display: 'flex', gap: '1px', background: '#e0e0e0',
        borderBottom: '2px solid #00b4a0',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px', background: activeTab === tab.id ? '#fff' : '#f0f0f0',
              border: 'none', borderTop: activeTab === tab.id ? '2px solid #00b4a0' : '2px solid transparent',
              color: activeTab === tab.id ? '#00b4a0' : '#666', fontSize: '12px',
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
            <h3 style={{ fontSize: '15px', color: '#00b4a0', marginBottom: '10px' }}>Router Status</h3>
            <div style={sectionStyle}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>Internet (WAN)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', fontSize: '13px' }}>
                <span style={{ color: '#888' }}>IP Address:</span>
                <span style={{ color: config.wan.ip ? '#00b4a0' : '#cc0000' }}>{config.wan.ip || 'Not configured'}</span>
                <span style={{ color: '#888' }}>Gateway:</span>
                <span>{config.wan.gateway || '—'}</span>
                <span style={{ color: '#888' }}>DNS:</span>
                <span>{config.wan.dns || '—'}</span>
              </div>
            </div>
            <div style={sectionStyle}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>Local Network (LAN)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', fontSize: '13px' }}>
                <span style={{ color: '#888' }}>IP Address:</span>
                <span style={{ color: '#00b4a0' }}>{config.lan.ip}</span>
                <span style={{ color: '#888' }}>DHCP Server:</span>
                <span style={{ color: config.dhcp.enabled ? '#00b4a0' : '#cc0000' }}>{config.dhcp.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            <div style={sectionStyle}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>Wireless</div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', fontSize: '13px' }}>
                <span style={{ color: '#888' }}>WiFi:</span>
                <span style={{ color: config.wifi.enabled ? '#00b4a0' : '#cc0000' }}>{config.wifi.enabled ? 'ON' : 'OFF'}</span>
                <span style={{ color: '#888' }}>SSID:</span>
                <span>{config.wifi.ssid}</span>
                <span style={{ color: '#888' }}>Band:</span>
                <span>{config.wifi.band}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wan' && (
          <div>
            <h3 style={{ fontSize: '15px', color: '#00b4a0', marginBottom: '10px' }}>Internet Settings</h3>
            <div style={sectionStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>WAN IP Address</label>
                  <input style={inputStyle} value={config.wan.ip} placeholder="e.g., 203.0.113.10"
                    onChange={(e) => update({ wan: { ...config.wan, ip: e.target.value } })} />
                </div>
                <div>
                  <label style={labelStyle}>Subnet Mask</label>
                  <input style={inputStyle} value={config.wan.mask}
                    onChange={(e) => update({ wan: { ...config.wan, mask: e.target.value } })} />
                </div>
                <div>
                  <label style={labelStyle}>Default Gateway</label>
                  <input style={inputStyle} value={config.wan.gateway} placeholder="e.g., 203.0.113.1"
                    onChange={(e) => update({ wan: { ...config.wan, gateway: e.target.value } })} />
                </div>
                <div>
                  <label style={labelStyle}>DNS Server</label>
                  <input style={inputStyle} value={config.wan.dns}
                    onChange={(e) => update({ wan: { ...config.wan, dns: e.target.value } })} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wireless' && (
          <div>
            <h3 style={{ fontSize: '15px', color: '#00b4a0', marginBottom: '10px' }}>Wireless Settings</h3>
            <div style={sectionStyle}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={config.wifi.enabled}
                  onChange={(e) => update({ wifi: { ...config.wifi, enabled: e.target.checked } })} />
                Enable Wireless Radio
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>Network Name (SSID)</label>
                  <input style={inputStyle} value={config.wifi.ssid}
                    onChange={(e) => update({ wifi: { ...config.wifi, ssid: e.target.value } })} />
                </div>
                <div>
                  <label style={labelStyle}>Password (WPA2)</label>
                  <input style={inputStyle} type="password" value={config.wifi.password} placeholder="Min 8 characters"
                    onChange={(e) => update({ wifi: { ...config.wifi, password: e.target.value } })} />
                </div>
                <div>
                  <label style={labelStyle}>Channel</label>
                  <select style={{ ...inputStyle, background: '#fff' }} value={config.wifi.channel}
                    onChange={(e) => update({ wifi: { ...config.wifi, channel: parseInt(e.target.value) } })}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((ch) => (
                      <option key={ch} value={ch}>Channel {ch}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Band</label>
                  <select style={{ ...inputStyle, background: '#fff' }} value={config.wifi.band}
                    onChange={(e) => update({ wifi: { ...config.wifi, band: e.target.value as TpLinkConfig['wifi']['band'] } })}>
                    <option value="2.4GHz">2.4 GHz</option>
                    <option value="5GHz">5 GHz</option>
                    <option value="Both">Both (Dual Band)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lan' && (
          <div>
            <h3 style={{ fontSize: '15px', color: '#00b4a0', marginBottom: '10px' }}>LAN & DHCP Settings</h3>
            <div style={sectionStyle}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>LAN IP</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Router LAN IP</label>
                  <input style={inputStyle} value={config.lan.ip}
                    onChange={(e) => update({ lan: { ...config.lan, ip: e.target.value } })} />
                </div>
                <div>
                  <label style={labelStyle}>Subnet Mask</label>
                  <input style={inputStyle} value={config.lan.mask}
                    onChange={(e) => update({ lan: { ...config.lan, mask: e.target.value } })} />
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>DHCP Server</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={config.dhcp.enabled}
                  onChange={(e) => update({ dhcp: { ...config.dhcp, enabled: e.target.checked } })} />
                Enable DHCP Server
              </label>
              {config.dhcp.enabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>IP Pool Start</label>
                    <input style={inputStyle} value={config.dhcp.startIP}
                      onChange={(e) => update({ dhcp: { ...config.dhcp, startIP: e.target.value } })} />
                  </div>
                  <div>
                    <label style={labelStyle}>IP Pool End</label>
                    <input style={inputStyle} value={config.dhcp.endIP}
                      onChange={(e) => update({ dhcp: { ...config.dhcp, endIP: e.target.value } })} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'forwarding' && (
          <div>
            <h3 style={{ fontSize: '15px', color: '#00b4a0', marginBottom: '10px' }}>Port Forwarding</h3>
            <div style={sectionStyle}>
              {config.portForward.length === 0 ? (
                <div style={{ color: '#999', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                  No port forwarding rules. Click below to add one.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '8px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                      {['Ext. Port', 'Int. IP', 'Int. Port', 'Protocol', 'Description'].map((h) => (
                        <th key={h} style={{ padding: '4px 6px', textAlign: 'left', color: '#888' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {config.portForward.map((rule) => (
                      <tr key={rule.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '4px 6px' }}>{rule.externalPort}</td>
                        <td style={{ padding: '4px 6px' }}>{rule.internalIP}</td>
                        <td style={{ padding: '4px 6px' }}>{rule.internalPort}</td>
                        <td style={{ padding: '4px 6px' }}>{rule.protocol}</td>
                        <td style={{ padding: '4px 6px', color: '#888' }}>{rule.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button
                onClick={() => update({
                  portForward: [...config.portForward, {
                    id: Date.now(), externalPort: '80', internalIP: '192.168.0.100',
                    internalPort: '80', protocol: 'TCP', description: 'Web server',
                  }],
                })}
                style={{
                  padding: '6px 14px', background: '#00b4a0', border: 'none',
                  borderRadius: '3px', color: '#fff', fontSize: '12px', cursor: 'pointer',
                }}
              >
                + Add Rule
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 style={{ fontSize: '15px', color: '#00b4a0', marginBottom: '10px' }}>Firewall / Security</h3>
            <div style={sectionStyle}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={config.firewall.spiEnabled}
                  onChange={(e) => update({ firewall: { ...config.firewall, spiEnabled: e.target.checked } })} />
                SPI Firewall (Stateful Packet Inspection)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={config.firewall.pingWan}
                  onChange={(e) => update({ firewall: { ...config.firewall, pingWan: e.target.checked } })} />
                Allow Ping from WAN (respond to ping from internet)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={config.firewall.remoteMgmt}
                  onChange={(e) => update({ firewall: { ...config.firewall, remoteMgmt: e.target.checked } })} />
                Remote Management (allow access from WAN)
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
