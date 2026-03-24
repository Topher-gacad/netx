import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';

export function FirewallRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      <defs>
        <linearGradient id={`fw-chassis-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a3a3a" />
          <stop offset="50%" stopColor="#3a2020" />
          <stop offset="100%" stopColor="#2a1515" />
        </linearGradient>
      </defs>

      {/* Chassis — red-tinted for security device */}
      <rect x={x} y={y} width={w} height={h} rx={3}
        fill={`url(#fw-chassis-${id})`} filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#8a4444'} strokeWidth={selected ? 1.5 : 0.5}
      />
      <rect x={x} y={y} width={w} height={1.5} rx={1} fill="#aa5555" opacity={0.3} />

      {/* Shield icon */}
      <path
        d={`M${x + 12},${y + 6} L${x + 20},${y + 3} L${x + 28},${y + 6} L${x + 28},${y + 16} Q${x + 20},${y + 22} ${x + 12},${y + 16} Z`}
        fill="none" stroke="#ff6644" strokeWidth={1} opacity={0.8}
      />
      <text x={x + 20} y={y + 15} textAnchor="middle" fill="#ff6644" fontSize={6} fontWeight="bold">FW</text>

      {/* Model */}
      <text x={x + 34} y={y + 10} fill="#daa" fontSize={6} fontWeight="bold" fontFamily="Arial">ASA 5505</text>
      <text x={x + 34} y={y + 17} fill="#8a6666" fontSize={4} fontFamily="Arial">Adaptive Security Appliance</text>

      {/* Status LEDs */}
      <text x={x + w - 30} y={y + 9} fill="#8a6666" fontFamily="monospace" fontSize={3.5}>PWR</text>
      <Led cx={x + w - 16} cy={y + 7.5} color="green" r={2} filterId={`glow-${id}`} />
      <text x={x + w - 30} y={y + 17} fill="#8a6666" fontFamily="monospace" fontSize={3.5}>ACT</text>
      <Led cx={x + w - 16} cy={y + 15.5} color="amber" r={2} filterId={`glow-${id}`} />

      {/* Separator */}
      <line x1={x + 3} y1={y + 22} x2={x + w - 3} y2={y + 22} stroke="#5a3333" strokeWidth={0.3} />

      {/* Ports */}
      <text x={x + 10} y={y + 27} fill="#8a6666" fontFamily="monospace" fontSize={3}>OUTSIDE</text>
      <rect x={x + 5} y={y + 29} width={12} height={9} rx={1} fill="#1a0a0a" stroke="#8a4444" strokeWidth={0.4} />

      <text x={x + 30} y={y + 27} fill="#8a6666" fontFamily="monospace" fontSize={3}>INSIDE</text>
      <rect x={x + 25} y={y + 29} width={12} height={9} rx={1} fill="#1a0a0a" stroke="#8a4444" strokeWidth={0.4} />

      <text x={x + 50} y={y + 27} fill="#8a6666" fontFamily="monospace" fontSize={3}>DMZ</text>
      <rect x={x + 45} y={y + 29} width={12} height={9} rx={1} fill="#1a0a0a" stroke="#8a4444" strokeWidth={0.4} />

      {/* Hostname */}
      <text x={x + w / 2} y={y + h + 12} textAnchor="middle" fill="#ff6644"
        fontFamily="monospace" fontSize={9} fontWeight="bold">{label}</text>
      {(config?.ips as string[] | undefined)?.map((ip, i) => (
        <text key={i} x={x + w / 2} y={y + h + 22 + i * 10}
          textAnchor="middle" fill="#888" fontFamily="monospace" fontSize={7}>{ip}</text>
      ))}
    </g>
  );
}
