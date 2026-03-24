import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';
import { RJ45Port } from '../shared/RJ45Port.js';

export function SwitchRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  const portCount = (config?.portCount as number) ?? 8;
  const portSpacing = Math.min(18, (w - 20) / portCount);

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />

      {/* Chassis */}
      <rect
        x={x} y={y} width={w} height={h} rx={3}
        fill={`url(#chassis-${id})`}
        filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#555'}
        strokeWidth={selected ? 1.5 : 0.5}
      />
      {/* Top highlight */}
      <rect x={x} y={y} width={w} height={1.5} rx={1} fill="#666" opacity={0.3} />

      {/* Logo area */}
      <rect x={x + 4} y={y + 3} width={24} height={16} rx={2} fill="#1a1a28" stroke="#444" strokeWidth={0.3} />
      <text x={x + 16} y={y + 10} textAnchor="middle" fill="#00bceb" fontSize={5} fontWeight="bold" fontFamily="Arial">
        CISCO
      </text>
      <text x={x + 16} y={y + 16} textAnchor="middle" fill="#888" fontSize={3} fontFamily="Arial">
        SYSTEMS
      </text>

      {/* Model name */}
      <text x={x + 32} y={y + 10} fill="#ccc" fontSize={6} fontWeight="bold" fontFamily="Arial">
        Catalyst 2960
      </text>
      <text x={x + 32} y={y + 17} fill="#888" fontSize={4} fontFamily="Arial">
        {portCount}-Port Switch
      </text>

      {/* Status LEDs */}
      <text x={x + w - 40} y={y + 9} fill="#999" fontFamily="monospace" fontSize={3.5}>SYST</text>
      <Led cx={x + w - 26} cy={y + 7.5} color="green" r={2} filterId={`glow-${id}`} />
      <text x={x + w - 22} y={y + 9} fill="#999" fontFamily="monospace" fontSize={3.5}>STAT</text>
      <Led cx={x + w - 8} cy={y + 7.5} color="green" r={2} filterId={`glow-${id}`} />

      <text x={x + w - 40} y={y + 17} fill="#999" fontFamily="monospace" fontSize={3.5}>DUPLX</text>
      <Led cx={x + w - 26} cy={y + 15.5} color="off" r={2} filterId={`glow-${id}`} />
      <text x={x + w - 22} y={y + 17} fill="#999" fontFamily="monospace" fontSize={3.5}>SPEED</text>
      <Led cx={x + w - 8} cy={y + 15.5} color="off" r={2} filterId={`glow-${id}`} />

      {/* Separator */}
      <line x1={x + 3} y1={y + 21} x2={x + w - 3} y2={y + 21} stroke="#444" strokeWidth={0.3} />

      {/* Ports row */}
      {Array.from({ length: portCount }).map((_, i) => {
        const px = x + 8 + i * portSpacing;
        const py = y + 28;

        return (
          <g key={i}>
            {/* Port number */}
            <text x={px + 5} y={y + 25} textAnchor="middle" fill="#777" fontFamily="monospace" fontSize={3}>
              {i + 1}
            </text>
            {/* Link LED */}
            <Led
              cx={px + 5}
              cy={y + 27}
              color="off"
              r={1.2}
              filterId={`glow-${id}`}
            />
            {/* RJ45 port */}
            <RJ45Port x={px} y={py} portInnerId={`port-inner-${id}`} width={10} height={9} />
          </g>
        );
      })}

      {/* Console port */}
      <rect x={x + w - 20} y={y + 28} width={14} height={9} rx={1} fill="#003366" stroke="#00bceb" strokeWidth={0.3} />
      <rect x={x + w - 18} y={y + 30} width={10} height={5} rx={0.5} fill="#001a33" stroke="#005588" strokeWidth={0.2} />
      <text x={x + w - 13} y={y + 26} textAnchor="middle" fill="#00bceb" fontFamily="monospace" fontSize={2.5}>
        CON
      </text>

      {/* Ventilation */}
      <g opacity={0.2}>
        {[0, 2, 4, 6].map((dy) => (
          <rect key={dy} x={x + 5} y={y + h - 10 + dy} width={w - 10} height={0.5} fill="#444" />
        ))}
      </g>

      {/* Hostname label */}
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
