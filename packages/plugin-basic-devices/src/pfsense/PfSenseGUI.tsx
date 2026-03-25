import { useState, useEffect } from 'react';
import type { CanvasAPI, EventBus, ID } from '@netx/sdk';

interface PfSenseConfig {
  hostname: string;
  domain: string;
  interfaces: {
    wan: { ip: string; mask: string; gateway: string; enabled: boolean };
    lan: { ip: string; mask: string; dhcpEnabled: boolean; dhcpStart: string; dhcpEnd: string; enabled: boolean };
    opt1: { ip: string; mask: string; description: string; enabled: boolean };
    opt2: { ip: string; mask: string; description: string; enabled: boolean };
  };
  firewallRules: Array<{
    id: number;
    iface: 'wan' | 'lan' | 'opt1' | 'opt2';
    action: 'pass' | 'block';
    protocol: 'any' | 'tcp' | 'udp' | 'icmp';
    source: string;
    destination: string;
    description: string;
  }>;
  natRules: Array<{
    id: number;
    type: 'port-forward' | 'outbound';
    iface: string;
    externalPort: string;
    internalIP: string;
    internalPort: string;
    description: string;
  }>;
  vlans: Array<{
    id: number;
    tag: number;
    parentInterface: 'lan' | 'opt1' | 'opt2';
    description: string;
    ip: string;
    mask: string;
  }>;
}

// Store configs per device
const pfConfigs = new Map<ID, PfSenseConfig>();

export function getPfSenseConfigs(): Record<string, PfSenseConfig> {
  const result: Record<string, PfSenseConfig> = {};
  for (const [id, cfg] of pfConfigs) result[id] = cfg;
  return result;
}

export function restorePfSenseConfigs(data: Record<string, PfSenseConfig>) {
  for (const [id, cfg] of Object.entries(data)) {
    pfConfigs.set(id, cfg);
  }
}

function getOrCreateConfig(deviceId: ID, label: string): PfSenseConfig {
  let cfg = pfConfigs.get(deviceId);
  if (!cfg) {
    cfg = {
      hostname: label,
      domain: 'localdomain',
      interfaces: {
        wan: { ip: '', mask: '255.255.255.0', gateway: '', enabled: true },
        lan: { ip: '192.168.1.1', mask: '255.255.255.0', dhcpEnabled: true, dhcpStart: '192.168.1.100', dhcpEnd: '192.168.1.200', enabled: true },
        opt1: { ip: '', mask: '255.255.255.0', description: 'DMZ', enabled: false },
        opt2: { ip: '', mask: '255.255.255.0', description: 'Guest', enabled: false },
      },
      firewallRules: [
        { id: 1, iface: 'lan', action: 'pass', protocol: 'any', source: 'LAN net', destination: 'any', description: 'Default allow LAN to any' },
      ],
      natRules: [],
      vlans: [],
    };
    pfConfigs.set(deviceId, cfg);
  }
  return cfg;
}

let guiDeviceId: ID | null = null;
let guiCanvasAPI: CanvasAPI | null = null;
let guiEventBus: EventBus | null = null;
let guiForceUpdate: (() => void) | null = null;

export function openPfSenseGUI(deviceId: ID, canvasAPI: CanvasAPI, eventBus: EventBus) {
  guiDeviceId = deviceId;
  guiCanvasAPI = canvasAPI;
  guiEventBus = eventBus;
  guiForceUpdate?.();
}

export function isPfSenseGUIOpen(): boolean {
  return guiDeviceId !== null;
}

export function closePfSenseGUI() {
  guiDeviceId = null;
  guiForceUpdate?.();
}

function emitConfig(deviceId: ID, config: PfSenseConfig) {
  if (!guiEventBus || !guiCanvasAPI) return;

  // Build interface map compatible with packet engine
  const interfaces = new Map<string, { ip?: string; mask?: string; shutdown: boolean }>();
  if (config.interfaces.wan.enabled) {
    interfaces.set('WAN', { ip: config.interfaces.wan.ip || undefined, mask: config.interfaces.wan.mask, shutdown: !config.interfaces.wan.enabled });
  }
  if (config.interfaces.lan.enabled) {
    interfaces.set('LAN', { ip: config.interfaces.lan.ip || undefined, mask: config.interfaces.lan.mask, shutdown: !config.interfaces.lan.enabled });
  }
  if (config.interfaces.opt1.enabled) {
    interfaces.set('OPT1', { ip: config.interfaces.opt1.ip || undefined, mask: config.interfaces.opt1.mask, shutdown: !config.interfaces.opt1.enabled });
  }
  if (config.interfaces.opt2.enabled) {
    interfaces.set('OPT2', { ip: config.interfaces.opt2.ip || undefined, mask: config.interfaces.opt2.mask, shutdown: !config.interfaces.opt2.enabled });
  }

  // Add VLAN interfaces — each VLAN becomes a virtual interface on pfSense
  for (const vlan of config.vlans) {
    if (vlan.ip) {
      interfaces.set(`VLAN${vlan.tag}`, { ip: vlan.ip, mask: vlan.mask, shutdown: false });
    }
  }

  // Convert pfSense firewall rules to ACLs for the packet engine
  const acls = new Map<number, { number: number; entries: Array<{ action: 'permit' | 'deny'; source: string; wildcard?: string }> }>();
  let aclNum = 100;
  // Group rules by interface
  const ifaceToAcl = new Map<string, number>();
  for (const rule of config.firewallRules) {
    const ifaceKey = rule.iface.toUpperCase();
    if (!ifaceToAcl.has(ifaceKey)) {
      ifaceToAcl.set(ifaceKey, aclNum++);
    }
    const num = ifaceToAcl.get(ifaceKey)!;
    const existing = acls.get(num) ?? { number: num, entries: [] };
    const sourceIP = rule.source === 'any' || rule.source === 'LAN net' ? 'any' : rule.source;
    // Determine wildcard: if source contains / it's a network, otherwise exact host
    let wildcard = '0.0.0.0'; // exact host match
    if (sourceIP !== 'any' && sourceIP.includes('/')) {
      // Simple CIDR to wildcard: /24 → 0.0.0.255
      const cidr = parseInt(sourceIP.split('/')[1]);
      const wcBits = 32 - cidr;
      const wcNum = (Math.pow(2, wcBits) - 1) >>> 0;
      wildcard = [(wcNum >>> 24) & 0xff, (wcNum >>> 16) & 0xff, (wcNum >>> 8) & 0xff, wcNum & 0xff].join('.');
    } else if (sourceIP !== 'any' && sourceIP.endsWith('.0')) {
      wildcard = '0.0.0.255'; // assume /24 network
    }
    existing.entries.push({
      action: rule.action === 'pass' ? 'permit' : 'deny',
      source: sourceIP.includes('/') ? sourceIP.split('/')[0] : sourceIP,
      wildcard: sourceIP === 'any' ? undefined : wildcard,
    });
    acls.set(num, existing);
  }

  // Apply ACLs to interfaces
  for (const [ifaceKey, num] of ifaceToAcl) {
    const iface = interfaces.get(ifaceKey);
    if (iface) {
      interfaces.set(ifaceKey, { ...iface, accessGroupIn: num });
    }
  }

  guiEventBus.emit('cli:config-changed', {
    deviceId,
    config: {
      hostname: config.hostname,
      interfaces,
      staticRoutes: config.interfaces.wan.gateway
        ? [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: config.interfaces.wan.gateway }]
        : [],
      acls,
    },
  });

  // Emit DHCP config if enabled
  if (config.interfaces.lan.dhcpEnabled && config.interfaces.lan.ip) {
    guiEventBus.emit('pfsense:dhcp-available', {
      deviceId,
      network: config.interfaces.lan.ip.split('.').slice(0, 3).join('.') + '.0',
      mask: config.interfaces.lan.mask,
      gateway: config.interfaces.lan.ip,
      rangeStart: config.interfaces.lan.dhcpStart,
      rangeEnd: config.interfaces.lan.dhcpEnd,
    });
  }

  // Update canvas labels
  const ips: string[] = [];
  if (config.interfaces.wan.ip) ips.push(`WAN: ${config.interfaces.wan.ip}`);
  if (config.interfaces.lan.ip) ips.push(`LAN: ${config.interfaces.lan.ip}`);
  if (config.interfaces.opt1.ip && config.interfaces.opt1.enabled) ips.push(`OPT1: ${config.interfaces.opt1.ip}`);

  guiCanvasAPI.updateDevice(deviceId, {
    label: config.hostname,
    config: { ...guiCanvasAPI.getDevice(deviceId)?.config, ips, hostname: config.hostname },
  });
}

export function PfSenseGUIPanel() {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    guiForceUpdate = () => setTick((t) => t + 1);
    return () => { guiForceUpdate = null; };
  }, []);

  if (!guiDeviceId || !guiCanvasAPI) {
    return null;
  }

  const device = guiCanvasAPI.getDevice(guiDeviceId);
  if (!device) return null;

  const config = getOrCreateConfig(guiDeviceId, device.label);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'interfaces', label: 'Interfaces' },
    { id: 'firewall', label: 'Firewall Rules' },
    { id: 'dhcp', label: 'DHCP Server' },
    { id: 'nat', label: 'NAT' },
    { id: 'vlans', label: 'VLANs' },
  ];

  const update = (partial: Partial<PfSenseConfig>) => {
    const updated = { ...config, ...partial };
    pfConfigs.set(guiDeviceId!, updated);
    emitConfig(guiDeviceId!, updated);
    setTick((t) => t + 1);
  };

  const inputStyle = {
    padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
    borderRadius: '4px', color: 'var(--text-primary)', fontSize: '13px', width: '100%',
    outline: 'none',
  };

  const labelStyle = { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' as const };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a1428', color: '#ccddef' }}>
      {/* pfSense header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '6px 12px',
        background: '#0d1b33', borderBottom: '2px solid #1a4a8a',
      }}>
        <span style={{ color: '#00bceb', fontWeight: 700, fontSize: '14px', marginRight: '8px' }}>pfSense</span>
        <span style={{ color: '#4a8acc', fontSize: '12px' }}>{config.hostname}.{config.domain}</span>
      </div>

      {/* Tab navigation */}
      <div style={{
        display: 'flex', gap: '2px', padding: '4px 8px',
        background: '#0f2240', borderBottom: '1px solid #1a3a6a',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 12px', background: activeTab === tab.id ? '#1a4a8a' : 'transparent',
              border: 'none', borderRadius: '4px 4px 0 0',
              color: activeTab === tab.id ? '#fff' : '#6a9acc', fontSize: '12px',
              cursor: 'pointer', fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#00bceb', marginBottom: '12px' }}>System Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ padding: '10px', background: '#0d1b33', borderRadius: '6px', border: '1px solid #1a3a6a' }}>
                <div style={{ fontSize: '11px', color: '#4a8acc' }}>Hostname</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{config.hostname}</div>
              </div>
              <div style={{ padding: '10px', background: '#0d1b33', borderRadius: '6px', border: '1px solid #1a3a6a' }}>
                <div style={{ fontSize: '11px', color: '#4a8acc' }}>Platform</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Netgate SG-3100</div>
              </div>
              <div style={{ padding: '10px', background: '#0d1b33', borderRadius: '6px', border: '1px solid #1a3a6a' }}>
                <div style={{ fontSize: '11px', color: '#4a8acc' }}>WAN IP</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: config.interfaces.wan.ip ? '#00cc66' : '#ff6644' }}>
                  {config.interfaces.wan.ip || 'Not configured'}
                </div>
              </div>
              <div style={{ padding: '10px', background: '#0d1b33', borderRadius: '6px', border: '1px solid #1a3a6a' }}>
                <div style={{ fontSize: '11px', color: '#4a8acc' }}>LAN IP</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#00cc66' }}>
                  {config.interfaces.lan.ip || 'Not configured'}
                </div>
              </div>
            </div>
            <h3 style={{ fontSize: '16px', color: '#00bceb', margin: '16px 0 8px' }}>Interface Status</h3>
            {(['wan', 'lan', 'opt1', 'opt2'] as const).map((iface) => {
              const cfg = config.interfaces[iface];
              return (
                <div key={iface} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px',
                  background: '#0d1b33', borderRadius: '4px', marginBottom: '4px',
                  border: '1px solid #1a3a6a',
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.enabled && cfg.ip ? '#00cc66' : '#444' }} />
                  <span style={{ fontWeight: 600, width: '50px', textTransform: 'uppercase', fontSize: '12px' }}>{iface}</span>
                  <span style={{ fontSize: '12px', color: '#8ab4dd' }}>{cfg.ip || 'Not configured'}</span>
                  <span style={{ fontSize: '11px', color: cfg.enabled ? '#00cc66' : '#ff6644', marginLeft: 'auto' }}>
                    {cfg.enabled ? 'UP' : 'DOWN'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'interfaces' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#00bceb', marginBottom: '12px' }}>Interface Configuration</h3>
            {(['wan', 'lan', 'opt1', 'opt2'] as const).map((iface) => {
              const cfg = config.interfaces[iface];
              const colors: Record<string, string> = { wan: '#ff6644', lan: '#00cc66', opt1: '#ffaa00', opt2: '#aa88ff' };
              return (
                <div key={iface} style={{
                  padding: '12px', background: '#0d1b33', borderRadius: '6px',
                  border: `1px solid ${colors[iface]}40`, marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: colors[iface], textTransform: 'uppercase' }}>{iface}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={cfg.enabled} onChange={(e) => {
                        update({ interfaces: { ...config.interfaces, [iface]: { ...cfg, enabled: e.target.checked } } });
                      }} />
                      Enable
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={labelStyle}>IPv4 Address</label>
                      <input style={inputStyle} value={cfg.ip} placeholder="e.g., 192.168.1.1"
                        onChange={(e) => update({ interfaces: { ...config.interfaces, [iface]: { ...cfg, ip: e.target.value } } })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Subnet Mask</label>
                      <input style={inputStyle} value={cfg.mask}
                        onChange={(e) => update({ interfaces: { ...config.interfaces, [iface]: { ...cfg, mask: e.target.value } } })} />
                    </div>
                    {iface === 'wan' && (
                      <div>
                        <label style={labelStyle}>Gateway</label>
                        <input style={inputStyle} value={cfg.gateway} placeholder="e.g., 203.0.113.1"
                          onChange={(e) => update({ interfaces: { ...config.interfaces, wan: { ...cfg, gateway: e.target.value } } })} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'firewall' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#00bceb', marginBottom: '6px' }}>Firewall Rules</h3>
            <p style={{ fontSize: '11px', color: '#4a7aaa', marginBottom: '12px' }}>
              Rules are evaluated top-to-bottom. First match wins. Traffic not matching any rule is BLOCKED (implicit deny).
            </p>
            {config.firewallRules.map((rule, idx) => {
              const updateRule = (field: string, value: string) => {
                const rules = [...config.firewallRules];
                rules[idx] = { ...rules[idx], [field]: value };
                update({ firewallRules: rules });
              };
              const deleteRule = () => {
                update({ firewallRules: config.firewallRules.filter((r) => r.id !== rule.id) });
              };
              const selStyle = { padding: '4px 6px', background: '#0a1428', border: '1px solid #1a3a6a', borderRadius: '3px', color: '#ccddef', fontSize: '12px', outline: 'none' };
              const inpStyle = { padding: '4px 6px', background: '#0a1428', border: '1px solid #1a3a6a', borderRadius: '3px', color: '#ccddef', fontSize: '12px', width: '100%', outline: 'none' };

              return (
                <div key={rule.id} style={{
                  padding: '10px', background: '#0d1b33', borderRadius: '6px',
                  border: `1px solid ${rule.action === 'pass' ? '#00cc6630' : '#ff444430'}`,
                  marginBottom: '6px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 80px 80px 1fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                    <select style={selStyle} value={rule.action} onChange={(e) => updateRule('action', e.target.value)}>
                      <option value="pass">✓ Pass</option>
                      <option value="block">✗ Block</option>
                    </select>
                    <select style={selStyle} value={rule.iface} onChange={(e) => updateRule('iface', e.target.value)}>
                      <option value="wan">WAN</option>
                      <option value="lan">LAN</option>
                      <option value="opt1">OPT1</option>
                      <option value="opt2">OPT2</option>
                    </select>
                    <select style={selStyle} value={rule.protocol} onChange={(e) => updateRule('protocol', e.target.value)}>
                      <option value="any">Any</option>
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                      <option value="icmp">ICMP</option>
                    </select>
                    <input style={inpStyle} value={rule.source} placeholder="Source IP or 'any'"
                      onChange={(e) => updateRule('source', e.target.value)} />
                    <input style={inpStyle} value={rule.destination} placeholder="Dest IP or 'any'"
                      onChange={(e) => updateRule('destination', e.target.value)} />
                    <button onClick={deleteRule} style={{
                      padding: '4px 8px', background: '#ff444420', border: '1px solid #ff444440',
                      borderRadius: '3px', color: '#ff6666', fontSize: '11px', cursor: 'pointer',
                    }}>✗</button>
                  </div>
                  <input style={{ ...inpStyle, marginTop: '4px', width: '100%' }} value={rule.description}
                    placeholder="Description" onChange={(e) => updateRule('description', e.target.value)} />
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  update({ firewallRules: [...config.firewallRules, {
                    id: Date.now(), iface: 'lan', action: 'pass',
                    protocol: 'any', source: 'any', destination: 'any', description: '',
                  }] });
                }}
                style={{ padding: '8px 16px', background: '#1a4a8a', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
              >
                + Add Pass Rule
              </button>
              <button
                onClick={() => {
                  update({ firewallRules: [...config.firewallRules, {
                    id: Date.now(), iface: 'wan', action: 'block',
                    protocol: 'any', source: 'any', destination: 'any', description: '',
                  }] });
                }}
                style={{ padding: '8px 16px', background: '#ff444430', border: '1px solid #ff444450', borderRadius: '4px', color: '#ff8888', fontSize: '12px', cursor: 'pointer' }}
              >
                + Add Block Rule
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dhcp' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#00bceb', marginBottom: '12px' }}>DHCP Server — LAN</h3>
            <div style={{ padding: '12px', background: '#0d1b33', borderRadius: '6px', border: '1px solid #1a3a6a' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" checked={config.interfaces.lan.dhcpEnabled}
                  onChange={(e) => update({ interfaces: { ...config.interfaces, lan: { ...config.interfaces.lan, dhcpEnabled: e.target.checked } } })} />
                Enable DHCP Server on LAN
              </label>
              {config.interfaces.lan.dhcpEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={labelStyle}>Range Start</label>
                    <input style={inputStyle} value={config.interfaces.lan.dhcpStart}
                      onChange={(e) => update({ interfaces: { ...config.interfaces, lan: { ...config.interfaces.lan, dhcpStart: e.target.value } } })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Range End</label>
                    <input style={inputStyle} value={config.interfaces.lan.dhcpEnd}
                      onChange={(e) => update({ interfaces: { ...config.interfaces, lan: { ...config.interfaces.lan, dhcpEnd: e.target.value } } })} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'nat' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#00bceb', marginBottom: '6px' }}>NAT / Port Forward</h3>
            <p style={{ fontSize: '11px', color: '#4a7aaa', marginBottom: '12px' }}>
              Port forwarding allows external traffic to reach internal servers. Traffic arriving on WAN:ExternalPort is forwarded to InternalIP:InternalPort.
            </p>
            {config.natRules.map((rule, idx) => {
              const updateNat = (field: string, value: string) => {
                const rules = [...config.natRules];
                rules[idx] = { ...rules[idx], [field]: value };
                update({ natRules: rules });
              };
              const deleteNat = () => {
                update({ natRules: config.natRules.filter((r) => r.id !== rule.id) });
              };
              const selStyle = { padding: '4px 6px', background: '#0a1428', border: '1px solid #1a3a6a', borderRadius: '3px', color: '#ccddef', fontSize: '12px', outline: 'none' };
              const inpStyle = { padding: '4px 6px', background: '#0a1428', border: '1px solid #1a3a6a', borderRadius: '3px', color: '#ccddef', fontSize: '12px', width: '100%', outline: 'none' };

              return (
                <div key={rule.id} style={{
                  padding: '10px', background: '#0d1b33', borderRadius: '6px',
                  border: '1px solid #1a3a6a', marginBottom: '6px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 70px 1fr 70px auto', gap: '6px', alignItems: 'center' }}>
                    <select style={selStyle} value={rule.iface} onChange={(e) => updateNat('iface', e.target.value)}>
                      <option value="WAN">WAN</option>
                      <option value="LAN">LAN</option>
                      <option value="OPT1">OPT1</option>
                    </select>
                    <input style={inpStyle} value={rule.externalPort} placeholder="Ext Port"
                      onChange={(e) => updateNat('externalPort', e.target.value)} />
                    <input style={inpStyle} value={rule.internalIP} placeholder="Internal IP (e.g. 192.168.1.100)"
                      onChange={(e) => updateNat('internalIP', e.target.value)} />
                    <input style={inpStyle} value={rule.internalPort} placeholder="Int Port"
                      onChange={(e) => updateNat('internalPort', e.target.value)} />
                    <button onClick={deleteNat} style={{
                      padding: '4px 8px', background: '#ff444420', border: '1px solid #ff444440',
                      borderRadius: '3px', color: '#ff6666', fontSize: '11px', cursor: 'pointer',
                    }}>✗</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                    <select style={selStyle} value={rule.type} onChange={(e) => updateNat('type', e.target.value)}>
                      <option value="port-forward">Port Forward</option>
                      <option value="outbound">Outbound</option>
                    </select>
                    <input style={inpStyle} value={rule.description} placeholder="Description (e.g. Web server, Game server)"
                      onChange={(e) => updateNat('description', e.target.value)} />
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => {
                update({ natRules: [...config.natRules, {
                  id: Date.now(), type: 'port-forward', iface: 'WAN',
                  externalPort: '', internalIP: '', internalPort: '', description: '',
                }] });
              }}
              style={{ marginTop: '8px', padding: '8px 16px', background: '#1a4a8a', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
            >
              + Add Port Forward Rule
            </button>
          </div>
        )}

        {activeTab === 'vlans' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#00bceb', marginBottom: '6px' }}>VLAN Configuration</h3>
            <p style={{ fontSize: '11px', color: '#4a7aaa', marginBottom: '12px' }}>
              VLANs allow you to segment the LAN into isolated virtual networks. Each VLAN gets its own IP subnet. Traffic between VLANs is routed by pfSense, allowing you to apply firewall rules between segments.
            </p>

            {config.vlans.map((vlan, idx) => {
              const updateVlan = (field: string, value: string | number) => {
                const vlans = [...config.vlans];
                vlans[idx] = { ...vlans[idx], [field]: value };
                update({ vlans });
              };
              const deleteVlan = () => {
                update({ vlans: config.vlans.filter((v) => v.id !== vlan.id) });
              };
              const selStyle = { padding: '4px 6px', background: '#0a1428', border: '1px solid #1a3a6a', borderRadius: '3px', color: '#ccddef', fontSize: '12px', outline: 'none' };
              const inpStyle = { padding: '4px 6px', background: '#0a1428', border: '1px solid #1a3a6a', borderRadius: '3px', color: '#ccddef', fontSize: '12px', width: '100%', outline: 'none' };

              return (
                <div key={vlan.id} style={{
                  padding: '10px', background: '#0d1b33', borderRadius: '6px',
                  border: '1px solid #1a3a6a', marginBottom: '6px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 1fr auto', gap: '6px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#4a7aaa', marginBottom: '2px' }}>VLAN Tag</div>
                      <input style={inpStyle} type="number" value={vlan.tag} min={2} max={4094}
                        onChange={(e) => updateVlan('tag', parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#4a7aaa', marginBottom: '2px' }}>Parent Interface</div>
                      <select style={selStyle} value={vlan.parentInterface}
                        onChange={(e) => updateVlan('parentInterface', e.target.value)}>
                        <option value="lan">LAN</option>
                        <option value="opt1">OPT1</option>
                        <option value="opt2">OPT2</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#4a7aaa', marginBottom: '2px' }}>Description</div>
                      <input style={inpStyle} value={vlan.description}
                        onChange={(e) => updateVlan('description', e.target.value)} />
                    </div>
                    <button onClick={deleteVlan} style={{
                      padding: '4px 8px', background: '#ff444420', border: '1px solid #ff444440',
                      borderRadius: '3px', color: '#ff6666', fontSize: '11px', cursor: 'pointer', marginTop: '14px',
                    }}>✗</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#4a7aaa', marginBottom: '2px' }}>VLAN IP Address</div>
                      <input style={inpStyle} value={vlan.ip} placeholder="e.g., 192.168.10.1"
                        onChange={(e) => updateVlan('ip', e.target.value)} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#4a7aaa', marginBottom: '2px' }}>Subnet Mask</div>
                      <input style={inpStyle} value={vlan.mask} placeholder="255.255.255.0"
                        onChange={(e) => updateVlan('mask', e.target.value)} />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => {
                update({ vlans: [...config.vlans, {
                  id: Date.now(), tag: config.vlans.length > 0 ? Math.max(...config.vlans.map((v) => v.tag)) + 10 : 10,
                  parentInterface: 'lan', description: '', ip: '', mask: '255.255.255.0',
                }] });
              }}
              style={{ marginTop: '8px', padding: '8px 16px', background: '#1a4a8a', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
            >
              + Add VLAN
            </button>

            {config.vlans.length > 0 && (
              <div style={{ marginTop: '12px', padding: '10px', background: '#0a1428', borderRadius: '6px', border: '1px solid #1a3a6a' }}>
                <div style={{ fontSize: '12px', color: '#4a8acc', marginBottom: '6px', fontWeight: 600 }}>How VLANs work on pfSense:</div>
                <ol style={{ margin: 0, padding: '0 0 0 16px', fontSize: '11px', color: '#6a9acc', lineHeight: '1.6' }}>
                  <li>Create the VLAN here with a tag number and parent interface</li>
                  <li>Assign an IP to the VLAN — this becomes the gateway for devices on that VLAN</li>
                  <li>Configure your managed switch to tag ports with the matching VLAN ID</li>
                  <li>Connect the switch to the pfSense parent interface (LAN/OPT) as a trunk</li>
                  <li>Devices on VLAN 10 get IPs in the VLAN 10 subnet, VLAN 20 in VLAN 20 subnet</li>
                  <li>pfSense routes between VLANs — add firewall rules to control inter-VLAN traffic</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
