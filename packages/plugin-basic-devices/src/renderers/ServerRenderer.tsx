import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';
import { RJ45Port } from '../shared/RJ45Port.js';

export function ServerRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />

      {/* Rack-mount chassis */}
      <defs>
        <linearGradient id={`server-chassis-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#505060" />
          <stop offset="10%" stopColor="#404050" />
          <stop offset="50%" stopColor="#353545" />
          <stop offset="90%" stopColor="#404050" />
          <stop offset="100%" stopColor="#303040" />
        </linearGradient>
      </defs>

      <rect
        x={x} y={y} width={w} height={h} rx={2}
        fill={`url(#server-chassis-${id})`}
        filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#666'}
        strokeWidth={selected ? 1.5 : 0.5}
      />
      <rect x={x} y={y} width={w} height={1.5} rx={1} fill="#777" opacity={0.3} />

      {/* Rack ears */}
      <rect x={x - 3} y={y + 2} width={3} height={h - 4} rx={1} fill="#404050" stroke="#555" strokeWidth={0.3} />
      <circle cx={x - 1.5} cy={y + 6} r={1} fill="#333" stroke="#555" strokeWidth={0.2} />
      <circle cx={x - 1.5} cy={y + h - 6} r={1} fill="#333" stroke="#555" strokeWidth={0.2} />

      <rect x={x + w} y={y + 2} width={3} height={h - 4} rx={1} fill="#404050" stroke="#555" strokeWidth={0.3} />
      <circle cx={x + w + 1.5} cy={y + 6} r={1} fill="#333" stroke="#555" strokeWidth={0.2} />
      <circle cx={x + w + 1.5} cy={y + h - 6} r={1} fill="#333" stroke="#555" strokeWidth={0.2} />

      {/* Front panel — drive bays */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect
            x={x + 4 + i * 18} y={y + 4} width={16} height={12} rx={1}
            fill="#1a1a28" stroke="#444" strokeWidth={0.3}
          />
          <Led cx={x + 7 + i * 18} cy={y + 6} color={i < 2 ? 'green' : 'off'} r={1} filterId={`glow-${id}`} />
          <text x={x + 12 + i * 18} y={y + 13} textAnchor="middle" fill="#555" fontFamily="monospace" fontSize={2.5}>
            HDD{i}
          </text>
        </g>
      ))}

      {/* Power / status section */}
      <text x={x + w - 30} y={y + 7} fill="#999" fontFamily="monospace" fontSize={3}>PWR</text>
      <Led cx={x + w - 18} cy={y + 5.5} color="green" r={2} filterId={`glow-${id}`} />
      <text x={x + w - 30} y={y + 14} fill="#999" fontFamily="monospace" fontSize={3}>NIC</text>
      <Led cx={x + w - 18} cy={y + 12.5} color="green" r={2} filterId={`glow-${id}`} />

      {/* Power button */}
      <circle cx={x + w - 6} cy={y + 9} r={3.5} fill="#2a2a38" stroke="#555" strokeWidth={0.3} />
      <circle cx={x + w - 6} cy={y + 9} r={1.5} fill="none" stroke="#00bceb" strokeWidth={0.4} />

      {/* Separator */}
      <line x1={x + 3} y1={y + 19} x2={x + w - 3} y2={y + 19} stroke="#555" strokeWidth={0.3} />

      {/* Network ports */}
      <text x={x + 8} y={y + 23} fill="#999" fontFamily="monospace" fontSize={3}>ETH0</text>
      <Led cx={x + 8} cy={y + 25.5} color="off" r={1} filterId={`glow-${id}`} />
      <RJ45Port x={x + 4} y={y + 27} portInnerId={`port-inner-${id}`} width={10} height={8} />

      <text x={x + 22} y={y + 23} fill="#999" fontFamily="monospace" fontSize={3}>ETH1</text>
      <Led cx={x + 22} cy={y + 25.5} color="off" r={1} filterId={`glow-${id}`} />
      <RJ45Port x={x + 18} y={y + 27} portInnerId={`port-inner-${id}`} width={10} height={8} />

      {/* MGMT port */}
      <text x={x + 40} y={y + 23} fill="#ffaa00" fontFamily="monospace" fontSize={3}>MGMT</text>
      <rect x={x + 36} y={y + 27} width={10} height={8} rx={1} fill="#1a1a10" stroke="#aa8800" strokeWidth={0.3} />

      {/* Console */}
      <rect x={x + w - 18} y={y + 27} width={12} height={8} rx={1} fill="#003355" stroke="#00bceb" strokeWidth={0.3} />
      <text x={x + w - 12} y={y + 24} textAnchor="middle" fill="#00bceb" fontFamily="monospace" fontSize={2.5}>CON</text>

      {/* Ventilation */}
      <g opacity={0.2}>
        {[0, 2, 4].map((dy) => (
          <rect key={dy} x={x + 5} y={y + h - 7 + dy} width={w - 10} height={0.5} fill="#555" />
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
