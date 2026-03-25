import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';

export function LaptopRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      {/* Screen */}
      <defs>
        <linearGradient id={`laptop-screen-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1a2a" />
          <stop offset="100%" stopColor="#051525" />
        </linearGradient>
      </defs>
      <rect x={x + 2} y={y} width={w - 4} height={h * 0.65} rx={3}
        fill="#333" filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#555'} strokeWidth={selected ? 1.5 : 0.5} />
      <rect x={x + 5} y={y + 3} width={w - 10} height={h * 0.65 - 8} rx={1}
        fill={`url(#laptop-screen-${id})`} stroke="#333" strokeWidth={0.3} />
      <text x={x + w / 2} y={y + h * 0.3} textAnchor="middle" fill="#00bceb" fontSize={3.5} fontFamily="monospace" opacity={0.6}>
        {label}
      </text>
      {/* WiFi icon on screen */}
      <g transform={`translate(${x + w - 14}, ${y + 5})`} opacity={0.5}>
        <path d="M0,6 A6,6 0 0,1 10,6" fill="none" stroke="#00bceb" strokeWidth={0.8} />
        <path d="M2,6 A4,4 0 0,1 8,6" fill="none" stroke="#00bceb" strokeWidth={0.8} />
        <circle cx="5" cy="6.5" r="1" fill="#00bceb" />
      </g>
      {/* Keyboard base */}
      <rect x={x} y={y + h * 0.65} width={w} height={h * 0.25} rx={2}
        fill="#2a2a38" stroke="#444" strokeWidth={0.3} />
      {/* Touchpad */}
      <rect x={x + w / 2 - 8} y={y + h * 0.7} width={16} height={8} rx={1}
        fill="#222" stroke="#444" strokeWidth={0.2} />
      {/* Power LED */}
      <Led cx={x + w / 2} cy={y + h * 0.65 - 3} color="green" r={1} filterId={`glow-${id}`} />
      {/* Ethernet port indicator */}
      <rect x={x + w - 8} y={y + h * 0.7} width={5} height={4} rx={0.5} fill="#0d0d0d" stroke="#444" strokeWidth={0.2} />
      {/* Hostname */}
      <text x={x + w / 2} y={y + h + 8} textAnchor="middle" fill="#00bceb"
        fontFamily="monospace" fontSize={9} fontWeight="bold">{label}</text>
      {(config?.ips as string[] | undefined)?.map((ip, i) => (
        <text key={i} x={x + w / 2} y={y + h + 18 + i * 10}
          textAnchor="middle" fill="#888" fontFamily="monospace" fontSize={7}>{ip}</text>
      ))}
    </g>
  );
}
