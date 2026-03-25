import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';

export function IPPhoneRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      {/* Phone body */}
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill="#2a2a2a" filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#444'} strokeWidth={selected ? 1.5 : 0.5} />
      {/* Screen */}
      <rect x={x + 4} y={y + 3} width={w - 8} height={h * 0.35} rx={2}
        fill="#0a1a2a" stroke="#333" strokeWidth={0.3} />
      <text x={x + w / 2} y={y + h * 0.2} textAnchor="middle" fill="#00bceb" fontSize={3.5} fontFamily="monospace">
        Cisco 7941
      </text>
      <Led cx={x + w - 8} cy={y + 6} color="green" r={1.5} filterId={`glow-${id}`} />
      {/* Keypad */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect key={`${row}-${col}`}
            x={x + 6 + col * 12} y={y + h * 0.42 + row * 8}
            width={10} height={6} rx={1}
            fill="#1a1a1a" stroke="#333" strokeWidth={0.2} />
        ))
      )}
      {/* Handset */}
      <rect x={x + w - 12} y={y + h * 0.4} width={8} height={h * 0.45} rx={3}
        fill="#1a1a1a" stroke="#333" strokeWidth={0.3} />
      {/* Port label */}
      <text x={x + w / 2} y={y + h - 3} textAnchor="middle" fill="#555" fontFamily="monospace" fontSize={2.5}>
        SW | PC
      </text>
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
