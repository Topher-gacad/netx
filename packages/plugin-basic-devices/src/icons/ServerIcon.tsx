export function ServerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="6" r="1" fill="#00ff88" />
      <circle cx="9" cy="6" r="1" fill="#00ff88" />
      <rect x="14" y="5" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.2" />
      <rect x="3" y="11" width="18" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="14" r="1" fill="#00ff88" />
      <circle cx="9" cy="14" r="1" fill="currentColor" opacity="0.3" />
      <rect x="14" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.2" />
      <line x1="8" y1="19" x2="8" y2="21" stroke="currentColor" strokeWidth="1" />
      <line x1="16" y1="19" x2="16" y2="21" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
