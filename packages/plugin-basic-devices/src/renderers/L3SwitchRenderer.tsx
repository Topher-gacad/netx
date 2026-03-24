import type { DeviceRendererProps } from '@netx/sdk';
import { SvgDefs } from '../shared/SvgDefs.js';
import { Led } from '../shared/Led.js';
import { RJ45Port } from '../shared/RJ45Port.js';

export function L3SwitchRenderer({ id, position, size, selected, label, config }: DeviceRendererProps) {
  const x = position.x;
  const y = position.y;
  const w = size.width;
  const h = size.height;

  return (
    <g data-device-id={id}>
      <SvgDefs id={id} />
      <defs>
        <linearGradient id={`l3sw-chassis-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4a5a" />
          <stop offset="50%" stopColor="#2a3a48" />
          <stop offset="100%" stopColor="#1a2a38" />
        </linearGradient>
      </defs>

      {/* Chassis — blue-tinted like router but wider like switch */}
      <rect x={x} y={y} width={w} height={h} rx={3}
        fill={`url(#l3sw-chassis-${id})`} filter={`url(#shadow-${id})`}
        stroke={selected ? '#00bceb' : '#4a6a8a'} strokeWidth={selected ? 1.5 : 0.5}
      />
      <rect x={x} y={y} width={w} height={1.5} rx={1} fill="#5a8aaa" opacity={0.3} />

      {/* Logo + model */}
      <rect x={x + 4} y={y + 3} width={24} height={16} rx={2} fill="#0a1a28" stroke="#3a6a8a" strokeWidth={0.3} />
      <text x={x + 16} y={y + 10} textAnchor="middle" fill="#00bceb" fontSize={5} fontWeight="bold">CISCO</text>
      <text x={x + 16} y={y + 16} textAnchor="middle" fill="#5a8aaa" fontSize={3}>SYSTEMS</text>

      <text x={x + 32} y={y + 10} fill="#aaccdd" fontSize={5.5} fontWeight="bold">Catalyst 3560</text>
      <text x={x + 32} y={y + 17} fill="#5a8aaa" fontSize={3.5}>L3 Switch — Routes + Switches</text>

      {/* Status LEDs */}
      <Led cx={x + w - 20} cy={y + 8} color="green" r={2} filterId={`glow-${id}`} />
      <text x={x + w - 30} y={y + 10} fill="#5a8aaa" fontFamily="monospace" fontSize={3}>SYST</text>
      <Led cx={x + w - 20} cy={y + 16} color="green" r={2} filterId={`glow-${id}`} />
      <text x={x + w - 30} y={y + 18} fill="#5a8aaa" fontFamily="monospace" fontSize={3}>RTE</text>

      {/* Separator */}
      <line x1={x + 3} y1={y + 21} x2={x + w - 3} y2={y + 21} stroke="#3a5a7a" strokeWidth={0.3} />

      {/* Ports */}
      {Array.from({ length: 8 }).map((_, i) => {
        const px = x + 5 + i * 16;
        return (
          <g key={i}>
            <text x={px + 4} y={y + 25} textAnchor="middle" fill="#5a8aaa" fontFamily="monospace" fontSize={2.5}>{i + 1}</text>
            <Led cx={px + 4} cy={y + 27.5} color="off" r={1} filterId={`glow-${id}`} />
            <RJ45Port x={px} y={y + 29} portInnerId={`port-inner-${id}`} width={8} height={7} />
          </g>
        );
      })}

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
