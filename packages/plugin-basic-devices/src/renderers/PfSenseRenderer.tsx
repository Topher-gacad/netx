import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';

export function PfSenseRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      <defs>
        <linearGradient id={`pf-chassis-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2a4a" />
          <stop offset="50%" stopColor="#0d1b33" />
          <stop offset="100%" stopColor="#081422" />
        </linearGradient>
      </defs>

      {/* Chassis — dark blue pfSense theme */}
      <rect x={x} y={y} width={w} height={h} rx={3}
        fill={`url(#pf-chassis-${id})`} filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#1a4a8a'} strokeWidth={selected ? 1.5 : 0.5}
      />
      <rect x={x} y={y} width={w} height={1.5} rx={1} fill="#2a5aaa" opacity={0.3} />

      {/* pfSense logo area */}
      <rect x={x + 4} y={y + 3} width={30} height={16} rx={2} fill="#0a1428" stroke="#1a4a8a" strokeWidth={0.3} />
      <text x={x + 19} y={y + 9} textAnchor="middle" fill="#00bceb" fontSize={4} fontWeight="bold" fontFamily="Arial">
        pfSense
      </text>
      <text x={x + 19} y={y + 15} textAnchor="middle" fill="#4a8acc" fontSize={3} fontFamily="Arial">
        FIREWALL
      </text>

      {/* Model name */}
      <text x={x + 38} y={y + 10} fill="#8ab4dd" fontSize={5.5} fontWeight="bold" fontFamily="Arial">
        Netgate SG-3100
      </text>
      <text x={x + 38} y={y + 17} fill="#4a7aaa" fontSize={3.5} fontFamily="Arial">
        pfSense+ Firewall/Router
      </text>

      {/* Status LEDs */}
      <text x={x + w - 32} y={y + 9} fill="#4a7aaa" fontFamily="monospace" fontSize={3.5}>PWR</text>
      <Led cx={x + w - 18} cy={y + 7.5} color="green" r={2} filterId={`glow-${id}`} />
      <text x={x + w - 32} y={y + 17} fill="#4a7aaa" fontFamily="monospace" fontSize={3.5}>ACT</text>
      <Led cx={x + w - 18} cy={y + 15.5} color="green" r={2} filterId={`glow-${id}`} />

      {/* Separator */}
      <line x1={x + 3} y1={y + 22} x2={x + w - 3} y2={y + 22} stroke="#1a3a6a" strokeWidth={0.3} />

      {/* Ports with labels */}
      <text x={x + 12} y={y + 27} fill="#ff6644" fontFamily="monospace" fontSize={3} textAnchor="middle">WAN</text>
      <rect x={x + 5} y={y + 29} width={14} height={10} rx={1} fill="#0a0a1a" stroke="#ff6644" strokeWidth={0.4} />
      <rect x={x + 7} y={y + 31} width={10} height={4} rx={0.5} fill="#050510" stroke="#cc4422" strokeWidth={0.2} />

      <text x={x + 36} y={y + 27} fill="#00cc66" fontFamily="monospace" fontSize={3} textAnchor="middle">LAN</text>
      <rect x={x + 29} y={y + 29} width={14} height={10} rx={1} fill="#0a0a1a" stroke="#00cc66" strokeWidth={0.4} />
      <rect x={x + 31} y={y + 31} width={10} height={4} rx={0.5} fill="#050510" stroke="#009944" strokeWidth={0.2} />

      <text x={x + 60} y={y + 27} fill="#ffaa00" fontFamily="monospace" fontSize={3} textAnchor="middle">OPT1</text>
      <rect x={x + 53} y={y + 29} width={14} height={10} rx={1} fill="#0a0a1a" stroke="#ffaa00" strokeWidth={0.4} />
      <rect x={x + 55} y={y + 31} width={10} height={4} rx={0.5} fill="#050510" stroke="#cc8800" strokeWidth={0.2} />

      <text x={x + 84} y={y + 27} fill="#aa88ff" fontFamily="monospace" fontSize={3} textAnchor="middle">OPT2</text>
      <rect x={x + 77} y={y + 29} width={14} height={10} rx={1} fill="#0a0a1a" stroke="#aa88ff" strokeWidth={0.4} />
      <rect x={x + 79} y={y + 31} width={10} height={4} rx={0.5} fill="#050510" stroke="#8866cc" strokeWidth={0.2} />

      {/* Console port */}
      <rect x={x + w - 18} y={y + 29} width={12} height={10} rx={1} fill="#001133" stroke="#00bceb" strokeWidth={0.3} />
      <text x={x + w - 12} y={y + 26} textAnchor="middle" fill="#00bceb" fontFamily="monospace" fontSize={2.5}>USB</text>

      {/* Ventilation */}
      <g opacity={0.2}>
        {[0, 2, 4].map((dy) => (
          <rect key={dy} x={x + 5} y={y + h - 7 + dy} width={w - 10} height={0.5} fill="#1a3a6a" />
        ))}
      </g>

      {/* Hostname */}
      <text x={x + w / 2} y={y + h + 12} textAnchor="middle" fill="#00bceb"
        fontFamily="monospace" fontSize={9} fontWeight="bold">{label}</text>
      {(config?.ips as string[] | undefined)?.map((ip, i) => (
        <text key={i} x={x + w / 2} y={y + h + 22 + i * 10}
          textAnchor="middle" fill="#888" fontFamily="monospace" fontSize={7}>{ip}</text>
      ))}
    </g>
  );
}
