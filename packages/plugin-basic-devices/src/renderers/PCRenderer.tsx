import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';

export function PCRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  const monitorH = h * 0.6;
  const baseY = y + monitorH + 2;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />

      {/* Monitor */}
      <defs>
        <linearGradient id={`monitor-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a4a" />
          <stop offset="50%" stopColor="#2a2a38" />
          <stop offset="100%" stopColor="#1a1a28" />
        </linearGradient>
        <linearGradient id={`screen-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1a2a" />
          <stop offset="100%" stopColor="#051525" />
        </linearGradient>
      </defs>

      {/* Monitor bezel */}
      <rect
        x={x} y={y} width={w} height={monitorH} rx={3}
        fill={`url(#monitor-${id})`}
        filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#555'}
        strokeWidth={selected ? 1.5 : 0.5}
      />

      {/* Screen */}
      <rect
        x={x + 3} y={y + 3} width={w - 6} height={monitorH - 10} rx={1}
        fill={`url(#screen-${id})`}
        stroke="#333"
        strokeWidth={0.3}
      />

      {/* Screen content — command prompt look */}
      <text x={x + 6} y={y + 11} fill="#00ff88" fontSize={3.5} fontFamily="monospace" opacity={0.8}>
        C:\&gt; _
      </text>
      <text x={x + 6} y={y + 16} fill="#00bceb" fontSize={2.5} fontFamily="monospace" opacity={0.5}>
        {label}
      </text>

      {/* Power LED */}
      <Led cx={x + w / 2} cy={y + monitorH - 4} color="green" r={1.5} filterId={`glow-${id}`} />

      {/* Monitor stand */}
      <rect x={x + w / 2 - 4} y={baseY} width={8} height={4} fill="#2a2a38" stroke="#444" strokeWidth={0.3} />

      {/* Base */}
      <rect x={x + w / 2 - 10} y={baseY + 4} width={20} height={3} rx={1} fill="#2a2a38" stroke="#444" strokeWidth={0.3} />

      {/* Case (below base) */}
      <rect
        x={x + 2} y={baseY + 9} width={w - 4} height={h - monitorH - 13} rx={2}
        fill={`url(#chassis-${id})`}
        stroke="#555"
        strokeWidth={0.3}
      />

      {/* Case details — power button + LED */}
      <circle cx={x + w - 8} cy={baseY + 13} r={2} fill="#2a2a38" stroke="#555" strokeWidth={0.3} />
      <Led cx={x + w - 8} cy={baseY + 13} color="green" r={1} filterId={`glow-${id}`} />

      {/* Case ethernet port indicator */}
      <rect x={x + 5} y={baseY + 11} width={6} height={4} rx={0.5} fill="#0d0d0d" stroke="#444" strokeWidth={0.2} />
      <text x={x + 8} y={baseY + 19} textAnchor="middle" fill="#666" fontFamily="monospace" fontSize={2}>
        ETH
      </text>

      {/* Hostname */}
      <text
        x={x + w / 2} y={y + h + 10}
        textAnchor="middle" fill="#00bceb"
        fontFamily="monospace" fontSize={9} fontWeight="bold"
      >
        {label}
      </text>
      {/* IP addresses */}
      {(config?.ips as string[] | undefined)?.map((ip, i) => (
        <text
          key={i}
          x={x + w / 2} y={y + h + 20 + i * 10}
          textAnchor="middle" fill="#888"
          fontFamily="monospace" fontSize={7}
        >
          {ip}
        </text>
      ))}
    </g>
  );
}
