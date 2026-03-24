import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';
import { RJ45Port } from '../shared/RJ45Port.js';

export function RouterRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />

      {/* Chassis — slightly different gradient for routers (darker, more blue tint) */}
      <defs>
        <linearGradient id={`router-chassis-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4a5a" />
          <stop offset="15%" stopColor="#2a3a48" />
          <stop offset="50%" stopColor="#1d2d3a" />
          <stop offset="85%" stopColor="#2a3a48" />
          <stop offset="100%" stopColor="#152532" />
        </linearGradient>
      </defs>

      <rect
        x={x} y={y} width={w} height={h} rx={3}
        fill={`url(#router-chassis-${id})`}
        filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#4a6a7a'}
        strokeWidth={selected ? 1.5 : 0.5}
      />
      <rect x={x} y={y} width={w} height={1.5} rx={1} fill="#5a7a8a" opacity={0.3} />

      {/* Logo */}
      <rect x={x + 4} y={y + 3} width={24} height={16} rx={2} fill="#0a1a28" stroke="#3a5a6a" strokeWidth={0.3} />
      <text x={x + 16} y={y + 10} textAnchor="middle" fill="#00bceb" fontSize={5} fontWeight="bold" fontFamily="Arial">
        CISCO
      </text>
      <text x={x + 16} y={y + 16} textAnchor="middle" fill="#6a8a9a" fontSize={3} fontFamily="Arial">
        SYSTEMS
      </text>

      {/* Model */}
      <text x={x + 32} y={y + 10} fill="#bcd" fontSize={6} fontWeight="bold" fontFamily="Arial">
        ISR 1941
      </text>
      <text x={x + 32} y={y + 17} fill="#6a8a9a" fontSize={4} fontFamily="Arial">
        Integrated Services Router
      </text>

      {/* Status LEDs */}
      <text x={x + w - 36} y={y + 9} fill="#6a8a9a" fontFamily="monospace" fontSize={3.5}>SYS</text>
      <Led cx={x + w - 24} cy={y + 7.5} color="green" r={2} filterId={`glow-${id}`} />
      <text x={x + w - 20} y={y + 9} fill="#6a8a9a" fontFamily="monospace" fontSize={3.5}>ACT</text>
      <Led cx={x + w - 8} cy={y + 7.5} color="green" r={2} filterId={`glow-${id}`} />

      {/* Separator */}
      <line x1={x + 3} y1={y + 21} x2={x + w - 3} y2={y + 21} stroke="#3a5a6a" strokeWidth={0.3} />

      {/* GigabitEthernet ports */}
      <text x={x + 10} y={y + 25} fill="#6a8a9a" fontFamily="monospace" fontSize={3}>GE0/0</text>
      <Led cx={x + 10} cy={y + 28} color="off" r={1.2} filterId={`glow-${id}`} />
      <RJ45Port x={x + 5} y={y + 30} portInnerId={`port-inner-${id}`} width={12} height={10} />

      <text x={x + 28} y={y + 25} fill="#6a8a9a" fontFamily="monospace" fontSize={3}>GE0/1</text>
      <Led cx={x + 28} cy={y + 28} color="off" r={1.2} filterId={`glow-${id}`} />
      <RJ45Port x={x + 23} y={y + 30} portInnerId={`port-inner-${id}`} width={12} height={10} />

      {/* Serial ports */}
      <text x={x + 52} y={y + 25} fill="#6a8a9a" fontFamily="monospace" fontSize={3}>S0/0/0</text>
      <rect x={x + 46} y={y + 30} width={16} height={10} rx={1} fill="#1a2a38" stroke="#3a5a6a" strokeWidth={0.4} />
      <text x={x + 54} y={y + 37} textAnchor="middle" fill="#3a6a8a" fontFamily="monospace" fontSize={3}>DB</text>

      <text x={x + 74} y={y + 25} fill="#6a8a9a" fontFamily="monospace" fontSize={3}>S0/0/1</text>
      <rect x={x + 68} y={y + 30} width={16} height={10} rx={1} fill="#1a2a38" stroke="#3a5a6a" strokeWidth={0.4} />
      <text x={x + 76} y={y + 37} textAnchor="middle" fill="#3a6a8a" fontFamily="monospace" fontSize={3}>DB</text>

      {/* Console port */}
      <rect x={x + w - 20} y={y + 30} width={14} height={10} rx={1} fill="#003355" stroke="#00bceb" strokeWidth={0.3} />
      <rect x={x + w - 18} y={y + 32} width={10} height={6} rx={0.5} fill="#001a33" stroke="#005588" strokeWidth={0.2} />
      <text x={x + w - 13} y={y + 26} textAnchor="middle" fill="#00bceb" fontFamily="monospace" fontSize={2.5}>
        CON
      </text>

      {/* Ventilation */}
      <g opacity={0.2}>
        {[0, 2, 4].map((dy) => (
          <rect key={dy} x={x + 5} y={y + h - 8 + dy} width={w - 10} height={0.5} fill="#3a5a6a" />
        ))}
      </g>

      {/* Hostname */}
      <text
        x={x + w / 2} y={y + h + 12}
        textAnchor="middle" fill="#00bceb"
        fontFamily="monospace" fontSize={9} fontWeight="bold"
      >
        {label}
      </text>
      {/* IP addresses */}
      {(config?.ips as string[] | undefined)?.map((ip, i) => (
        <text
          key={i}
          x={x + w / 2} y={y + h + 22 + i * 10}
          textAnchor="middle" fill="#888"
          fontFamily="monospace" fontSize={7}
        >
          {ip}
        </text>
      ))}
    </g>
  );
}
