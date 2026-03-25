import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';

export function PrinterRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      {/* Paper tray top */}
      <rect x={x + 5} y={y} width={w - 10} height={8} rx={2}
        fill="#e0e0e0" stroke="#bbb" strokeWidth={0.3} />
      {/* Main body */}
      <rect x={x} y={y + 6} width={w} height={h - 12} rx={3}
        fill="#d0d0d0" filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#999'} strokeWidth={selected ? 1.5 : 0.5} />
      {/* Control panel */}
      <rect x={x + w - 20} y={y + 10} width={16} height={8} rx={1}
        fill="#1a1a1a" stroke="#555" strokeWidth={0.2} />
      <Led cx={x + w - 14} cy={y + 14} color="green" r={1.5} filterId={`glow-${id}`} />
      <Led cx={x + w - 8} cy={y + 14} color="off" r={1.5} filterId={`glow-${id}`} />
      {/* Brand */}
      <text x={x + 8} y={y + 16} fill="#666" fontSize={4} fontWeight="bold">HP</text>
      <text x={x + 8} y={y + 22} fill="#888" fontSize={3}>LaserJet Pro</text>
      {/* Paper output slot */}
      <rect x={x + 5} y={y + h - 8} width={w - 10} height={4} rx={1}
        fill="#bbb" stroke="#999" strokeWidth={0.2} />
      {/* Ethernet port */}
      <rect x={x + w - 10} y={y + h - 10} width={6} height={4} rx={0.5}
        fill="#0d0d0d" stroke="#555" strokeWidth={0.2} />
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
