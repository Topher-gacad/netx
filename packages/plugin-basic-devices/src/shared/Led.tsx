interface LedProps {
  cx: number;
  cy: number;
  color: 'green' | 'amber' | 'red' | 'off';
  r?: number;
  filterId: string;
}

const LED_COLORS = {
  green: '#00ff88',
  amber: '#ffaa00',
  red: '#ff4444',
  off: '#222',
};

export function Led({ cx, cy, color, r = 2.5, filterId }: LedProps) {
  const isOn = color !== 'off';
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={LED_COLORS[color]}
      filter={isOn ? `url(#${filterId})` : undefined}
      opacity={isOn ? 0.9 : 1}
      stroke={isOn ? undefined : '#444'}
      strokeWidth={isOn ? undefined : 0.3}
    />
  );
}
