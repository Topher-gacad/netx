export function PCIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="5" width="14" height="8" rx="0.5" fill="currentColor" opacity="0.1" />
      <line x1="9" y1="15" x2="9" y2="18" stroke="currentColor" strokeWidth="1.2" />
      <line x1="15" y1="15" x2="15" y2="18" stroke="currentColor" strokeWidth="1.2" />
      <rect x="6" y="18" width="12" height="2" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="14" r="0.8" fill="#00ff88" />
    </svg>
  );
}
