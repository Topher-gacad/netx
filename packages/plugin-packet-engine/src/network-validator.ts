import type { CanvasAPI, ID, ConnectionInstance } from '@netx/sdk';

export type PacketType = 'icmp' | 'arp' | 'tcp' | 'udp';

export interface PacketResult {
  success: boolean;
  hops: PacketHop[];
  error?: string;
  errorAtHop?: number;
}

export interface PacketHop {
  fromDeviceId: ID;
  toDeviceId: ID;
  connectionId: ID;
  fromPort: string;
  toPort: string;
}

export interface DeviceNetConfig {
  hostname: string;
  interfaces: Map<string, { ip?: string; mask?: string; shutdown: boolean }>;
  staticRoutes: Array<{ network: string; mask: string; nextHop: string }>;
}

// External registry — CLI simulator populates this
const deviceConfigs = new Map<ID, DeviceNetConfig>();

export function registerDeviceConfig(deviceId: ID, config: DeviceNetConfig) {
  deviceConfigs.set(deviceId, config);
}

export function getDeviceConfig(deviceId: ID): DeviceNetConfig | undefined {
  return deviceConfigs.get(deviceId);
}

export function simulatePacket(
  sourceDeviceId: ID,
  targetIP: string,
  canvasAPI: CanvasAPI,
): PacketResult {
  const sourceConfig = deviceConfigs.get(sourceDeviceId);
  if (!sourceConfig) {
    return { success: false, hops: [], error: 'Source device has no configuration' };
  }

  // Find source interface with an IP
  const sourceInterface = findActiveInterface(sourceConfig);
  if (!sourceInterface) {
    return { success: false, hops: [], error: 'No active interface with IP configured on source' };
  }

  // Find destination device by IP
  const targetDevice = findDeviceByIP(targetIP, canvasAPI);
  if (!targetDevice) {
    return {
      success: false,
      hops: [],
      error: `Destination host ${targetIP} unreachable — no device has this IP`,
    };
  }

  // Check if target interface is up
  const targetConfig = deviceConfigs.get(targetDevice.deviceId);
  if (targetConfig) {
    const targetIface = findInterfaceByIP(targetConfig, targetIP);
    if (targetIface && targetIface.shutdown) {
      return {
        success: false,
        hops: [],
        error: `Destination interface is administratively shutdown`,
      };
    }
  }

  // Find path via connections
  const path = findPath(sourceDeviceId, targetDevice.deviceId, canvasAPI);
  if (!path || path.length === 0) {
    return {
      success: false,
      hops: [],
      error: 'No cable connection between source and destination',
    };
  }

  // Check each hop — skip L2 devices (switches, hubs)
  for (let i = 0; i < path.length; i++) {
    const hop = path[i];
    const device = canvasAPI.getDevice(hop.fromDeviceId);

    // Switches are L2 — they forward everything, no config needed
    if (device && (device.type === 'switch' || device.type === 'hub')) {
      continue;
    }

    const hopConfig = deviceConfigs.get(hop.fromDeviceId);

    if (hopConfig) {
      // Check if the outgoing interface is shutdown
      const outIface = findInterfaceForPort(hopConfig, hop.fromPort);
      if (outIface?.shutdown) {
        return {
          success: false,
          hops: path,
          error: `Interface ${hop.fromPort} on ${hopConfig.hostname} is shutdown`,
          errorAtHop: i,
        };
      }

      // Check if interface has IP configured (for L3 devices only)
      if (!outIface?.ip && device && (device.type === 'router' || device.type === 'server')) {
        return {
          success: false,
          hops: path,
          error: `No IP address configured on interface ${hop.fromPort} (${hopConfig.hostname})`,
          errorAtHop: i,
        };
      }
    }
  }

  // Check subnet compatibility between source and target
  if (sourceConfig && targetConfig) {
    const srcIface = sourceInterface;
    const tgtIface = findInterfaceByIP(targetConfig, targetIP);
    if (srcIface.ip && srcIface.mask && tgtIface?.ip && tgtIface?.mask) {
      if (!sameSubnet(srcIface.ip, tgtIface.ip, srcIface.mask)) {
        // Different subnets — need a router with interfaces on BOTH subnets
        // Check if source has a static route
        const hasSourceRoute = sourceConfig.staticRoutes.some((r) => {
          return ipInSubnet(targetIP, r.network, r.mask);
        });

        if (hasSourceRoute) {
          return { success: true, hops: path };
        }

        // Check if any router in the path has interfaces on both subnets
        const routerCanRoute = checkRouterInPath(path, srcIface.ip, srcIface.mask, targetIP, tgtIface.mask, canvasAPI);
        if (!routerCanRoute) {
          return {
            success: false,
            hops: path,
            error: `Subnet mismatch — ${srcIface.ip}/${srcIface.mask} cannot reach ${targetIP}/${tgtIface.mask}. Router needs interfaces on both subnets.`,
            errorAtHop: 0,
          };
        }
      }
    }
  }

  return { success: true, hops: path };
}

function findActiveInterface(config: DeviceNetConfig) {
  for (const [, iface] of config.interfaces) {
    if (!iface.shutdown && iface.ip) return iface;
  }
  return null;
}

function findInterfaceByIP(config: DeviceNetConfig, ip: string) {
  for (const [, iface] of config.interfaces) {
    if (iface.ip === ip) return iface;
  }
  return null;
}

function findInterfaceForPort(config: DeviceNetConfig, portId: string) {
  const pid = portId.toLowerCase().replace(/[/-]/g, '');

  for (const [name, iface] of config.interfaces) {
    const iname = name.toLowerCase().replace(/[/-]/g, '');

    // Exact match (normalized)
    if (iname === pid) return iface;

    // Port ID is abbreviation of interface name: eth0 matches ethernet0
    // Extract letters and numbers separately
    const pidLetters = pid.replace(/[0-9]/g, '');
    const pidNumbers = pid.replace(/[^0-9]/g, '');
    const inameLetters = iname.replace(/[0-9]/g, '');
    const inameNumbers = iname.replace(/[^0-9]/g, '');

    // Check if interface name starts with port abbreviation and numbers match
    if (inameLetters.startsWith(pidLetters) && inameNumbers === pidNumbers) return iface;
    if (pidLetters.startsWith(inameLetters) && inameNumbers === pidNumbers) return iface;
  }

  // Fallback: find first interface that has an IP
  for (const [, iface] of config.interfaces) {
    if (iface.ip && !iface.shutdown) return iface;
  }

  return null;
}

function checkRouterInPath(
  path: PacketHop[],
  sourceIP: string,
  sourceMask: string,
  targetIP: string,
  targetMask: string,
  canvasAPI: CanvasAPI,
): boolean {
  // Collect all device IDs in the path (intermediate devices)
  const deviceIdsInPath = new Set<ID>();
  for (const hop of path) {
    deviceIdsInPath.add(hop.fromDeviceId);
    deviceIdsInPath.add(hop.toDeviceId);
  }

  // Check if any router in the path has interfaces on both subnets
  for (const deviceId of deviceIdsInPath) {
    const device = canvasAPI.getDevice(deviceId);
    if (!device || device.type !== 'router') continue;

    const config = deviceConfigs.get(deviceId);
    if (!config) continue;

    let reachesSource = false;
    let reachesTarget = false;

    for (const [, iface] of config.interfaces) {
      if (!iface.ip || !iface.mask || iface.shutdown) continue;

      // Check if this interface is on the source subnet
      if (sameSubnet(iface.ip, sourceIP, sourceMask)) {
        reachesSource = true;
      }
      // Check if this interface is on the target subnet
      if (sameSubnet(iface.ip, targetIP, targetMask)) {
        reachesTarget = true;
      }
    }

    // Also check static routes
    if (reachesSource && !reachesTarget) {
      for (const route of config.staticRoutes) {
        if (ipInSubnet(targetIP, route.network, route.mask)) {
          reachesTarget = true;
        }
      }
    }
    if (!reachesSource && reachesTarget) {
      for (const route of config.staticRoutes) {
        if (ipInSubnet(sourceIP, route.network, route.mask)) {
          reachesSource = true;
        }
      }
    }

    if (reachesSource && reachesTarget) return true;
  }

  return false;
}

function findDeviceByIP(ip: string, canvasAPI: CanvasAPI): { deviceId: ID; interfaceName: string } | null {
  for (const device of canvasAPI.getDevices()) {
    const config = deviceConfigs.get(device.id);
    if (!config) continue;
    for (const [name, iface] of config.interfaces) {
      if (iface.ip === ip) {
        return { deviceId: device.id, interfaceName: name };
      }
    }
  }
  return null;
}

function findPath(sourceId: ID, targetId: ID, canvasAPI: CanvasAPI): PacketHop[] | null {
  const connections = canvasAPI.getConnections();

  // BFS to find shortest path
  const visited = new Set<ID>();
  const queue: Array<{ deviceId: ID; path: PacketHop[] }> = [{ deviceId: sourceId, path: [] }];
  visited.add(sourceId);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.deviceId === targetId) {
      return current.path;
    }

    // Find all connections from current device
    const adjacent = getAdjacentConnections(current.deviceId, connections);
    for (const conn of adjacent) {
      const nextDeviceId = conn.sourceDeviceId === current.deviceId
        ? conn.targetDeviceId
        : conn.sourceDeviceId;
      const fromPort = conn.sourceDeviceId === current.deviceId
        ? conn.sourcePortId
        : conn.targetPortId;
      const toPort = conn.sourceDeviceId === current.deviceId
        ? conn.targetPortId
        : conn.sourcePortId;

      if (!visited.has(nextDeviceId)) {
        visited.add(nextDeviceId);
        queue.push({
          deviceId: nextDeviceId,
          path: [
            ...current.path,
            {
              fromDeviceId: current.deviceId,
              toDeviceId: nextDeviceId,
              connectionId: conn.id,
              fromPort,
              toPort,
            },
          ],
        });
      }
    }
  }

  return null;
}

function getAdjacentConnections(deviceId: ID, connections: ConnectionInstance[]): ConnectionInstance[] {
  return connections.filter(
    (c) => c.sourceDeviceId === deviceId || c.targetDeviceId === deviceId,
  );
}

function ipToNum(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function sameSubnet(ip1: string, ip2: string, mask: string): boolean {
  const m = ipToNum(mask);
  return (ipToNum(ip1) & m) === (ipToNum(ip2) & m);
}

function ipInSubnet(ip: string, network: string, mask: string): boolean {
  const m = ipToNum(mask);
  return (ipToNum(ip) & m) === (ipToNum(network) & m);
}
