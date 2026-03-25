import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';
import { RJ45Port } from '../shared/RJ45Port.js';

export function UnmanagedSwitchRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      <defs>
        <linearGradient id={`usw-chassis-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a4a5a" />
          <stop offset="50%" stopColor="#3a3a48" />
          <stop offset="100%" stopColor="#2a2a35" />
        </linearGradient>
      </defs>

      {/* Chassis — similar to managed switch but simpler */}
      <rect x={x} y={y} width={w} height={h} rx={2}
        fill={`url(#usw-chassis-${id})`} filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#555'} strokeWidth={selected ? 1.5 : 0.5}
      />
      <rect x={x} y={y} width={w} height={1.5} rx={1} fill="#666" opacity={0.3} />

      {/* Label */}
      <text x={x + 5} y={y + 10} fill="#aaa" fontSize={4.5} fontWeight="bold" fontFamily="Arial">
        Unmanaged Switch
      </text>
      <text x={x + 5} y={y + 16} fill="#666" fontSize={3} fontFamily="Arial">
        5-Port | Plug &amp; Play
      </text>

      {/* Power LED */}
      <Led cx={x + w - 8} cy={y + 10} color="green" r={2} filterId={`glow-${id}`} />

      {/* Ports */}
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <text x={x + 6 + i * 18} y={y + 21} textAnchor="middle" fill="#777" fontFamily="monospace" fontSize={3}>
            {i + 1}
          </text>
          <RJ45Port x={x + 1 + i * 18} y={y + 23} portInnerId={`port-inner-${id}`} width={10} height={8} />
        </g>
      ))}

      {/* Hostname */}
      <text x={x + w / 2} y={y + h + 12} textAnchor="middle" fill="#00bceb"
        fontFamily="monospace" fontSize={9} fontWeight="bold">{label}</text>
    </g>
  );
}
