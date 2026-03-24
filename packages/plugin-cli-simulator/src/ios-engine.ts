import type { CanvasAPI, EventBus, ID } from '@netx/sdk';

export type CLIMode = 'user' | 'privileged' | 'global-config' | 'interface-config' | 'vlan-config' | 'dhcp-config' | 'router-config';

export interface DHCPPool {
  name: string;
  network?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  nextAddress: number; // counter for next IP to assign
}

export interface InterfaceConfig {
  ip?: string;
  mask?: string;
  shutdown: boolean;
  description?: string;
  // Switch port VLAN settings
  switchportMode?: 'access' | 'trunk';
  accessVlan?: number;
  trunkAllowedVlans?: number[]; // empty = all allowed
  // ACL applied to interface
  accessGroupIn?: number;
  accessGroupOut?: number;
  // NAT
  natInside?: boolean;
  natOutside?: boolean;
}

export interface ACLEntry {
  action: 'permit' | 'deny';
  source: string; // IP or 'any'
  wildcard?: string; // wildcard mask
}

export interface ACL {
  number: number;
  entries: ACLEntry[];
}

export interface NATRule {
  type: 'static' | 'dynamic';
  insideLocal: string;
  insideGlobal: string;
  aclNumber?: number;
}

export interface OSPFConfig {
  processId: number;
  routerId?: string;
  networks: Array<{ network: string; wildcard: string; area: number }>;
}

export interface DeviceCLIState {
  deviceId: ID;
  hostname: string;
  mode: CLIMode;
  currentInterface?: string;
  currentVlan?: number;
  interfaces: Map<string, InterfaceConfig>;
  vlans: Map<number, string>;
  staticRoutes: Array<{ network: string; mask: string; nextHop: string }>;
  dhcpPools: Map<string, DHCPPool>;
  currentDHCPPool?: string;
  acls: Map<number, ACL>;
  natRules: NATRule[];
  ospf?: OSPFConfig;
  history: string[];
  historyIndex: number;
  secretPassword?: string;
}

export function createDeviceCLIState(deviceId: ID, hostname: string, ports: string[]): DeviceCLIState {
  const interfaces = new Map<string, InterfaceConfig>();
  for (const port of ports) {
    interfaces.set(port, { shutdown: true });
  }
  return {
    deviceId,
    hostname,
    mode: 'user',
    interfaces,
    vlans: new Map([[1, 'default']]),
    staticRoutes: [],
    dhcpPools: new Map(),
    acls: new Map(),
    natRules: [],
    history: [],
    historyIndex: -1,
  };
}

export interface CLIResult {
  output: string;
  state: DeviceCLIState;
}

export function executeCommand(input: string, state: DeviceCLIState, canvasAPI: CanvasAPI, eventBus?: EventBus): CLIResult {
  const trimmed = input.trim();
  if (!trimmed) return { output: '', state };

  // Add to history
  state = { ...state, history: [...state.history, trimmed], historyIndex: state.history.length + 1 };

  const parts = trimmed.toLowerCase().split(/\s+/);
  const cmd = parts[0];

  let result: CLIResult;

  switch (state.mode) {
    case 'user':
      result = execUserMode(parts, cmd, trimmed, state, canvasAPI, eventBus);
      break;
    case 'privileged':
      result = execPrivilegedMode(parts, cmd, trimmed, state, canvasAPI, eventBus);
      break;
    case 'global-config':
      result = execGlobalConfig(parts, cmd, trimmed, state, canvasAPI);
      break;
    case 'interface-config':
      result = execInterfaceConfig(parts, cmd, trimmed, state);
      break;
    case 'vlan-config':
      result = execVlanConfig(parts, cmd, trimmed, state);
      break;
    case 'dhcp-config':
      result = execDHCPConfig(parts, cmd, trimmed, state);
      break;
    case 'router-config':
      result = execRouterConfig(parts, cmd, trimmed, state);
      break;
    default:
      result = { output: '', state };
  }

  // Emit config change for packet engine
  if (eventBus) {
    eventBus.emit('cli:config-changed', {
      deviceId: result.state.deviceId,
      config: {
        hostname: result.state.hostname,
        interfaces: result.state.interfaces,
        staticRoutes: result.state.staticRoutes,
        acls: result.state.acls,
        ospf: result.state.ospf,
      },
    });
  }

  // Register DHCP pools if this device has any
  registerDHCPServer(result.state.deviceId, result.state.dhcpPools);

  // Sync IP info to canvas device config so renderers can display it
  const ips: string[] = [];
  for (const [name, iface] of result.state.interfaces) {
    if (iface.ip) {
      ips.push(`${iface.ip}/${iface.mask ?? ''}`);
    }
  }
  canvasAPI.updateDevice(result.state.deviceId, {
    config: {
      ...canvasAPI.getDevice(result.state.deviceId)?.config,
      ips,
      hostname: result.state.hostname,
    },
  });

  return result;
}

function execUserMode(parts: string[], cmd: string, _raw: string, state: DeviceCLIState, canvasAPI: CanvasAPI, eventBus?: EventBus): CLIResult {
  switch (cmd) {
    case 'enable':
      return { output: '', state: { ...state, mode: 'privileged' } };
    case 'show':
      return handleShow(parts, state);
    case 'ping':
      return handlePing(parts, state, eventBus);
    case 'ipconfig':
      return handleIPConfig(parts, state, canvasAPI, eventBus);
    case 'exit':
    case 'logout':
      return { output: `${state.hostname} con0 is now available\n\nPress RETURN to get started.`, state };
    case '?':
    case 'help':
      return {
        output: [
          '  enable    Turn on privileged commands',
          '  exit      Exit from the EXEC',
          '  ipconfig  Request IP via DHCP or view current IP',
          '  ping      Send echo messages',
          '  show      Show running system information',
          '  traceroute  Trace route to destination',
        ].join('\n'),
        state,
      };
    default:
      return invalidInput(cmd, state);
  }
}

function execPrivilegedMode(parts: string[], cmd: string, _raw: string, state: DeviceCLIState, canvasAPI: CanvasAPI, eventBus?: EventBus): CLIResult {
  switch (cmd) {
    case 'configure':
      if (parts[1] === 'terminal' || parts[1] === 't') {
        return { output: 'Enter configuration commands, one per line. End with CNTL/Z.', state: { ...state, mode: 'global-config' } };
      }
      return invalidInput(_raw, state);
    case 'show':
      return handleShow(parts, state);
    case 'ping':
      return handlePing(parts, state, eventBus);
    case 'ipconfig':
      return handleIPConfig(parts, state, canvasAPI, eventBus);
    case 'disable':
      return { output: '', state: { ...state, mode: 'user' } };
    case 'exit':
      return { output: '', state: { ...state, mode: 'user' } };
    case 'write':
    case 'copy':
      return { output: '[OK]', state };
    case '?':
    case 'help':
      return {
        output: [
          '  configure   Enter configuration mode',
          '  copy        Copy from one file to another',
          '  disable     Turn off privileged commands',
          '  exit        Exit from the EXEC',
          '  ping        Send echo messages',
          '  show        Show running system information',
          '  write       Write running configuration to memory',
        ].join('\n'),
        state,
      };
    default:
      return invalidInput(cmd, state);
  }
}

function execGlobalConfig(parts: string[], cmd: string, raw: string, state: DeviceCLIState, canvasAPI: CanvasAPI): CLIResult {
  switch (cmd) {
    case 'hostname': {
      const newName = parts[1];
      if (!newName) return { output: '% Incomplete command.', state };
      const newState = { ...state, hostname: newName };
      // Update device label on canvas
      canvasAPI.updateDevice(state.deviceId, { label: newName });
      return { output: '', state: newState };
    }
    case 'interface': {
      const available = Array.from(state.interfaces.keys());
      const ifName = resolveInterface(parts.slice(1).join(' '), available);
      if (!ifName) {
        return {
          output: `% Invalid interface: ${parts.slice(1).join(' ')}\n  Available: ${available.join(', ')}`,
          state,
        };
      }
      return { output: '', state: { ...state, mode: 'interface-config', currentInterface: ifName } };
    }
    case 'vlan': {
      const vlanId = parseInt(parts[1]);
      if (isNaN(vlanId) || vlanId < 1 || vlanId > 4094) {
        return { output: '% Invalid VLAN ID (1-4094)', state };
      }
      if (!state.vlans.has(vlanId)) {
        state.vlans.set(vlanId, `VLAN${String(vlanId).padStart(4, '0')}`);
      }
      return { output: '', state: { ...state, mode: 'vlan-config', currentVlan: vlanId } };
    }
    case 'ip': {
      if (parts[1] === 'route') {
        const network = parts[2];
        const mask = parts[3];
        const nextHop = parts[4];
        if (!network || !mask || !nextHop) {
          return { output: '% Incomplete command.', state };
        }
        return {
          output: '',
          state: { ...state, staticRoutes: [...state.staticRoutes, { network, mask, nextHop }] },
        };
      }
      if (parts[1] === 'dhcp' && parts[2] === 'pool') {
        const poolName = parts[3];
        if (!poolName) return { output: '% Incomplete command. Use: ip dhcp pool <name>', state };
        const dhcpPools = new Map(state.dhcpPools);
        if (!dhcpPools.has(poolName)) {
          dhcpPools.set(poolName, { name: poolName, nextAddress: 10 });
        }
        return { output: '', state: { ...state, dhcpPools, mode: 'dhcp-config', currentDHCPPool: poolName } };
      }
      // ip nat inside source static <local> <global>
      if (parts[1] === 'nat' && parts[2] === 'inside' && parts[3] === 'source') {
        if (parts[4] === 'static' && parts[5] && parts[6]) {
          return {
            output: '',
            state: {
              ...state,
              natRules: [...state.natRules, { type: 'static', insideLocal: parts[5], insideGlobal: parts[6] }],
            },
          };
        }
        // ip nat inside source list <acl#> interface <if>
        if (parts[4] === 'list' && parts[5]) {
          const aclNum = parseInt(parts[5]);
          const globalIf = parts[7]; // after "interface"
          return {
            output: '',
            state: {
              ...state,
              natRules: [...state.natRules, { type: 'dynamic', insideLocal: 'pool', insideGlobal: globalIf ?? 'overload', aclNumber: aclNum }],
            },
          };
        }
        return { output: '% Usage: ip nat inside source static <local-ip> <global-ip>', state };
      }
      return invalidInput(raw, state);
    }
    case 'access-list': {
      const aclNum = parseInt(parts[1]);
      if (isNaN(aclNum) || aclNum < 1 || aclNum > 199) {
        return { output: '% Invalid ACL number (1-199)', state };
      }
      const action = parts[2] as 'permit' | 'deny';
      if (action !== 'permit' && action !== 'deny') {
        return { output: '% Use: access-list <number> permit|deny <source> [wildcard]', state };
      }
      const source = parts[3] ?? 'any';
      const wildcard = parts[4];

      const acls = new Map(state.acls);
      const existing = acls.get(aclNum) ?? { number: aclNum, entries: [] };
      existing.entries = [...existing.entries, { action, source, wildcard }];
      acls.set(aclNum, existing);

      return { output: '', state: { ...state, acls } };
    }
    case 'router': {
      if (parts[1] === 'ospf') {
        const processId = parseInt(parts[2]) || 1;
        return {
          output: '',
          state: {
            ...state,
            mode: 'router-config',
            ospf: state.ospf ?? { processId, networks: [] },
          },
        };
      }
      return invalidInput(raw, state);
    }
    case 'enable': {
      if (parts[1] === 'secret' && parts[2]) {
        return { output: '', state: { ...state, secretPassword: parts[2] } };
      }
      return invalidInput(raw, state);
    }
    case 'no': {
      if (parts[1] === 'ip' && parts[2] === 'route') {
        const network = parts[3];
        const mask = parts[4];
        const nextHop = parts[5];
        return {
          output: '',
          state: {
            ...state,
            staticRoutes: state.staticRoutes.filter(
              (r) => !(r.network === network && r.mask === mask && r.nextHop === nextHop),
            ),
          },
        };
      }
      return invalidInput(raw, state);
    }
    case 'exit':
    case 'end':
      return { output: '', state: { ...state, mode: 'privileged' } };
    case '?':
    case 'help':
      return {
        output: [
          '  access-list   Configure ACL (access control list)',
          '  enable        Modify enable password parameters',
          '  exit          Exit from configure mode',
          '  hostname      Set system hostname',
          '  interface     Select an interface to configure',
          '  ip            Global IP configuration (route, dhcp, nat)',
          '  no            Negate a command',
          '  router        Configure routing protocol (ospf)',
          '  vlan          VLAN commands',
        ].join('\n'),
        state,
      };
    default:
      return invalidInput(cmd, state);
  }
}

function execInterfaceConfig(parts: string[], cmd: string, raw: string, state: DeviceCLIState): CLIResult {
  const ifName = state.currentInterface!;
  const iface = state.interfaces.get(ifName)!;

  switch (cmd) {
    case 'ip': {
      if (parts[1] === 'address' && parts[2] && parts[3]) {
        const updated = { ...iface, ip: parts[2], mask: parts[3] };
        const interfaces = new Map(state.interfaces);
        interfaces.set(ifName, updated);
        return { output: '', state: { ...state, interfaces } };
      }
      // ip access-group <acl#> in|out
      if (parts[1] === 'access-group') {
        const aclNum = parseInt(parts[2]);
        const direction = parts[3]; // 'in' or 'out'
        if (isNaN(aclNum) || (direction !== 'in' && direction !== 'out')) {
          return { output: '% Usage: ip access-group <acl-number> in|out', state };
        }
        const updated = direction === 'in'
          ? { ...iface, accessGroupIn: aclNum }
          : { ...iface, accessGroupOut: aclNum };
        const interfaces = new Map(state.interfaces);
        interfaces.set(ifName, updated);
        return { output: '', state: { ...state, interfaces } };
      }
      // ip nat inside | ip nat outside
      if (parts[1] === 'nat') {
        if (parts[2] === 'inside') {
          const updated = { ...iface, natInside: true, natOutside: false };
          const interfaces = new Map(state.interfaces);
          interfaces.set(ifName, updated);
          return { output: '', state: { ...state, interfaces } };
        }
        if (parts[2] === 'outside') {
          const updated = { ...iface, natOutside: true, natInside: false };
          const interfaces = new Map(state.interfaces);
          interfaces.set(ifName, updated);
          return { output: '', state: { ...state, interfaces } };
        }
        return { output: '% Usage: ip nat inside|outside', state };
      }
      return { output: '% Incomplete command.', state };
    }
    case 'no': {
      if (parts[1] === 'shutdown') {
        const updated = { ...iface, shutdown: false };
        const interfaces = new Map(state.interfaces);
        interfaces.set(ifName, updated);
        return {
          output: `%LINK-5-CHANGED: Interface ${ifName}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${ifName}, changed state to up`,
          state: { ...state, interfaces },
        };
      }
      if (parts[1] === 'ip' && parts[2] === 'address') {
        const updated = { ...iface, ip: undefined, mask: undefined };
        const interfaces = new Map(state.interfaces);
        interfaces.set(ifName, updated);
        return { output: '', state: { ...state, interfaces } };
      }
      return invalidInput(raw, state);
    }
    case 'shutdown': {
      const updated = { ...iface, shutdown: true };
      const interfaces = new Map(state.interfaces);
      interfaces.set(ifName, updated);
      return {
        output: `%LINK-5-CHANGED: Interface ${ifName}, changed state to administratively down`,
        state: { ...state, interfaces },
      };
    }
    case 'description': {
      const desc = parts.slice(1).join(' ');
      const updated = { ...iface, description: desc };
      const interfaces = new Map(state.interfaces);
      interfaces.set(ifName, updated);
      return { output: '', state: { ...state, interfaces } };
    }
    case 'switchport': {
      // switchport mode access
      if (parts[1] === 'mode' && parts[2] === 'access') {
        const updated = { ...iface, switchportMode: 'access' as const };
        const interfaces = new Map(state.interfaces);
        interfaces.set(ifName, updated);
        return { output: '', state: { ...state, interfaces } };
      }
      // switchport mode trunk
      if (parts[1] === 'mode' && parts[2] === 'trunk') {
        const updated = { ...iface, switchportMode: 'trunk' as const, trunkAllowedVlans: [] };
        const interfaces = new Map(state.interfaces);
        interfaces.set(ifName, updated);
        return { output: '', state: { ...state, interfaces } };
      }
      // switchport access vlan <id>
      if (parts[1] === 'access' && parts[2] === 'vlan') {
        const vlanId = parseInt(parts[3]);
        if (isNaN(vlanId) || vlanId < 1 || vlanId > 4094) {
          return { output: '% Invalid VLAN ID (1-4094)', state };
        }
        const updated = { ...iface, switchportMode: 'access' as const, accessVlan: vlanId };
        const interfaces = new Map(state.interfaces);
        interfaces.set(ifName, updated);
        return { output: '', state: { ...state, interfaces } };
      }
      // switchport trunk allowed vlan <ids>
      if (parts[1] === 'trunk' && parts[2] === 'allowed' && parts[3] === 'vlan') {
        const vlanIds = parts[4]?.split(',').map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= 4094);
        if (!vlanIds || vlanIds.length === 0) {
          return { output: '% Invalid VLAN list. Use: switchport trunk allowed vlan 10,20,30', state };
        }
        const updated = { ...iface, switchportMode: 'trunk' as const, trunkAllowedVlans: vlanIds };
        const interfaces = new Map(state.interfaces);
        interfaces.set(ifName, updated);
        return { output: '', state: { ...state, interfaces } };
      }
      return { output: '% Incomplete command. Use: switchport mode access|trunk, switchport access vlan <id>', state };
    }
    case 'exit':
      return { output: '', state: { ...state, mode: 'global-config', currentInterface: undefined } };
    case 'end':
      return { output: '', state: { ...state, mode: 'privileged', currentInterface: undefined } };
    case '?':
    case 'help':
      return {
        output: [
          '  description    Interface specific description',
          '  exit           Exit from interface configuration mode',
          '  ip             Interface IP configuration / access-group / nat',
          '  no             Negate a command or set its defaults',
          '  shutdown       Shutdown the selected interface',
          '  switchport     Set switching mode (access/trunk) and VLAN',
        ].join('\n'),
        state,
      };
    default:
      return invalidInput(cmd, state);
  }
}

function execVlanConfig(parts: string[], cmd: string, _raw: string, state: DeviceCLIState): CLIResult {
  const vlanId = state.currentVlan!;

  switch (cmd) {
    case 'name': {
      const name = parts.slice(1).join(' ');
      if (!name) return { output: '% Incomplete command.', state };
      const vlans = new Map(state.vlans);
      vlans.set(vlanId, name);
      return { output: '', state: { ...state, vlans } };
    }
    case 'exit':
      return { output: '', state: { ...state, mode: 'global-config', currentVlan: undefined } };
    case 'end':
      return { output: '', state: { ...state, mode: 'privileged', currentVlan: undefined } };
    default:
      return invalidInput(cmd, state);
  }
}

function execDHCPConfig(parts: string[], cmd: string, _raw: string, state: DeviceCLIState): CLIResult {
  const poolName = state.currentDHCPPool!;
  const pool = state.dhcpPools.get(poolName)!;

  switch (cmd) {
    case 'network': {
      const network = parts[1];
      const mask = parts[2];
      if (!network || !mask) return { output: '% Incomplete command. Use: network <ip> <mask>', state };
      const dhcpPools = new Map(state.dhcpPools);
      dhcpPools.set(poolName, { ...pool, network, mask });
      return { output: '', state: { ...state, dhcpPools } };
    }
    case 'default-router': {
      const gw = parts[1];
      if (!gw) return { output: '% Incomplete command. Use: default-router <gateway-ip>', state };
      const dhcpPools = new Map(state.dhcpPools);
      dhcpPools.set(poolName, { ...pool, gateway: gw });
      return { output: '', state: { ...state, dhcpPools } };
    }
    case 'dns-server': {
      const dns = parts[1];
      if (!dns) return { output: '% Incomplete command. Use: dns-server <dns-ip>', state };
      const dhcpPools = new Map(state.dhcpPools);
      dhcpPools.set(poolName, { ...pool, dns });
      return { output: '', state: { ...state, dhcpPools } };
    }
    case 'exit':
      return { output: '', state: { ...state, mode: 'global-config', currentDHCPPool: undefined } };
    case 'end':
      return { output: '', state: { ...state, mode: 'privileged', currentDHCPPool: undefined } };
    case '?':
    case 'help':
      return {
        output: [
          '  network          Pool network and mask',
          '  default-router   Default gateway for clients',
          '  dns-server       DNS server for clients',
          '  exit             Exit DHCP pool configuration',
        ].join('\n'),
        state,
      };
    default:
      return invalidInput(cmd, state);
  }
}

function execRouterConfig(parts: string[], cmd: string, _raw: string, state: DeviceCLIState): CLIResult {
  switch (cmd) {
    case 'network': {
      const network = parts[1];
      const wildcard = parts[2];
      const areaIdx = parts.indexOf('area');
      const area = areaIdx >= 0 ? parseInt(parts[areaIdx + 1]) || 0 : 0;
      if (!network || !wildcard) {
        return { output: '% Usage: network <ip> <wildcard> area <area-id>', state };
      }
      const ospf = { ...state.ospf!, networks: [...state.ospf!.networks, { network, wildcard, area }] };
      return { output: '', state: { ...state, ospf } };
    }
    case 'router-id': {
      const rid = parts[1];
      if (!rid) return { output: '% Usage: router-id <ip>', state };
      return { output: '', state: { ...state, ospf: { ...state.ospf!, routerId: rid } } };
    }
    case 'exit':
      return { output: '', state: { ...state, mode: 'global-config' } };
    case 'end':
      return { output: '', state: { ...state, mode: 'privileged' } };
    case '?':
    case 'help':
      return {
        output: [
          '  network     Advertise a network in OSPF',
          '  router-id   Set OSPF router ID',
          '  exit        Exit router configuration',
        ].join('\n'),
        state,
      };
    default:
      return invalidInput(cmd, state);
  }
}

function handleShow(parts: string[], state: DeviceCLIState): CLIResult {
  const sub = parts.slice(1).join(' ');

  if (sub === 'ip interface brief' || sub === 'ip int brief' || sub === 'ip int br') {
    const header = 'Interface              IP-Address      OK? Method Status                Protocol';
    const lines = Array.from(state.interfaces.entries()).map(([name, cfg]) => {
      const ip = cfg.ip ?? 'unassigned';
      const status = cfg.shutdown ? 'administratively down' : 'up';
      const proto = cfg.shutdown ? 'down' : 'up';
      return `${name.padEnd(23)}${ip.padEnd(16)}YES manual ${status.padEnd(22)}${proto}`;
    });
    return { output: [header, ...lines].join('\n'), state };
  }

  if (sub === 'running-config' || sub === 'run') {
    return { output: buildRunningConfig(state), state };
  }

  if (sub === 'ip route') {
    if (state.staticRoutes.length === 0) {
      return { output: '% No routes configured', state };
    }
    const lines = state.staticRoutes.map(
      (r) => `S    ${r.network} ${r.mask} [1/0] via ${r.nextHop}`,
    );
    return { output: lines.join('\n'), state };
  }

  if (sub === 'vlan' || sub === 'vlan brief') {
    const header = 'VLAN Name                             Status    Ports';
    const sep = '---- -------------------------------- --------- --------';
    const lines = Array.from(state.vlans.entries()).map(([id, name]) => {
      // Find ports assigned to this VLAN
      const ports: string[] = [];
      for (const [pname, pcfg] of state.interfaces) {
        if (pcfg.switchportMode === 'access' && (pcfg.accessVlan ?? 1) === id) {
          ports.push(pname);
        }
      }
      const portStr = ports.length > 0 ? ports.join(', ') : '';
      return `${String(id).padEnd(5)}${name.padEnd(33)}active    ${portStr}`;
    });
    return { output: [header, sep, ...lines].join('\n'), state };
  }

  if (sub === 'version') {
    return {
      output: [
        'Cisco IOS Software [NetX Simulator]',
        `System image file is "flash:netx-sim.bin"`,
        '',
        `Hostname: ${state.hostname}`,
      ].join('\n'),
      state,
    };
  }

  if (sub === 'access-lists' || sub === 'access-list') {
    if (state.acls.size === 0) return { output: '% No ACLs configured', state };
    const lines: string[] = [];
    for (const [num, acl] of state.acls) {
      lines.push(`Standard IP access list ${num}`);
      for (const entry of acl.entries) {
        const src = entry.source === 'any' ? 'any' : `${entry.source} ${entry.wildcard ?? '0.0.0.0'}`;
        lines.push(`    ${entry.action} ${src}`);
      }
    }
    return { output: lines.join('\n'), state };
  }

  if (sub === 'ip nat translations') {
    if (state.natRules.length === 0) return { output: '% No NAT translations', state };
    const header = 'Pro  Inside global     Inside local      Outside local     Outside global';
    const lines = state.natRules.map((r) =>
      `---  ${r.insideGlobal.padEnd(18)}${r.insideLocal.padEnd(18)}---               ---`,
    );
    return { output: [header, ...lines].join('\n'), state };
  }

  if (sub === 'ip ospf neighbor' || sub === 'ip ospf') {
    if (!state.ospf) return { output: '% OSPF is not configured', state };
    const lines = [
      `OSPF Process ID ${state.ospf.processId}`,
      `Router ID: ${state.ospf.routerId ?? 'auto'}`,
      '',
      'Advertised Networks:',
    ];
    for (const net of state.ospf.networks) {
      lines.push(`  ${net.network} ${net.wildcard} area ${net.area}`);
    }
    return { output: lines.join('\n'), state };
  }

  return {
    output: [
      '  access-lists         Show all ACLs',
      '  ip interface brief   Summary of interfaces',
      '  ip nat translations  NAT translation table',
      '  ip ospf              OSPF information',
      '  ip route             IP routing table',
      '  running-config       Current operating configuration',
      '  vlan brief           VLAN information',
      '  version              System hardware and software status',
    ].join('\n'),
    state,
  };
}

function handlePing(parts: string[], state: DeviceCLIState, eventBus?: EventBus): CLIResult {
  const target = parts[1];
  if (!target) return { output: '% Incomplete command.', state };

  // Fire event for packet engine
  if (eventBus) {
    eventBus.emit('cli:ping', {
      sourceDeviceId: state.deviceId,
      targetIP: target,
    });
  }

  return {
    output: [
      `Type escape sequence to abort.`,
      `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`,
      `Simulation started — check packet animation on canvas...`,
    ].join('\n'),
    state,
  };
}

function handleIPConfig(parts: string[], state: DeviceCLIState, canvasAPI: CanvasAPI, eventBus?: EventBus): CLIResult {
  // ipconfig — show current IP
  // ipconfig /renew — request IP from DHCP
  if (!parts[1] || parts[1] === '/all') {
    // Show current config
    const lines: string[] = ['IP Configuration:', ''];
    for (const [name, iface] of state.interfaces) {
      lines.push(`  ${name}:`);
      lines.push(`    IP Address:    ${iface.ip ?? 'Not configured'}`);
      lines.push(`    Subnet Mask:   ${iface.mask ?? 'Not configured'}`);
      lines.push(`    Status:        ${iface.shutdown ? 'Down' : 'Up'}`);
      lines.push('');
    }
    return { output: lines.join('\n'), state };
  }

  if (parts[1] === '/renew' || parts[1] === 'dhcp') {
    // Find a DHCP server on the network by emitting an event
    if (eventBus) {
      eventBus.emit('cli:dhcp-request', { deviceId: state.deviceId });
    }

    // For now, simulate DHCP by finding a connected device with a DHCP pool
    // This is simplified — real DHCP would use broadcast
    const connections = canvasAPI.getConnections();
    const myConns = connections.filter(
      (c) => c.sourceDeviceId === state.deviceId || c.targetDeviceId === state.deviceId,
    );

    // Look through connected devices (BFS) for a DHCP server
    const visited = new Set<string>([state.deviceId]);
    const queue = myConns.map((c) =>
      c.sourceDeviceId === state.deviceId ? c.targetDeviceId : c.sourceDeviceId,
    );

    while (queue.length > 0) {
      const deviceId = queue.shift()!;
      if (visited.has(deviceId)) continue;
      visited.add(deviceId);

      // Check if this device has a DHCP pool (via event — but we need direct access)
      // We'll use a global registry that the CLI plugin populates
      const serverState = dhcpServerRegistry.get(deviceId);
      if (serverState) {
        for (const [, pool] of serverState) {
          if (pool.network && pool.mask) {
            // Assign an IP from the pool
            const parts2 = pool.network.split('.').map(Number);
            parts2[3] = pool.nextAddress;
            const assignedIP = parts2.join('.');
            pool.nextAddress++;

            // Update the first interface
            const firstIfName = Array.from(state.interfaces.keys())[0];
            if (firstIfName) {
              const interfaces = new Map(state.interfaces);
              interfaces.set(firstIfName, {
                ...interfaces.get(firstIfName)!,
                ip: assignedIP,
                mask: pool.mask,
                shutdown: false,
              });

              return {
                output: [
                  `DHCP request sent...`,
                  ``,
                  `IP address assigned by DHCP server (${deviceId.substring(0, 8)}):`,
                  `  IP Address:      ${assignedIP}`,
                  `  Subnet Mask:     ${pool.mask}`,
                  `  Default Gateway: ${pool.gateway ?? 'Not set'}`,
                  `  DNS Server:      ${pool.dns ?? 'Not set'}`,
                ].join('\n'),
                state: { ...state, interfaces },
              };
            }
          }
        }
      }

      // Continue BFS through switches
      const device = canvasAPI.getDevice(deviceId);
      if (device && (device.type === 'switch' || device.type === 'hub' || device.type === 'l3-switch')) {
        const nextConns = connections.filter(
          (c) => c.sourceDeviceId === deviceId || c.targetDeviceId === deviceId,
        );
        for (const c of nextConns) {
          const next = c.sourceDeviceId === deviceId ? c.targetDeviceId : c.sourceDeviceId;
          if (!visited.has(next)) queue.push(next);
        }
      }
    }

    return { output: 'DHCP request failed — no DHCP server found on the network.\nConfigure a DHCP pool on the Router: ip dhcp pool <name> → network <ip> <mask> → default-router <gw>', state };
  }

  return { output: '% Usage: ipconfig, ipconfig /all, ipconfig /renew, ipconfig dhcp', state };
}

// Global DHCP server registry — populated when configs change
const dhcpServerRegistry = new Map<string, Map<string, DHCPPool>>();

export function registerDHCPServer(deviceId: string, pools: Map<string, DHCPPool>) {
  if (pools.size > 0) {
    dhcpServerRegistry.set(deviceId, pools);
  } else {
    dhcpServerRegistry.delete(deviceId);
  }
}

function buildRunningConfig(state: DeviceCLIState): string {
  const lines: string[] = [
    '!',
    `hostname ${state.hostname}`,
    '!',
  ];

  if (state.secretPassword) {
    lines.push(`enable secret ${state.secretPassword}`, '!');
  }

  for (const [name, cfg] of state.interfaces) {
    lines.push(`interface ${name}`);
    if (cfg.description) lines.push(` description ${cfg.description}`);
    if (cfg.ip && cfg.mask) lines.push(` ip address ${cfg.ip} ${cfg.mask}`);
    if (!cfg.shutdown) lines.push(' no shutdown');
    else lines.push(' shutdown');
    lines.push('!');
  }

  for (const route of state.staticRoutes) {
    lines.push(`ip route ${route.network} ${route.mask} ${route.nextHop}`);
  }

  if (state.vlans.size > 1) {
    for (const [id, name] of state.vlans) {
      if (id === 1) continue;
      lines.push(`vlan ${id}`, ` name ${name}`, '!');
    }
  }

  lines.push('!', 'end');
  return lines.join('\n');
}

function resolveInterface(input: string, availableInterfaces: string[]): string | undefined {
  const cleaned = input.trim().toLowerCase();

  // Map abbreviations to full names (longest first to avoid partial matches)
  const mappings: [string, string][] = [
    ['gigabitethernet', 'GigabitEthernet'],
    ['fastethernet', 'FastEthernet'],
    ['ethernet', 'Ethernet'],
    ['serial', 'Serial'],
    ['gig', 'GigabitEthernet'],
    ['gi', 'GigabitEthernet'],
    ['fas', 'FastEthernet'],
    ['fa', 'FastEthernet'],
    ['eth', 'Ethernet'],
    ['se', 'Serial'],
    ['s', 'Serial'],
    ['e', 'Ethernet'],
  ];

  // Try prefix mapping to build full interface name
  for (const [abbrev, full] of mappings) {
    if (cleaned.startsWith(abbrev)) {
      const rest = cleaned.slice(abbrev.length);
      const resolved = `${full}${rest}`;
      // Check if this matches any available interface (case-insensitive)
      const match = availableInterfaces.find((i) => i.toLowerCase() === resolved.toLowerCase());
      if (match) return match;
    }
  }

  // Try direct case-insensitive match against available interfaces
  const directMatch = availableInterfaces.find((i) => i.toLowerCase() === cleaned);
  if (directMatch) return directMatch;

  return undefined;
}

function invalidInput(cmd: string, state: DeviceCLIState): CLIResult {
  return {
    output: `% Invalid input detected at '^' marker.\n  ${cmd}\n  ^`,
    state,
  };
}

export function getPrompt(state: DeviceCLIState): string {
  switch (state.mode) {
    case 'user':
      return `${state.hostname}>`;
    case 'privileged':
      return `${state.hostname}#`;
    case 'global-config':
      return `${state.hostname}(config)#`;
    case 'interface-config':
      return `${state.hostname}(config-if)#`;
    case 'vlan-config':
      return `${state.hostname}(config-vlan)#`;
    case 'dhcp-config':
      return `${state.hostname}(dhcp-config)#`;
    case 'router-config':
      return `${state.hostname}(config-router)#`;
    default:
      return `${state.hostname}>`;
  }
}
