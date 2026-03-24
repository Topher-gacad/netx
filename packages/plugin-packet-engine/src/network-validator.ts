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
  interfaces: Map<string, {
    ip?: string;
    mask?: string;
    shutdown: boolean;
    switchportMode?: 'access' | 'trunk';
    accessVlan?: number;
    trunkAllowedVlans?: number[];
    accessGroupIn?: number;
    accessGroupOut?: number;
    natInside?: boolean;
    natOutside?: boolean;
  }>;
  staticRoutes: Array<{ network: string; mask: string; nextHop: string }>;
  acls?: Map<number, { number: number; entries: Array<{ action: 'permit' | 'deny'; source: string; wildcard?: string }> }>;
  ospf?: { processId: number; networks: Array<{ network: string; wildcard: string; area: number }> };
}

// External registry — CLI simulator populates this
const deviceConfigs = new Map<ID, DeviceNetConfig>();

export function registerDeviceConfig(deviceId: ID, config: DeviceNetConfig) {
  deviceConfigs.set(deviceId, config);
}

export function getDeviceConfig(deviceId: ID): DeviceNetConfig | undefined {
  return deviceConfigs.get(deviceId);
}

// ============================================================
// DUPLICATE IP DETECTION
// ============================================================
export function findDuplicateIPs(canvasAPI: CanvasAPI): Array<{ ip: string; devices: string[] }> {
  const ipMap = new Map<string, string[]>();
  for (const device of canvasAPI.getDevices()) {
    const config = deviceConfigs.get(device.id);
    if (!config) continue;
    for (const [, iface] of config.interfaces) {
      if (iface.ip) {
        const list = ipMap.get(iface.ip) ?? [];
        list.push(config.hostname);
        ipMap.set(iface.ip, list);
      }
    }
  }
  const duplicates: Array<{ ip: string; devices: string[] }> = [];
  for (const [ip, devices] of ipMap) {
    if (devices.length > 1) {
      duplicates.push({ ip, devices });
    }
  }
  return duplicates;
}

// ============================================================
// MAIN PACKET SIMULATION
// ============================================================
export function simulatePacket(
  sourceDeviceId: ID,
  targetIP: string,
  canvasAPI: CanvasAPI,
): PacketResult {
  // --- Pre-checks ---
  const sourceConfig = deviceConfigs.get(sourceDeviceId);
  if (!sourceConfig) {
    return { success: false, hops: [], error: 'Source device has no configuration. Double-click the device and configure an IP address.' };
  }

  const sourceInterface = findActiveInterface(sourceConfig);
  if (!sourceInterface) {
    return { success: false, hops: [], error: 'No active interface with IP configured on source. Use: interface <name> → ip address <ip> <mask> → no shutdown' };
  }

  // --- Duplicate IP check ---
  const duplicates = findDuplicateIPs(canvasAPI);
  const targetDup = duplicates.find((d) => d.ip === targetIP);
  if (targetDup) {
    return {
      success: false,
      hops: [],
      error: `IP conflict! ${targetIP} is assigned to multiple devices: ${targetDup.devices.join(', ')}. Each device must have a unique IP.`,
    };
  }
  const sourceDup = duplicates.find((d) => d.ip === sourceInterface.ip);
  if (sourceDup) {
    return {
      success: false,
      hops: [],
      error: `IP conflict! Source IP ${sourceInterface.ip} is also on: ${sourceDup.devices.join(', ')}. Each device must have a unique IP.`,
    };
  }

  // --- Ping self check ---
  if (sourceInterface.ip === targetIP) {
    return { success: true, hops: [], error: undefined };
  }

  // --- Find target device ---
  const targetDevice = findDeviceByIP(targetIP, canvasAPI);
  if (!targetDevice) {
    return {
      success: false,
      hops: [],
      error: `Destination host ${targetIP} unreachable — no device on the canvas has this IP. Check your IP configuration.`,
    };
  }

  // --- Check target interface is up ---
  const targetConfig = deviceConfigs.get(targetDevice.deviceId);
  if (targetConfig) {
    const targetIface = findInterfaceByIP(targetConfig, targetIP);
    if (targetIface && targetIface.shutdown) {
      return {
        success: false,
        hops: [],
        error: `Destination interface on ${targetConfig.hostname} is administratively shutdown. Use "no shutdown" to enable it.`,
      };
    }
  }

  // --- Find physical path ---
  const path = findPath(sourceDeviceId, targetDevice.deviceId, canvasAPI);
  if (!path || path.length === 0) {
    return {
      success: false,
      hops: [],
      error: 'No cable connection between source and destination. Connect the devices with cables.',
    };
  }

  // --- Validate each hop ---
  for (let i = 0; i < path.length; i++) {
    const hop = path[i];
    const device = canvasAPI.getDevice(hop.fromDeviceId);

    // Switches/hubs are L2 — transparent forwarding, no config needed
    if (device && (device.type === 'switch' || device.type === 'hub')) {
      continue;
    }

    const hopConfig = deviceConfigs.get(hop.fromDeviceId);
    if (!hopConfig && device && device.type !== 'switch' && device.type !== 'hub') {
      return {
        success: false,
        hops: path,
        error: `${device.label} has no configuration. Double-click it and configure an IP address.`,
        errorAtHop: i,
      };
    }

    if (hopConfig) {
      const outIface = findInterfaceForPort(hopConfig, hop.fromPort);
      if (outIface?.shutdown) {
        return {
          success: false,
          hops: path,
          error: `Interface ${hop.fromPort} on ${hopConfig.hostname} is administratively shutdown. Use "no shutdown" to enable it.`,
          errorAtHop: i,
        };
      }

      // L3 devices (router, server, pc) need IP on their interfaces
      if (!outIface?.ip && device && (device.type === 'router' || device.type === 'server')) {
        return {
          success: false,
          hops: path,
          error: `No IP address on interface ${hop.fromPort} (${hopConfig.hostname}). Use: ip address <ip> <mask>`,
          errorAtHop: i,
        };
      }
    }
  }

  // --- VLAN isolation check ---
  // When traffic passes through a switch, check VLAN membership on the ports.
  // The switch has 2 hops: one arriving (previous hop → switch) and one leaving (switch → next).
  // We need to find which switch port the cable connects to on each side.
  for (let i = 0; i < path.length; i++) {
    const hop = path[i];

    // Check switches that are the DESTINATION of a hop (traffic arriving)
    // Then check the NEXT hop where the switch is the SOURCE (traffic leaving)
    const switchDevice = canvasAPI.getDevice(hop.toDeviceId);
    if (!switchDevice || (switchDevice.type !== 'switch' && switchDevice.type !== 'l3-switch')) continue;

    const switchConfig = deviceConfigs.get(hop.toDeviceId);
    if (!switchConfig) continue;

    // Ingress port: the port on the switch where this cable arrives (hop.toPort)
    const ingressPortName = hop.toPort;
    const ingressIface = switchConfig.interfaces.get(ingressPortName);

    // Find the egress hop (where switch is fromDeviceId sending traffic onward)
    const egressHop = path.find((h, j) => j > i && h.fromDeviceId === hop.toDeviceId);
    if (!egressHop) continue;

    const egressPortName = egressHop.fromPort;
    const egressIface = switchConfig.interfaces.get(egressPortName);

    // Get VLAN assignments (default VLAN 1 if not configured)
    const ingressVlan = ingressIface?.accessVlan ?? 1;
    const egressVlan = egressIface?.accessVlan ?? 1;
    const ingressMode = ingressIface?.switchportMode ?? 'access';
    const egressMode = egressIface?.switchportMode ?? 'access';

    // Both access ports — must be same VLAN
    if (ingressMode === 'access' && egressMode === 'access' && ingressVlan !== egressVlan) {
      return {
        success: false,
        hops: path,
        error: `VLAN mismatch on ${switchConfig.hostname}: ${ingressPortName} is VLAN ${ingressVlan}, ${egressPortName} is VLAN ${egressVlan}. Devices on different VLANs cannot communicate through the same switch.`,
        errorAtHop: i,
      };
    }

    // Access to trunk — trunk must allow that VLAN
    if (ingressMode === 'access' && egressMode === 'trunk') {
      const allowed = egressIface?.trunkAllowedVlans;
      if (allowed && allowed.length > 0 && !allowed.includes(ingressVlan)) {
        return {
          success: false,
          hops: path,
          error: `VLAN ${ingressVlan} is not allowed on trunk port ${egressPortName} (${switchConfig.hostname}). Use: switchport trunk allowed vlan ${ingressVlan}`,
          errorAtHop: i,
        };
      }
    }

    // Trunk to access — trunk must carry that VLAN
    if (ingressMode === 'trunk' && egressMode === 'access') {
      const allowed = ingressIface?.trunkAllowedVlans;
      if (allowed && allowed.length > 0 && !allowed.includes(egressVlan)) {
        return {
          success: false,
          hops: path,
          error: `VLAN ${egressVlan} is not carried on trunk port ${ingressPortName} (${switchConfig.hostname}).`,
          errorAtHop: i,
        };
      }
    }
  }

  // --- ACL check ---
  // Check if any router/firewall in the path has an ACL blocking this traffic.
  // INBOUND ACL: checked when packet ARRIVES at the device (device is toDeviceId)
  // OUTBOUND ACL: checked when packet LEAVES the device (device is fromDeviceId)
  for (let i = 0; i < path.length; i++) {
    const hop = path[i];

    // --- Check INBOUND ACL: packet arriving at hop.toDeviceId ---
    const arrivalDevice = canvasAPI.getDevice(hop.toDeviceId);
    if (arrivalDevice && (arrivalDevice.type === 'router' || arrivalDevice.type === 'firewall' || arrivalDevice.type === 'l3-switch')) {
      const arrivalConfig = deviceConfigs.get(hop.toDeviceId);
      if (arrivalConfig?.acls && arrivalConfig.acls.size > 0) {
        // The packet enters through hop.toPort on the arrival device
        const inIface = findInterfaceForPort(arrivalConfig, hop.toPort);
        if (inIface?.accessGroupIn) {
          const acl = arrivalConfig.acls.get(inIface.accessGroupIn);
          if (acl) {
            const blocked = checkACL(acl, sourceInterface?.ip ?? '', targetIP);
            if (blocked) {
              return {
                success: false,
                hops: path,
                error: `Blocked by ACL ${acl.number} on ${arrivalConfig.hostname} (inbound on ${hop.toPort}): ${blocked}`,
                errorAtHop: i, // Packet stops at this hop — at the router
              };
            }
          }
        }
      }
    }

    // --- Check OUTBOUND ACL: packet leaving hop.fromDeviceId ---
    const departDevice = canvasAPI.getDevice(hop.fromDeviceId);
    if (departDevice && (departDevice.type === 'router' || departDevice.type === 'firewall' || departDevice.type === 'l3-switch')) {
      const departConfig = deviceConfigs.get(hop.fromDeviceId);
      if (departConfig?.acls && departConfig.acls.size > 0) {
        const outIface = findInterfaceForPort(departConfig, hop.fromPort);
        if (outIface?.accessGroupOut) {
          const acl = departConfig.acls.get(outIface.accessGroupOut);
          if (acl) {
            const blocked = checkACL(acl, sourceInterface?.ip ?? '', targetIP);
            if (blocked) {
              return {
                success: false,
                hops: path,
                error: `Blocked by ACL ${acl.number} on ${departConfig.hostname} (outbound on ${hop.fromPort}): ${blocked}`,
                errorAtHop: i, // Packet stops here — before leaving the router
              };
            }
          }
        }
      }
    }
  }

  // --- Subnet / routing validation ---
  if (sourceConfig && targetConfig) {
    const srcIface = sourceInterface;
    const tgtIface = findInterfaceByIP(targetConfig, targetIP);
    if (srcIface.ip && srcIface.mask && tgtIface?.ip && tgtIface?.mask) {

      // Same subnet — direct communication OK
      if (sameSubnet(srcIface.ip, tgtIface.ip, srcIface.mask)) {
        return { success: true, hops: path };
      }

      // Different subnets — need routing
      // Check source static routes
      const hasSourceRoute = sourceConfig.staticRoutes.some((r) =>
        ipInSubnet(targetIP, r.network, r.mask),
      );
      if (hasSourceRoute) {
        return { success: true, hops: path };
      }

      // Check if a router in the path bridges both subnets
      const routerCanRoute = checkRouterInPath(
        path, srcIface.ip, srcIface.mask, targetIP, tgtIface.mask, canvasAPI,
      );
      if (!routerCanRoute) {
        return {
          success: false,
          hops: path,
          error: `Different subnets: ${srcIface.ip}/${maskToCIDR(srcIface.mask)} and ${tgtIface.ip}/${maskToCIDR(tgtIface.mask)}. Need a Router with interfaces on BOTH subnets, or add a static route.`,
          errorAtHop: 0,
        };
      }
    }
  }

  return { success: true, hops: path };
}

// ============================================================
// CONNECTION VALIDATION (called when creating cables)
// ============================================================
export function validateConnection(
  sourceDeviceId: ID,
  sourcePortId: string,
  targetDeviceId: ID,
  targetPortId: string,
  canvasAPI: CanvasAPI,
): { valid: boolean; warning?: string } {
  const sourceDevice = canvasAPI.getDevice(sourceDeviceId);
  const targetDevice = canvasAPI.getDevice(targetDeviceId);
  if (!sourceDevice || !targetDevice) return { valid: true };

  // Serial ports should only connect to serial ports (router-to-router WAN)
  const sourceIsSerial = sourcePortId.toLowerCase().startsWith('s');
  const targetIsSerial = targetPortId.toLowerCase().startsWith('s');

  if (sourceIsSerial && !targetIsSerial) {
    return {
      valid: false,
      warning: `Cannot connect Serial port to Ethernet port. Serial ports (${sourcePortId}) only connect to other Serial ports for WAN links.`,
    };
  }
  if (!sourceIsSerial && targetIsSerial) {
    return {
      valid: false,
      warning: `Cannot connect Ethernet port to Serial port. Serial ports (${targetPortId}) only connect to other Serial ports for WAN links.`,
    };
  }

  // Warn if connecting same two devices again
  const existingConnections = canvasAPI.getConnections();
  const alreadyConnected = existingConnections.some(
    (c) =>
      (c.sourceDeviceId === sourceDeviceId && c.targetDeviceId === targetDeviceId) ||
      (c.sourceDeviceId === targetDeviceId && c.targetDeviceId === sourceDeviceId),
  );
  if (alreadyConnected) {
    return {
      valid: true,
      warning: `${sourceDevice.label} and ${targetDevice.label} are already connected. Multiple links are only useful for different subnets or redundancy.`,
    };
  }

  return { valid: true };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

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

    // Exact match
    if (iname === pid) return iface;

    // Abbreviation match: eth0 → ethernet0, gi00 → gigabitethernet00
    const pidLetters = pid.replace(/[0-9]/g, '');
    const pidNumbers = pid.replace(/[^0-9]/g, '');
    const inameLetters = iname.replace(/[0-9]/g, '');
    const inameNumbers = iname.replace(/[^0-9]/g, '');

    if (inameLetters.startsWith(pidLetters) && inameNumbers === pidNumbers) return iface;
    if (pidLetters.startsWith(inameLetters) && inameNumbers === pidNumbers) return iface;
  }

  // Fallback: first interface with IP and up
  for (const [, iface] of config.interfaces) {
    if (iface.ip && !iface.shutdown) return iface;
  }

  return null;
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
  const visited = new Set<ID>();
  const queue: Array<{ deviceId: ID; path: PacketHop[] }> = [{ deviceId: sourceId, path: [] }];
  visited.add(sourceId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.deviceId === targetId) return current.path;

    const adjacent = getAdjacentConnections(current.deviceId, connections);
    for (const conn of adjacent) {
      const nextDeviceId = conn.sourceDeviceId === current.deviceId
        ? conn.targetDeviceId : conn.sourceDeviceId;
      const fromPort = conn.sourceDeviceId === current.deviceId
        ? conn.sourcePortId : conn.targetPortId;
      const toPort = conn.sourceDeviceId === current.deviceId
        ? conn.targetPortId : conn.sourcePortId;

      if (!visited.has(nextDeviceId)) {
        visited.add(nextDeviceId);
        queue.push({
          deviceId: nextDeviceId,
          path: [...current.path, {
            fromDeviceId: current.deviceId,
            toDeviceId: nextDeviceId,
            connectionId: conn.id,
            fromPort,
            toPort,
          }],
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

function checkRouterInPath(
  path: PacketHop[],
  sourceIP: string,
  sourceMask: string,
  targetIP: string,
  targetMask: string,
  canvasAPI: CanvasAPI,
): boolean {
  const deviceIdsInPath = new Set<ID>();
  for (const hop of path) {
    deviceIdsInPath.add(hop.fromDeviceId);
    deviceIdsInPath.add(hop.toDeviceId);
  }

  for (const deviceId of deviceIdsInPath) {
    const device = canvasAPI.getDevice(deviceId);
    if (!device || device.type !== 'router') continue;

    const config = deviceConfigs.get(deviceId);
    if (!config) continue;

    let reachesSource = false;
    let reachesTarget = false;

    for (const [, iface] of config.interfaces) {
      if (!iface.ip || !iface.mask || iface.shutdown) continue;
      if (sameSubnet(iface.ip, sourceIP, sourceMask)) reachesSource = true;
      if (sameSubnet(iface.ip, targetIP, targetMask)) reachesTarget = true;
    }

    // Also check static routes
    for (const route of config.staticRoutes) {
      if (ipInSubnet(targetIP, route.network, route.mask)) reachesTarget = true;
      if (ipInSubnet(sourceIP, route.network, route.mask)) reachesSource = true;
    }

    // Also check OSPF routes — including routes learned from OSPF neighbors
    if (config.ospf) {
      // Check own OSPF networks
      if (ospfReachesNetwork(config, targetIP)) reachesTarget = true;
      if (ospfReachesNetwork(config, sourceIP)) reachesSource = true;

      // Simulate OSPF route exchange: find OSPF neighbors (connected routers also running OSPF)
      // and include their advertised networks as learned routes
      const neighborRoutes = getOSPFNeighborRoutes(deviceId, canvasAPI);
      for (const route of neighborRoutes) {
        if (ospfNetworkMatches(route, targetIP)) reachesTarget = true;
        if (ospfNetworkMatches(route, sourceIP)) reachesSource = true;
      }
    }

    if (reachesSource && reachesTarget) return true;
  }
  return false;
}

// Simulate OSPF neighbor discovery: find all routers connected to this one
// that also run OSPF, and return their advertised networks
function getOSPFNeighborRoutes(routerId: ID, canvasAPI: CanvasAPI): Array<{ network: string; wildcard: string }> {
  const routes: Array<{ network: string; wildcard: string }> = [];
  const connections = canvasAPI.getConnections();
  const visited = new Set<ID>([routerId]);
  const queue: ID[] = [];

  // Find directly connected devices
  for (const conn of connections) {
    if (conn.sourceDeviceId === routerId) queue.push(conn.targetDeviceId);
    if (conn.targetDeviceId === routerId) queue.push(conn.sourceDeviceId);
  }

  // BFS through connected devices to find OSPF neighbors (through switches too)
  while (queue.length > 0) {
    const deviceId = queue.shift()!;
    if (visited.has(deviceId)) continue;
    visited.add(deviceId);

    const device = canvasAPI.getDevice(deviceId);
    if (!device) continue;

    // Switches are transparent — continue through them
    if (device.type === 'switch' || device.type === 'hub' || device.type === 'l3-switch') {
      for (const conn of connections) {
        if (conn.sourceDeviceId === deviceId && !visited.has(conn.targetDeviceId)) queue.push(conn.targetDeviceId);
        if (conn.targetDeviceId === deviceId && !visited.has(conn.sourceDeviceId)) queue.push(conn.sourceDeviceId);
      }
      continue;
    }

    // If it's a router with OSPF, collect its advertised networks
    if (device.type === 'router') {
      const neighborConfig = deviceConfigs.get(deviceId);
      if (neighborConfig?.ospf) {
        for (const net of neighborConfig.ospf.networks) {
          routes.push({ network: net.network, wildcard: net.wildcard });
        }
        // Also include the neighbor's directly connected subnets
        for (const [, iface] of neighborConfig.interfaces) {
          if (iface.ip && iface.mask && !iface.shutdown) {
            // Convert mask to wildcard
            const maskNum = ipToNum(iface.mask);
            const wcNum = (~maskNum) >>> 0;
            const wildcard = [(wcNum >>> 24) & 0xff, (wcNum >>> 16) & 0xff, (wcNum >>> 8) & 0xff, wcNum & 0xff].join('.');
            // Get network address
            const ipNum = ipToNum(iface.ip);
            const netNum = (ipNum & maskNum) >>> 0;
            const network = [(netNum >>> 24) & 0xff, (netNum >>> 16) & 0xff, (netNum >>> 8) & 0xff, netNum & 0xff].join('.');
            routes.push({ network, wildcard });
          }
        }
      }
    }
  }

  return routes;
}

function ospfNetworkMatches(route: { network: string; wildcard: string }, ip: string): boolean {
  const wcNum = ipToNum(route.wildcard);
  const maskNum = (~wcNum) >>> 0;
  const mask = [(maskNum >>> 24) & 0xff, (maskNum >>> 16) & 0xff, (maskNum >>> 8) & 0xff, maskNum & 0xff].join('.');
  return ipInSubnet(ip, route.network, mask);
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

function maskToCIDR(mask: string): number {
  const num = ipToNum(mask);
  let bits = 0;
  let n = num;
  while (n) {
    bits += n & 1;
    n >>>= 1;
  }
  return bits;
}

// Check ACL — returns error message if blocked, null if permitted
function checkACL(
  acl: { number: number; entries: Array<{ action: 'permit' | 'deny'; source: string; wildcard?: string }> },
  sourceIP: string,
  destIP: string,
): string | null {
  for (const entry of acl.entries) {
    const matches = matchACLEntry(entry, sourceIP);
    if (matches) {
      if (entry.action === 'deny') {
        return `deny ${entry.source} ${entry.wildcard ?? ''} (matched source ${sourceIP})`;
      }
      return null; // permit — allow traffic
    }
  }
  // Implicit deny all at end of ACL
  return `implicit deny all (no matching permit entry for ${sourceIP})`;
}

function matchACLEntry(
  entry: { source: string; wildcard?: string },
  ip: string,
): boolean {
  if (entry.source === 'any') return true;
  if (!entry.wildcard || entry.wildcard === '0.0.0.0') {
    return entry.source === ip; // exact match (host)
  }
  // Wildcard match: 0 = must match, 1 = don't care (opposite of subnet mask)
  const ipNum = ipToNum(ip);
  const srcNum = ipToNum(entry.source);
  const wcNum = ipToNum(entry.wildcard);
  return (ipNum & ~wcNum) === (srcNum & ~wcNum);
}

// Check if OSPF on a device advertises a network
function ospfReachesNetwork(config: DeviceNetConfig, targetIP: string): boolean {
  if (!config.ospf) return false;
  for (const net of config.ospf.networks) {
    // Convert wildcard to mask for comparison
    const wcNum = ipToNum(net.wildcard);
    const maskNum = (~wcNum) >>> 0;
    const mask = [
      (maskNum >>> 24) & 0xff,
      (maskNum >>> 16) & 0xff,
      (maskNum >>> 8) & 0xff,
      maskNum & 0xff,
    ].join('.');
    if (ipInSubnet(targetIP, net.network, mask)) return true;
  }
  return false;
}
