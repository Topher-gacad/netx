export function Switch24Icon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="6" width="22" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <circle key={i} cx={4 + i * 2.5} cy="10" r="0.7" fill="#00ff88" opacity={i < 4 ? 1 : 0.3} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={3 + i * 2.5} y="12" width="1.5" height="3" rx="0.3" fill="currentColor" opacity="0.3" />
      ))}
      <text x="12" y="8" textAnchor="middle" fill="currentColor" fontSize="3" fontWeight="bold">24</text>
    </svg>
  );
}
