import { useState, useEffect } from 'react';
import type { CanvasAPI, EventBus, ID } from '@netx/sdk';

interface NASConfig {
  hostname: string;
  network: {
    eth0: { ip: string; mask: string; gateway: string; enabled: boolean };
    eth1: { ip: string; mask: string; enabled: boolean };
    dns: string;
    bondingEnabled: boolean;
    bondingMode: 'adaptive-load-balancing' | 'active-backup' | 'ieee-802.3ad';
  };
  storage: {
    volumes: Array<{
      id: number;
      name: string;
      raidType: 'Basic' | 'RAID 1' | 'RAID 5' | 'SHR';
      totalGB: number;
      usedGB: number;
      status: 'Normal' | 'Degraded' | 'Crashed';
    }>;
  };
  sharedFolders: Array<{
    id: number;
    name: string;
    volume: string;
    description: string;
    permissions: 'read-only' | 'read-write' | 'no-access';
  }>;
  fileServices: {
    smb: boolean;
    nfs: boolean;
    ftp: boolean;
    webdav: boolean;
  };
  users: Array<{
    id: number;
    username: string;
    description: string;
    admin: boolean;
    enabled: boolean;
  }>;
}

const nasConfigs = new Map<ID, NASConfig>();

export function getNasConfigs(): Record<string, NASConfig> {
  const result: Record<string, NASConfig> = {};
  for (const [id, cfg] of nasConfigs) result[id] = cfg;
  return result;
}

export function restoreNasConfigs(data: Record<string, NASConfig>) {
  for (const [id, cfg] of Object.entries(data)) {
    nasConfigs.set(id, cfg);
  }
}

function getOrCreateConfig(deviceId: ID, label: string): NASConfig {
  let cfg = nasConfigs.get(deviceId);
  if (!cfg) {
    cfg = {
      hostname: label,
      network: {
        eth0: { ip: '192.168.1.200', mask: '255.255.255.0', gateway: '192.168.1.1', enabled: true },
        eth1: { ip: '', mask: '255.255.255.0', enabled: false },
        dns: '8.8.8.8',
        bondingEnabled: false,
        bondingMode: 'adaptive-load-balancing',
      },
      storage: {
        volumes: [
          { id: 1, name: 'Volume 1', raidType: 'RAID 1', totalGB: 8000, usedGB: 2400, status: 'Normal' },
        ],
      },
      sharedFolders: [
        { id: 1, name: 'shared', volume: 'Volume 1', description: 'General shared folder', permissions: 'read-write' },
        { id: 2, name: 'backups', volume: 'Volume 1', description: 'Backup storage', permissions: 'read-write' },
        { id: 3, name: 'media', volume: 'Volume 1', description: 'Photos and videos', permissions: 'read-only' },
      ],
      fileServices: { smb: true, nfs: false, ftp: false, webdav: false },
      users: [
        { id: 1, username: 'admin', description: 'System Administrator', admin: true, enabled: true },
        { id: 2, username: 'user1', description: 'Standard User', admin: false, enabled: true },
      ],
    };
    nasConfigs.set(deviceId, cfg);
  }
  return cfg;
}

let nasDeviceId: ID | null = null;
let nasCanvasAPI: CanvasAPI | null = null;
let nasEventBus: EventBus | null = null;
let nasForceUpdate: (() => void) | null = null;

export function openNasGUI(deviceId: ID, canvasAPI: CanvasAPI, eventBus: EventBus) {
  nasDeviceId = deviceId;
  nasCanvasAPI = canvasAPI;
  nasEventBus = eventBus;
  nasForceUpdate?.();
}

export function closeNasGUI() {
  nasDeviceId = null;
  nasForceUpdate?.();
}

function emitConfig(deviceId: ID, config: NASConfig) {
  if (!nasEventBus || !nasCanvasAPI) return;

  const interfaces = new Map<string, { ip?: string; mask?: string; shutdown: boolean }>();
  if (config.network.eth0.enabled) {
    interfaces.set('Ethernet0', { ip: config.network.eth0.ip || undefined, mask: config.network.eth0.mask, shutdown: !config.network.eth0.enabled });
  }
  if (config.network.eth1.enabled) {
    interfaces.set('Ethernet1', { ip: config.network.eth1.ip || undefined, mask: config.network.eth1.mask, shutdown: !config.network.eth1.enabled });
  }

  nasEventBus.emit('cli:config-changed', {
    deviceId,
    config: {
      hostname: config.hostname,
      interfaces,
      staticRoutes: config.network.eth0.gateway
        ? [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: config.network.eth0.gateway }]
        : [],
    },
  });

  const ips: string[] = [];
  if (config.network.eth0.ip) ips.push(`${config.network.eth0.ip}`);

  nasCanvasAPI.updateDevice(deviceId, {
    label: config.hostname,
    config: { ...nasCanvasAPI.getDevice(deviceId)?.config, ips, hostname: config.hostname },
  });
}

// Synology DSM color scheme
const dsm = {
  bg: '#f0f2f5',
  sidebar: '#2b3940',
  sidebarActive: '#1a8ce8',
  card: '#ffffff',
  border: '#dce0e4',
  text: '#333',
  textLight: '#888',
  accent: '#1a8ce8',
  success: '#4caf50',
  warning: '#ff9800',
  danger: '#f44336',
};

export function NasGUIPanel() {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    nasForceUpdate = () => setTick((t) => t + 1);
    return () => { nasForceUpdate = null; };
  }, []);

  if (!nasDeviceId || !nasCanvasAPI) return null;
  const device = nasCanvasAPI.getDevice(nasDeviceId);
  if (!device) return null;

  const config = getOrCreateConfig(nasDeviceId, device.label);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'storage', label: 'Storage Manager', icon: '💾' },
    { id: 'network', label: 'Network', icon: '🌐' },
    { id: 'folders', label: 'Shared Folders', icon: '📁' },
    { id: 'services', label: 'File Services', icon: '⚙️' },
    { id: 'users', label: 'Users', icon: '👤' },
  ];

  const update = (partial: Partial<NASConfig>) => {
    const updated = { ...config, ...partial };
    nasConfigs.set(nasDeviceId!, updated);
    emitConfig(nasDeviceId!, updated);
    setTick((t) => t + 1);
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', background: '#fff', border: `1px solid ${dsm.border}`,
    borderRadius: '4px', color: dsm.text, fontSize: '13px', width: '100%', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { fontSize: '12px', color: dsm.textLight, marginBottom: '4px', display: 'block' };

  return (
    <div style={{ height: '100%', display: 'flex', background: dsm.bg, color: dsm.text }}>
      {/* DSM Sidebar */}
      <div style={{ width: '160px', background: dsm.sidebar, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* DSM Logo */}
        <div style={{ padding: '12px', borderBottom: '1px solid #3a4a52' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Synology</div>
          <div style={{ color: '#8a9aa5', fontSize: '11px' }}>DiskStation Manager</div>
        </div>
        {/* Nav items */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 12px', cursor: 'pointer',
              background: activeTab === tab.id ? dsm.sidebarActive : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#b0bec5',
              fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px',
              borderLeft: activeTab === tab.id ? '3px solid #fff' : '3px solid transparent',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>

        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: dsm.text }}>System Overview</h2>
            {/* System info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '14px', background: dsm.card, borderRadius: '8px', border: `1px solid ${dsm.border}` }}>
                <div style={{ fontSize: '11px', color: dsm.textLight, marginBottom: '4px' }}>Hostname</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{config.hostname}</div>
              </div>
              <div style={{ padding: '14px', background: dsm.card, borderRadius: '8px', border: `1px solid ${dsm.border}` }}>
                <div style={{ fontSize: '11px', color: dsm.textLight, marginBottom: '4px' }}>Model</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>DS920+</div>
              </div>
              <div style={{ padding: '14px', background: dsm.card, borderRadius: '8px', border: `1px solid ${dsm.border}` }}>
                <div style={{ fontSize: '11px', color: dsm.textLight, marginBottom: '4px' }}>IP Address</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: config.network.eth0.ip ? dsm.success : dsm.danger }}>
                  {config.network.eth0.ip || 'Not configured'}
                </div>
              </div>
              <div style={{ padding: '14px', background: dsm.card, borderRadius: '8px', border: `1px solid ${dsm.border}` }}>
                <div style={{ fontSize: '11px', color: dsm.textLight, marginBottom: '4px' }}>DSM Version</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>7.2-64570</div>
              </div>
            </div>

            {/* Storage overview */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Storage</h3>
            {config.storage.volumes.map((vol) => {
              const pct = Math.round((vol.usedGB / vol.totalGB) * 100);
              const barColor = pct > 90 ? dsm.danger : pct > 70 ? dsm.warning : dsm.accent;
              return (
                <div key={vol.id} style={{ padding: '12px', background: dsm.card, borderRadius: '8px', border: `1px solid ${dsm.border}`, marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{vol.name} ({vol.raidType})</span>
                    <span style={{ fontSize: '12px', color: vol.status === 'Normal' ? dsm.success : dsm.danger, fontWeight: 600 }}>{vol.status}</span>
                  </div>
                  <div style={{ height: '8px', background: '#e8ecef', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '4px' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: dsm.textLight }}>
                    {vol.usedGB} GB used / {vol.totalGB} GB total ({pct}%)
                  </div>
                </div>
              );
            })}

            {/* Services status */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '16px 0 10px' }}>Active Services</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(config.fileServices).map(([name, enabled]) => (
                <span key={name} style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                  background: enabled ? dsm.success + '15' : '#f5f5f5',
                  color: enabled ? dsm.success : '#bbb',
                  border: `1px solid ${enabled ? dsm.success + '30' : '#e0e0e0'}`,
                  textTransform: 'uppercase',
                }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Storage Manager</h2>
            {/* Drive bays */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Drive Bays</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { bay: 1, size: '4 TB', status: 'Healthy', temp: '38°C' },
                { bay: 2, size: '4 TB', status: 'Healthy', temp: '36°C' },
                { bay: 3, size: 'Empty', status: '—', temp: '—' },
                { bay: 4, size: 'Empty', status: '—', temp: '—' },
              ].map((drive) => (
                <div key={drive.bay} style={{
                  padding: '10px', background: dsm.card, borderRadius: '6px',
                  border: `1px solid ${drive.size !== 'Empty' ? dsm.success + '40' : dsm.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{drive.size !== 'Empty' ? '💾' : '⬜'}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Bay {drive.bay}</div>
                  <div style={{ fontSize: '11px', color: dsm.textLight }}>{drive.size}</div>
                  <div style={{ fontSize: '10px', color: drive.status === 'Healthy' ? dsm.success : dsm.textLight }}>{drive.status}</div>
                  <div style={{ fontSize: '10px', color: dsm.textLight }}>{drive.temp}</div>
                </div>
              ))}
            </div>

            {/* Volumes */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Volumes</h3>
            {config.storage.volumes.map((vol) => (
              <div key={vol.id} style={{ padding: '12px', background: dsm.card, borderRadius: '6px', border: `1px solid ${dsm.border}`, marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div><span style={{ color: dsm.textLight }}>Name:</span> {vol.name}</div>
                  <div><span style={{ color: dsm.textLight }}>RAID:</span> <span style={{ fontWeight: 600 }}>{vol.raidType}</span></div>
                  <div><span style={{ color: dsm.textLight }}>Size:</span> {vol.totalGB} GB</div>
                  <div><span style={{ color: dsm.textLight }}>Status:</span> <span style={{ color: dsm.success }}>{vol.status}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'network' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Network Settings</h2>

            {/* Hostname */}
            <div style={{ padding: '14px', background: dsm.card, borderRadius: '8px', border: `1px solid ${dsm.border}`, marginBottom: '12px' }}>
              <label style={labelStyle}>Server Name</label>
              <input style={inputStyle} value={config.hostname}
                onChange={(e) => update({ hostname: e.target.value })} />
            </div>

            {/* Network interfaces */}
            {(['eth0', 'eth1'] as const).map((iface) => {
              const cfg = config.network[iface];
              return (
                <div key={iface} style={{ padding: '14px', background: dsm.card, borderRadius: '8px', border: `1px solid ${dsm.border}`, marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>LAN {iface === 'eth0' ? '1' : '2'} ({iface})</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={cfg.enabled}
                        onChange={(e) => update({ network: { ...config.network, [iface]: { ...cfg, enabled: e.target.checked } } })} />
                      Enable
                    </label>
                  </div>
                  {cfg.enabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={labelStyle}>IP Address</label>
                        <input style={inputStyle} value={cfg.ip} placeholder="e.g., 192.168.1.200"
                          onChange={(e) => update({ network: { ...config.network, [iface]: { ...cfg, ip: e.target.value } } })} />
                      </div>
                      <div>
                        <label style={labelStyle}>Subnet Mask</label>
                        <input style={inputStyle} value={cfg.mask}
                          onChange={(e) => update({ network: { ...config.network, [iface]: { ...cfg, mask: e.target.value } } })} />
                      </div>
                      {iface === 'eth0' && (
                        <>
                          <div>
                            <label style={labelStyle}>Gateway</label>
                            <input style={inputStyle} value={cfg.gateway} placeholder="e.g., 192.168.1.1"
                              onChange={(e) => update({ network: { ...config.network, eth0: { ...cfg, gateway: e.target.value } } })} />
                          </div>
                          <div>
                            <label style={labelStyle}>DNS Server</label>
                            <input style={inputStyle} value={config.network.dns}
                              onChange={(e) => update({ network: { ...config.network, dns: e.target.value } } )} />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Link Aggregation */}
            <div style={{ padding: '14px', background: dsm.card, borderRadius: '8px', border: `1px solid ${dsm.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Link Aggregation (Bonding)</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={config.network.bondingEnabled}
                    onChange={(e) => update({ network: { ...config.network, bondingEnabled: e.target.checked } })} />
                  Enable
                </label>
              </div>
              {config.network.bondingEnabled && (
                <div>
                  <label style={labelStyle}>Bonding Mode</label>
                  <select style={{ ...inputStyle, background: '#fff' }} value={config.network.bondingMode}
                    onChange={(e) => update({ network: { ...config.network, bondingMode: e.target.value as NASConfig['network']['bondingMode'] } })}>
                    <option value="adaptive-load-balancing">Adaptive Load Balancing</option>
                    <option value="active-backup">Active/Backup (Failover)</option>
                    <option value="ieee-802.3ad">IEEE 802.3ad (LACP)</option>
                  </select>
                  <div style={{ fontSize: '11px', color: dsm.textLight, marginTop: '6px' }}>
                    Combines LAN 1 + LAN 2 into a single logical link for increased bandwidth or failover.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'folders' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Shared Folders</h2>
            {config.sharedFolders.map((folder, idx) => (
              <div key={folder.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px', background: dsm.card, borderRadius: '6px',
                border: `1px solid ${dsm.border}`, marginBottom: '6px',
              }}>
                <span style={{ fontSize: '24px' }}>📁</span>
                <div style={{ flex: 1 }}>
                  <input style={{ ...inputStyle, fontWeight: 600, border: 'none', padding: '2px 0' }} value={folder.name}
                    onChange={(e) => {
                      const folders = [...config.sharedFolders];
                      folders[idx] = { ...folders[idx], name: e.target.value };
                      update({ sharedFolders: folders });
                    }} />
                  <div style={{ fontSize: '11px', color: dsm.textLight }}>{folder.volume} — {folder.description}</div>
                </div>
                <select style={{ ...inputStyle, width: '120px' }} value={folder.permissions}
                  onChange={(e) => {
                    const folders = [...config.sharedFolders];
                    folders[idx] = { ...folders[idx], permissions: e.target.value as 'read-only' | 'read-write' | 'no-access' };
                    update({ sharedFolders: folders });
                  }}>
                  <option value="read-write">Read/Write</option>
                  <option value="read-only">Read Only</option>
                  <option value="no-access">No Access</option>
                </select>
                <button onClick={() => update({ sharedFolders: config.sharedFolders.filter((f) => f.id !== folder.id) })}
                  style={{ padding: '4px 8px', background: dsm.danger + '15', border: `1px solid ${dsm.danger}30`, borderRadius: '4px', color: dsm.danger, cursor: 'pointer', fontSize: '11px' }}>
                  Delete
                </button>
              </div>
            ))}
            <button onClick={() => update({ sharedFolders: [...config.sharedFolders, {
              id: Date.now(), name: 'new-folder', volume: 'Volume 1', description: 'New shared folder', permissions: 'read-write',
            }] })}
              style={{ marginTop: '8px', padding: '8px 16px', background: dsm.accent, border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
              + Create Shared Folder
            </button>
          </div>
        )}

        {activeTab === 'services' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>File Services</h2>
            <p style={{ fontSize: '13px', color: dsm.textLight, marginBottom: '16px' }}>
              Enable file sharing protocols to allow devices on the network to access shared folders.
            </p>
            {[
              { key: 'smb', label: 'SMB (Windows File Sharing)', desc: 'Access shared folders from Windows, macOS, and Linux. Most common protocol for local network file sharing.', port: '445' },
              { key: 'nfs', label: 'NFS (Network File System)', desc: 'Used by Linux/Unix systems and VMware. Good for server-to-server file access.', port: '2049' },
              { key: 'ftp', label: 'FTP (File Transfer Protocol)', desc: 'Classic file transfer. Not encrypted by default — use SFTP for security.', port: '21' },
              { key: 'webdav', label: 'WebDAV', desc: 'Access files over HTTP/HTTPS. Works through firewalls and from remote locations.', port: '5005/5006' },
            ].map((svc) => (
              <div key={svc.key} style={{
                padding: '14px', background: dsm.card, borderRadius: '8px',
                border: `1px solid ${config.fileServices[svc.key as keyof typeof config.fileServices] ? dsm.success + '30' : dsm.border}`,
                marginBottom: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{svc.label}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.fileServices[svc.key as keyof typeof config.fileServices]}
                      onChange={(e) => update({ fileServices: { ...config.fileServices, [svc.key]: e.target.checked } })} />
                    <span style={{ fontSize: '12px', color: config.fileServices[svc.key as keyof typeof config.fileServices] ? dsm.success : dsm.textLight, fontWeight: 600 }}>
                      {config.fileServices[svc.key as keyof typeof config.fileServices] ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div style={{ fontSize: '12px', color: dsm.textLight }}>{svc.desc}</div>
                <div style={{ fontSize: '11px', color: dsm.textLight, marginTop: '4px' }}>Port: {svc.port}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Users</h2>
            {config.users.map((user, idx) => (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px', background: dsm.card, borderRadius: '6px',
                border: `1px solid ${dsm.border}`, marginBottom: '6px',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: user.admin ? dsm.accent + '20' : '#f0f2f5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: user.admin ? dsm.accent : dsm.textLight, fontSize: '16px',
                }}>
                  {user.admin ? '👑' : '👤'}
                </div>
                <div style={{ flex: 1 }}>
                  <input style={{ ...inputStyle, fontWeight: 600, border: 'none', padding: '2px 0' }} value={user.username}
                    onChange={(e) => {
                      const users = [...config.users];
                      users[idx] = { ...users[idx], username: e.target.value };
                      update({ users });
                    }} />
                  <div style={{ fontSize: '11px', color: dsm.textLight }}>
                    {user.admin ? 'Administrator' : 'Standard User'}
                    {!user.enabled && ' — Disabled'}
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={user.enabled}
                    onChange={(e) => {
                      const users = [...config.users];
                      users[idx] = { ...users[idx], enabled: e.target.checked };
                      update({ users });
                    }} />
                  Active
                </label>
                {!user.admin && (
                  <button onClick={() => update({ users: config.users.filter((u) => u.id !== user.id) })}
                    style={{ padding: '4px 8px', background: dsm.danger + '15', border: `1px solid ${dsm.danger}30`, borderRadius: '4px', color: dsm.danger, cursor: 'pointer', fontSize: '11px' }}>
                    Delete
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => update({ users: [...config.users, {
              id: Date.now(), username: 'newuser', description: 'New User', admin: false, enabled: true,
            }] })}
              style={{ marginTop: '8px', padding: '8px 16px', background: dsm.accent, border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
              + Create User
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
