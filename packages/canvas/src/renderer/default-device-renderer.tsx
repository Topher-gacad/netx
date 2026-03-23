import type { DeviceRendererProps } from '@netx/sdk';

export function DefaultDeviceRenderer({ id, position, size, selected, label }: DeviceRendererProps) {
  return (
    <g data-device-id={id}>
      <rect
        x={position.x}
        y={position.y}
        width={size.width}
        height={size.height}
        rx={4}
        fill="#2d2d3a"
        stroke={selected ? '#00bceb' : '#555'}
        strokeWidth={selected ? 2 : 1}
      />
      <text
        x={position.x + size.width / 2}
        y={position.y + size.height + 16}
        textAnchor="middle"
        fill="#ccc"
        fontSize={12}
        fontFamily="monospace"
      >
        {label}
      </text>
    </g>
  );
}
