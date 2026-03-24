interface RJ45PortProps {
  x: number;
  y: number;
  portInnerId: string;
  width?: number;
  height?: number;
}

export function RJ45Port({ x, y, portInnerId, width = 14, height = 12 }: RJ45PortProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={1}
        fill={`url(#${portInnerId})`}
        stroke="#555"
        strokeWidth={0.5}
      />
      <rect
        x={x + 2}
        y={y + 1.5}
        width={width - 4}
        height={height * 0.4}
        rx={0.5}
        fill="#0d0d0d"
        stroke="#333"
        strokeWidth={0.3}
      />
    </g>
  );
}
