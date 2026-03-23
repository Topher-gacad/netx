import type { ConnectionRendererProps } from '@netx/sdk';

export function DefaultConnectionRenderer({
  id,
  sourcePosition,
  targetPosition,
  selected,
}: ConnectionRendererProps) {
  return (
    <line
      data-connection-id={id}
      x1={sourcePosition.x}
      y1={sourcePosition.y}
      x2={targetPosition.x}
      y2={targetPosition.y}
      stroke={selected ? '#00bceb' : '#4a9eff'}
      strokeWidth={selected ? 3 : 2}
      strokeLinecap="round"
    />
  );
}
