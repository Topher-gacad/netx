import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';

export function NASRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      <defs>
        <linearGradient id={`nas-body-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3a" />
          <stop offset="50%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
      </defs>
      {/* NAS body — vertical tower */}
      <rect x={x} y={y} width={w} height={h} rx={3}
        fill={`url(#nas-body-${id})`} filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#555'} strokeWidth={selected ? 1.5 : 0.5} />
      {/* Brand */}
      <text x={x + w / 2} y={y + 8} textAnchor="middle" fill="#888" fontSize={4} fontWeight="bold">Synology</text>
      {/* Drive bays */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={x + 4} y={y + 12 + i * 12} width={w - 8} height={10} rx={1}
            fill="#111" stroke="#444" strokeWidth={0.3} />
          <Led cx={x + 8} cy={y + 17 + i * 12} color={i < 2 ? 'green' : 'off'} r={1} filterId={`glow-${id}`} />
          <text x={x + w - 8} y={y + 19 + i * 12} textAnchor="end" fill="#555" fontSize={3} fontFamily="monospace">
            {i < 2 ? `${(i + 1) * 4}TB` : 'Empty'}
          </text>
        </g>
      ))}
      {/* Ethernet ports at bottom */}
      <rect x={x + 4} y={y + h - 8} width={8} height={5} rx={0.5} fill="#0d0d0d" stroke="#555" strokeWidth={0.2} />
      <rect x={x + 14} y={y + h - 8} width={8} height={5} rx={0.5} fill="#0d0d0d" stroke="#555" strokeWidth={0.2} />
      <text x={x + 8} y={y + h - 1} textAnchor="middle" fill="#555" fontSize={2}>E0</text>
      <text x={x + 18} y={y + h - 1} textAnchor="middle" fill="#555" fontSize={2}>E1</text>
      {/* Hostname */}
      <text x={x + w / 2} y={y + h + 10} textAnchor="middle" fill="#00bceb"
        fontFamily="monospace" fontSize={9} fontWeight="bold">{label}</text>
      {(config?.ips as string[] | undefined)?.map((ip, i) => (
        <text key={i} x={x + w / 2} y={y + h + 20 + i * 10}
          textAnchor="middle" fill="#888" fontFamily="monospace" fontSize={7}>{ip}</text>
      ))}
    </g>
  );
}
