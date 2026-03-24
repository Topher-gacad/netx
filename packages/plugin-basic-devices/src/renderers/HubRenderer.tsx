import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { RJ45Port } from '../shared/RJ45Port.js';

export function HubRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      <defs>
        <linearGradient id={`hub-chassis-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a4a3a" />
          <stop offset="50%" stopColor="#3a3a2a" />
          <stop offset="100%" stopColor="#2a2a1a" />
        </linearGradient>
      </defs>

      {/* Chassis — yellowish tint (older device) */}
      <rect x={x} y={y} width={w} height={h} rx={2}
        fill={`url(#hub-chassis-${id})`} filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#666644'} strokeWidth={selected ? 1.5 : 0.5}
      />

      {/* Label */}
      <text x={x + w / 2} y={y + 10} textAnchor="middle" fill="#aaaa66" fontSize={5} fontWeight="bold">HUB</text>
      <text x={x + w / 2} y={y + 17} textAnchor="middle" fill="#888866" fontSize={3.5}>4-Port (broadcasts all)</text>

      {/* Ports */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <text x={x + 8 + i * 22} y={y + 23} textAnchor="middle" fill="#888866" fontFamily="monospace" fontSize={3}>{i + 1}</text>
          <RJ45Port x={x + 2 + i * 22} y={y + 25} portInnerId={`port-inner-${id}`} width={10} height={8} />
        </g>
      ))}

      {/* Hostname */}
      <text x={x + w / 2} y={y + h + 12} textAnchor="middle" fill="#aaaa66"
        fontFamily="monospace" fontSize={9} fontWeight="bold">{label}</text>
    </g>
  );
}
