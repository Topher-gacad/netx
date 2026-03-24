import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';

export function WirelessAPRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;
  const cx = x + w / 2;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />

      {/* Wireless signal arcs */}
      <path d={`M${cx - 18},${y - 5} A20,20 0 0,1 ${cx + 18},${y - 5}`}
        fill="none" stroke="#00bceb" strokeWidth={1} opacity={0.2} />
      <path d={`M${cx - 12},${y - 2} A14,14 0 0,1 ${cx + 12},${y - 2}`}
        fill="none" stroke="#00bceb" strokeWidth={1} opacity={0.35} />
      <path d={`M${cx - 6},${y + 1} A8,8 0 0,1 ${cx + 6},${y + 1}`}
        fill="none" stroke="#00bceb" strokeWidth={1} opacity={0.5} />

      {/* AP body — rounded disc shape */}
      <defs>
        <linearGradient id={`ap-body-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8e8f0" />
          <stop offset="50%" stopColor="#c8c8d8" />
          <stop offset="100%" stopColor="#a8a8b8" />
        </linearGradient>
      </defs>

      <ellipse cx={cx} cy={y + h * 0.4} rx={w / 2} ry={h * 0.3}
        fill={`url(#ap-body-${id})`} filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#999'} strokeWidth={selected ? 1.5 : 0.5}
      />

      {/* Center LED */}
      <Led cx={cx} cy={y + h * 0.4} color="green" r={3} filterId={`glow-${id}`} />

      {/* Brand */}
      <text x={cx} y={y + h * 0.4 + 12} textAnchor="middle" fill="#666" fontSize={4} fontFamily="Arial">
        CISCO AP
      </text>

      {/* Ethernet port at bottom */}
      <rect x={cx - 5} y={y + h - 10} width={10} height={7} rx={1}
        fill="#1a1a1a" stroke="#555" strokeWidth={0.3} />
      <text x={cx} y={y + h + 2} textAnchor="middle" fill="#888" fontFamily="monospace" fontSize={3}>ETH</text>

      {/* Hostname */}
      <text x={cx} y={y + h + 14} textAnchor="middle" fill="#00bceb"
        fontFamily="monospace" fontSize={9} fontWeight="bold">{label}</text>
      {(config?.ips as string[] | undefined)?.map((ip, i) => (
        <text key={i} x={cx} y={y + h + 24 + i * 10}
          textAnchor="middle" fill="#888" fontFamily="monospace" fontSize={7}>{ip}</text>
      ))}
    </g>
  );
}
