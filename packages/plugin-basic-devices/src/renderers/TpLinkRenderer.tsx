import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';

export function TpLinkRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      <defs>
        <linearGradient id={`tp-chassis-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="50%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>
      </defs>

      {/* Chassis — sleek black like TP-Link Archer */}
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={`url(#tp-chassis-${id})`} filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#444'} strokeWidth={selected ? 1.5 : 0.5}
      />

      {/* Top accent stripe — TP-Link teal */}
      <rect x={x} y={y} width={w} height={3} rx={2} fill="#00b4a0" opacity={0.8} />

      {/* TP-Link logo */}
      <text x={x + 12} y={y + 14} fill="#00b4a0" fontSize={6} fontWeight="bold" fontFamily="Arial">TP-LINK</text>
      <text x={x + 12} y={y + 20} fill="#666" fontSize={3.5} fontFamily="Arial">Archer AX50 | WiFi 6</text>

      {/* WiFi signal icon */}
      <g transform={`translate(${x + w - 25}, ${y + 8})`}>
        <path d="M0,8 A8,8 0 0,1 16,8" fill="none" stroke="#00b4a0" strokeWidth={1} opacity={0.3} />
        <path d="M3,8 A5,5 0 0,1 13,8" fill="none" stroke="#00b4a0" strokeWidth={1} opacity={0.5} />
        <path d="M6,8 A2,2 0 0,1 10,8" fill="none" stroke="#00b4a0" strokeWidth={1} opacity={0.8} />
        <circle cx="8" cy="9" r="1.5" fill="#00b4a0" />
      </g>

      {/* Status LEDs */}
      <Led cx={x + w - 8} cy={y + 8} color="green" r={1.5} filterId={`glow-${id}`} />
      <Led cx={x + w - 8} cy={y + 14} color="green" r={1.5} filterId={`glow-${id}`} />
      <Led cx={x + w - 8} cy={y + 20} color="off" r={1.5} filterId={`glow-${id}`} />

      {/* Separator */}
      <line x1={x + 3} y1={y + 24} x2={x + w - 3} y2={y + 24} stroke="#333" strokeWidth={0.3} />

      {/* Ports */}
      <text x={x + 12} y={y + 29} fill="#ff6644" fontFamily="monospace" fontSize={3} textAnchor="middle">WAN</text>
      <rect x={x + 5} y={y + 31} width={14} height={9} rx={1} fill="#0a0a0a" stroke="#ff6644" strokeWidth={0.4} />

      <text x={x + 32} y={y + 29} fill="#ffaa00" fontFamily="monospace" fontSize={3} textAnchor="middle">LAN1</text>
      <rect x={x + 25} y={y + 31} width={14} height={9} rx={1} fill="#0a0a0a" stroke="#ffaa00" strokeWidth={0.4} />

      <text x={x + 52} y={y + 29} fill="#ffaa00" fontFamily="monospace" fontSize={3} textAnchor="middle">LAN2</text>
      <rect x={x + 45} y={y + 31} width={14} height={9} rx={1} fill="#0a0a0a" stroke="#ffaa00" strokeWidth={0.4} />

      <text x={x + 72} y={y + 29} fill="#ffaa00" fontFamily="monospace" fontSize={3} textAnchor="middle">LAN3</text>
      <rect x={x + 65} y={y + 31} width={14} height={9} rx={1} fill="#0a0a0a" stroke="#ffaa00" strokeWidth={0.4} />

      <text x={x + 92} y={y + 29} fill="#ffaa00" fontFamily="monospace" fontSize={3} textAnchor="middle">LAN4</text>
      <rect x={x + 85} y={y + 31} width={14} height={9} rx={1} fill="#0a0a0a" stroke="#ffaa00" strokeWidth={0.4} />

      {/* Hostname */}
      <text x={x + w / 2} y={y + h + 12} textAnchor="middle" fill="#00b4a0"
        fontFamily="monospace" fontSize={9} fontWeight="bold">{label}</text>
      {(config?.ips as string[] | undefined)?.map((ip, i) => (
        <text key={i} x={x + w / 2} y={y + h + 22 + i * 10}
          textAnchor="middle" fill="#888" fontFamily="monospace" fontSize={7}>{ip}</text>
      ))}
    </g>
  );
}
