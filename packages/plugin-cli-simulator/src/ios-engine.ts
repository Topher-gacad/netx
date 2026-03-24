import type { CanvasAPI, EventBus, ID } from '@netx/sdk';

export type CLIMode = 'user' | 'privileged' | 'global-config' | 'interface-config' | 'vlan-config';

export interface InterfaceConfig {
  ip?: string;
  mask?: string;
  shutdown: boolean;
  description?: string;
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
      result = execUserMode(parts, cmd, trimmed, state, eventBus);
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
      },
    });
  }

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

function execUserMode(parts: string[], cmd: string, _raw: string, state: DeviceCLIState, eventBus?: EventBus): CLIResult {
  switch (cmd) {
    case 'enable':
      return { output: '', state: { ...state, mode: 'privileged' } };
    case 'show':
      return handleShow(parts, state);
    case 'ping':
      return handlePing(parts, state, eventBus);
    case 'exit':
    case 'logout':
      return { output: `${state.hostname} con0 is now available\n\nPress RETURN to get started.`, state };
    case '?':
    case 'help':
      return {
        output: [
          '  enable    Turn on privileged commands',
          '  exit      Exit from the EXEC',
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
          '  enable      Modify enable password parameters',
          '  exit        Exit from configure mode',
          '  hostname    Set system hostname',
          '  interface   Select an interface to configure',
          '  ip          Global IP configuration',
          '  no          Negate a command',
          '  vlan        VLAN commands',
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
    case 'exit':
      return { output: '', state: { ...state, mode: 'global-config', currentInterface: undefined } };
    case 'end':
      return { output: '', state: { ...state, mode: 'privileged', currentInterface: undefined } };
    case '?':
    case 'help':
      return {
        output: [
          '  description   Interface specific description',
          '  exit          Exit from interface configuration mode',
          '  ip            Interface IP configuration',
          '  no            Negate a command or set its defaults',
          '  shutdown      Shutdown the selected interface',
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
    const lines = Array.from(state.vlans.entries()).map(([id, name]) =>
      `${String(id).padEnd(5)}${name.padEnd(33)}active`,
    );
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

  return {
    output: [
      '  ip interface brief   Summary of interfaces',
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
    default:
      return `${state.hostname}>`;
  }
}
