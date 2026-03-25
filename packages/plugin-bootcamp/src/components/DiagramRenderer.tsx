import type { DiagramDefinition } from '../types.js';

export function DiagramRenderer({ diagram }: { diagram: DiagramDefinition; moduleColor?: string }) {
  switch (diagram.type) {
    case 'osi-layers':
      return <OSILayersDiagram />;
    case 'network-topology':
      return <TopologyDiagram data={diagram.data} />;
    case 'packet-flow':
      return <PacketFlowDiagram />;
    case 'subnet-visual':
      return <SubnetDiagram data={diagram.data} />;
    case 'custom':
      return <CustomDiagram data={diagram.data} />;
    default:
      return <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Diagram: {diagram.type}</div>;
  }
}

function OSILayersDiagram() {
  const layers = [
    { num: 7, name: 'Application', protocols: 'HTTP, DNS, DHCP, FTP', color: '#ff6b6b' },
    { num: 6, name: 'Presentation', protocols: 'SSL/TLS, JPEG, ASCII', color: '#ff9f43' },
    { num: 5, name: 'Session', protocols: 'NetBIOS, RPC', color: '#feca57' },
    { num: 4, name: 'Transport', protocols: 'TCP, UDP', color: '#48dbfb' },
    { num: 3, name: 'Network', protocols: 'IP, ICMP, OSPF', color: '#0abde3' },
    { num: 2, name: 'Data Link', protocols: 'Ethernet, Wi-Fi', color: '#10ac84' },
    { num: 1, name: 'Physical', protocols: 'Cables, Signals, Bits', color: '#2ed573' },
  ];

  return (
    <svg width="100%" viewBox="0 0 500 310" style={{ maxWidth: '500px', display: 'block', margin: '0 auto' }}>
      {layers.map((layer, i) => {
        const y = i * 42 + 10;
        return (
          <g key={layer.num}>
            <rect x="20" y={y} width="460" height="36" rx="6" fill={layer.color + '20'} stroke={layer.color} strokeWidth="1.5" />
            <text x="40" y={y + 22} fontSize="13" fontWeight="700" fill={layer.color}>Layer {layer.num}</text>
            <text x="120" y={y + 22} fontSize="13" fontWeight="600" fill="var(--text-primary)">{layer.name}</text>
            <text x="280" y={y + 22} fontSize="11" fill="var(--text-secondary)">{layer.protocols}</text>
          </g>
        );
      })}
      {/* Arrow on side */}
      <text x="6" y="160" fontSize="10" fill="var(--text-secondary)" textAnchor="middle" transform="rotate(-90, 6, 160)">User ← → Physical</text>
    </svg>
  );
}

function TopologyDiagram({ data }: { data: Record<string, unknown> }) {
  const devices = (data.devices ?? []) as Array<{ label: string; x: number; y: number; type?: string }>;
  const links = (data.links ?? []) as number[][];

  const deviceColors: Record<string, string> = {
    pc: '#4488ff',
    switch: '#aa44ff',
    router: '#ff8844',
    server: '#22cc88',
    firewall: '#ff4466',
    ap: '#00bceb',
    default: '#888',
  };

  return (
    <svg width="100%" viewBox="0 0 560 180" style={{ maxWidth: '560px', display: 'block', margin: '0 auto' }}>
      {/* Links */}
      {links.map(([from, to], i) => {
        const d1 = devices[from];
        const d2 = devices[to];
        if (!d1 || !d2) return null;
        return (
          <line key={i} x1={d1.x} y1={d1.y} x2={d2.x} y2={d2.y}
            stroke="#4a9eff" strokeWidth="2" strokeLinecap="round" />
        );
      })}
      {/* Devices */}
      {devices.map((dev, i) => {
        const color = deviceColors[dev.type ?? 'default'] ?? deviceColors.default;
        return (
          <g key={i}>
            <rect x={dev.x - 30} y={dev.y - 18} width="60" height="36" rx="6"
              fill={color + '20'} stroke={color} strokeWidth="1.5" />
            <text x={dev.x} y={dev.y + 3} textAnchor="middle" fontSize="10" fontWeight="600" fill={color}>
              {dev.type?.toUpperCase() ?? '?'}
            </text>
            <text x={dev.x} y={dev.y + 30} textAnchor="middle" fontSize="11" fill="var(--text-primary)">
              {dev.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PacketFlowDiagram() {
  const layers = [
    { name: 'Application Data', color: '#ff6b6b', width: 100 },
    { name: 'TCP Header + Data', color: '#48dbfb', width: 140 },
    { name: 'IP Header + Segment', color: '#0abde3', width: 180 },
    { name: 'Frame Header + Packet + Trailer', color: '#10ac84', width: 260 },
    { name: '1010110010110...', color: '#2ed573', width: 300 },
  ];

  const labels = ['Data', 'Segment', 'Packet', 'Frame', 'Bits'];

  return (
    <svg width="100%" viewBox="0 0 500 240" style={{ maxWidth: '500px', display: 'block', margin: '0 auto' }}>
      <text x="250" y="18" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--text-primary)">
        Encapsulation — Data Gets Wrapped
      </text>
      {layers.map((layer, i) => {
        const y = i * 42 + 30;
        const x = (500 - layer.width) / 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={layer.width} height="30" rx="4"
              fill={layer.color + '20'} stroke={layer.color} strokeWidth="1.5" />
            <text x="250" y={y + 19} textAnchor="middle" fontSize="10" fill={layer.color} fontWeight="600">
              {layer.name}
            </text>
            <text x={x - 10} y={y + 19} textAnchor="end" fontSize="11" fill="var(--text-secondary)" fontWeight="600">
              {labels[i]}
            </text>
            {i < layers.length - 1 && (
              <text x="250" y={y + 38} textAnchor="middle" fontSize="14" fill="var(--text-secondary)">↓</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SubnetDiagram({ data }: { data: Record<string, unknown> }) {
  const ip = (data.ip ?? '192.168.1.10') as string;
  const cidr = (data.cidr ?? 24) as number;
  const octets = ip.split('.');

  return (
    <svg width="100%" viewBox="0 0 480 120" style={{ maxWidth: '480px', display: 'block', margin: '0 auto' }}>
      {/* IP octets */}
      {octets.map((octet, i) => {
        const x = i * 110 + 30;
        const isNetwork = i < Math.floor(cidr / 8);
        const isPartial = i === Math.floor(cidr / 8) && cidr % 8 !== 0;
        const color = isNetwork ? '#0abde3' : isPartial ? '#feca57' : '#ff6b6b';
        const label = isNetwork ? 'Network' : isPartial ? 'Mixed' : 'Host';

        return (
          <g key={i}>
            {i > 0 && <text x={x - 15} y="50" fontSize="20" fill="var(--text-secondary)">.</text>}
            <rect x={x} y="25" width="90" height="40" rx="6"
              fill={color + '20'} stroke={color} strokeWidth="1.5" />
            <text x={x + 45} y="50" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>
              {octet}
            </text>
            <text x={x + 45} y="16" textAnchor="middle" fontSize="10" fill={color} fontWeight="600">
              {label}
            </text>
            <text x={x + 45} y="82" textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
              Octet {i + 1}
            </text>
          </g>
        );
      })}
      {/* CIDR label */}
      <text x="470" y="50" textAnchor="end" fontSize="16" fontWeight="700" fill="var(--accent)">
        /{cidr}
      </text>
      {/* Legend */}
      <rect x="30" y="98" width="12" height="12" rx="2" fill="#0abde3" opacity="0.3" />
      <text x="46" y="109" fontSize="10" fill="var(--text-secondary)">Network</text>
      <rect x="120" y="98" width="12" height="12" rx="2" fill="#ff6b6b" opacity="0.3" />
      <text x="136" y="109" fontSize="10" fill="var(--text-secondary)">Host</text>
    </svg>
  );
}

function CustomDiagram({ data }: { data: Record<string, unknown> }) {
  const title = (data.title ?? '') as string;
  const items = (data.items ?? []) as Array<{ label: string; color: string }>;

  return (
    <svg width="100%" viewBox="0 0 400 60" style={{ maxWidth: '400px', display: 'block', margin: '0 auto' }}>
      {items.map((item, i) => {
        const x = i * (380 / items.length) + 10;
        const w = 380 / items.length - 8;
        return (
          <g key={i}>
            <rect x={x} y="10" width={w} height="30" rx="4"
              fill={item.color + '20'} stroke={item.color} strokeWidth="1" />
            <text x={x + w / 2} y="29" textAnchor="middle" fontSize="10" fill={item.color} fontWeight="600">
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
