import { useState, useEffect } from 'react';
import type { CanvasAPI, EventBus, ID } from '@netx/sdk';

// WiFi network registry
interface WifiNetwork {
  deviceId: ID;
  ssid: string;
  password: string;
  band: string;
  lanIP: string;
  lanMask: string;
}

// Key: "deviceId:band" to support multiple SSIDs per device
const availableNetworks = new Map<string, WifiNetwork>();
const wirelessConnections = new Map<ID, { apDeviceId: ID; ssid: string }>(); // clientDeviceId → AP

let wifiCanvasAPI: CanvasAPI | null = null;
let wifiEventBus: EventBus | null = null;
let wifiForceUpdate: (() => void) | null = null;
let wifiClientDeviceId: ID | null = null;

export function initWifiManager(canvasAPI: CanvasAPI, eventBus: EventBus) {
  wifiCanvasAPI = canvasAPI;
  wifiEventBus = eventBus;

  // Listen for SSID broadcasts
  eventBus.on('wifi:ssid-available', (payload: unknown) => {
    const data = payload as WifiNetwork;
    const key = `${data.deviceId}:${data.band}`;
    availableNetworks.set(key, data);
    console.log(`[WiFi] Registered SSID: "${data.ssid}" (${data.band}) key=${key}. Total: ${availableNetworks.size}`);
  });

  // Listen for SSID clear (when device config changes, old SSIDs are removed first)
  eventBus.on('wifi:ssid-clear', (payload: unknown) => {
    const { deviceId } = payload as { deviceId: string };
    let cleared = 0;
    for (const key of Array.from(availableNetworks.keys())) {
      if (key.startsWith(deviceId + ':')) {
        availableNetworks.delete(key);
        cleared++;
      }
    }
    console.log(`[WiFi] Cleared ${cleared} SSIDs for device ${deviceId}. Remaining: ${availableNetworks.size}`);
  });
}

export function registerAPSSID(deviceId: ID, ssid: string, lanIP: string, lanMask: string) {
  availableNetworks.set(`${deviceId}:2.4GHz`, { deviceId, ssid, password: '', band: '2.4GHz', lanIP, lanMask });
}

export function openWifiDialog(clientDeviceId: ID) {
  wifiClientDeviceId = clientDeviceId;
  wifiForceUpdate?.();
}

export function closeWifiDialog() {
  wifiClientDeviceId = null;
  wifiForceUpdate?.();
}

export function getWirelessConnection(clientId: ID): { apDeviceId: ID; ssid: string } | undefined {
  return wirelessConnections.get(clientId);
}

export function getAllWirelessConnections(): Map<ID, { apDeviceId: ID; ssid: string }> {
  return wirelessConnections;
}

export function isWirelessCapable(deviceType: string): boolean {
  return ['laptop', 'ip-phone', 'wireless-ap'].includes(deviceType);
}

export function connectToWifi(clientId: ID, apDeviceId: ID, ssid: string) {
  // Disconnect from current network first (laptop can only connect to one WiFi)
  const existing = wirelessConnections.get(clientId);
  if (existing) {
    disconnectWifi(clientId);
  }

  wirelessConnections.set(clientId, { apDeviceId, ssid });

  if (wifiEventBus) {
    wifiEventBus.emit('wifi:connected', { clientId, apDeviceId, ssid });
  }

  // Create a virtual wireless connection on the canvas
  if (wifiCanvasAPI) {
    const clientDevice = wifiCanvasAPI.getDevice(clientId);
    const apDevice = wifiCanvasAPI.getDevice(apDeviceId);
    if (!clientDevice || !apDevice) return;

    // Use dedicated WiFi ports — separate from Ethernet so no port conflicts
    const clientPort = 'WiFi0';
    const apPort = 'WiFi0';

    // Remove any existing wireless connection from this client
    const connections = wifiCanvasAPI.getConnections();
    for (const conn of connections) {
      if (conn.type === 'wireless' &&
        (conn.sourceDeviceId === clientId || conn.targetDeviceId === clientId)) {
        wifiCanvasAPI.removeConnection(conn.id);
      }
    }

    try {
      wifiCanvasAPI.addConnection('wireless', clientId, clientPort, apDeviceId, apPort);
    } catch (err) {
      console.warn('[WiFi] Could not create wireless connection:', err);
    }
  }

  wifiForceUpdate?.();
}

export function disconnectWifi(clientId: ID) {
  const conn = wirelessConnections.get(clientId);
  if (conn && wifiCanvasAPI) {
    // Remove the virtual wireless connection
    const connections = wifiCanvasAPI.getConnections();
    const wifiConn = connections.find(
      (c) => (c.sourceDeviceId === clientId && c.targetDeviceId === conn.apDeviceId && c.type === 'wireless') ||
             (c.sourceDeviceId === conn.apDeviceId && c.targetDeviceId === clientId && c.type === 'wireless'),
    );
    if (wifiConn) {
      wifiCanvasAPI.removeConnection(wifiConn.id);
    }
  }
  wirelessConnections.delete(clientId);
  wifiForceUpdate?.();
}

// WiFi connection dialog — shows available SSIDs
export function WifiDialog() {
  const [, setTick] = useState(0);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    wifiForceUpdate = () => setTick((t) => t + 1);
    return () => { wifiForceUpdate = null; };
  }, []);

  if (!wifiClientDeviceId || !wifiCanvasAPI) return null;

  const device = wifiCanvasAPI.getDevice(wifiClientDeviceId);
  if (!device) return null;

  const currentConn = wirelessConnections.get(wifiClientDeviceId);
  const networks = Array.from(availableNetworks.values());
  console.log('[WiFi] Available networks:', networks.length, 'Map keys:', Array.from(availableNetworks.keys()));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>WiFi Networks</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{device.label}</div>
        </div>
        <button
          onClick={() => setTick((t) => t + 1)}
          style={{
            padding: '4px 10px', background: 'var(--accent)20', border: '1px solid var(--accent)40',
            borderRadius: '4px', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer',
          }}
        >
          Scan
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {/* Currently connected */}
        {currentConn && (
          <div style={{
            padding: '12px', background: 'var(--success)' + '10', borderRadius: '6px',
            border: '1px solid var(--success)' + '30', marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>
                  ✓ Connected to {currentConn.ssid}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Wireless connection active</div>
              </div>
              <button
                onClick={() => disconnectWifi(wifiClientDeviceId!)}
                style={{
                  padding: '6px 12px', background: 'var(--error)' + '20', border: '1px solid var(--error)' + '40',
                  borderRadius: '4px', color: 'var(--error)', fontSize: '12px', cursor: 'pointer',
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Available networks */}
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Available Networks ({networks.length})
        </div>

        {networks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No WiFi networks found. Add a TP-Link router or Wireless AP and configure WiFi.
          </div>
        ) : (
          networks.map((network) => {
            const isConnected = currentConn?.apDeviceId === network.deviceId;
            const isConnecting = connecting === network.deviceId;

            return (
              <div key={network.deviceId} style={{
                padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '6px',
                border: `1px solid ${isConnected ? 'var(--success)' + '40' : 'var(--border-color)'}`,
                marginBottom: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Signal strength icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M2 16a10 10 0 0120 0" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                    <path d="M6 16a6 6 0 0112 0" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                    <path d="M10 16a2 2 0 014 0" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="12" cy="17" r="1.5" fill="var(--accent)" />
                  </svg>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{network.ssid}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {network.band} · {network.password ? 'Secured (WPA2)' : 'Open'}
                    </div>
                  </div>

                  {isConnected ? (
                    <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>Connected</span>
                  ) : isConnecting ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        style={{
                          padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          borderRadius: '3px', color: 'var(--text-primary)', fontSize: '12px', width: '120px', outline: 'none',
                        }}
                        type="password" placeholder="Password" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            connectToWifi(wifiClientDeviceId!, network.deviceId, network.ssid);
                            setConnecting(null);
                            setPassword('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          connectToWifi(wifiClientDeviceId!, network.deviceId, network.ssid);
                          setConnecting(null);
                          setPassword('');
                        }}
                        style={{
                          padding: '4px 10px', background: 'var(--accent)', border: 'none',
                          borderRadius: '3px', color: '#fff', fontSize: '11px', cursor: 'pointer',
                        }}
                      >
                        Join
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (network.password) {
                          setConnecting(network.deviceId);
                        } else {
                          connectToWifi(wifiClientDeviceId!, network.deviceId, network.ssid);
                        }
                      }}
                      style={{
                        padding: '4px 12px', background: 'var(--accent)' + '20', border: '1px solid var(--accent)' + '40',
                        borderRadius: '3px', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer',
                      }}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
