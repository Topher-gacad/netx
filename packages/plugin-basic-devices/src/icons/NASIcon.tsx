export function NASIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="5" width="10" height="4" rx="0.5" fill="currentColor" opacity="0.15" />
      <circle cx="9" cy="7" r="0.8" fill="#00ff88" />
      <rect x="7" y="11" width="10" height="4" rx="0.5" fill="currentColor" opacity="0.15" />
      <circle cx="9" cy="13" r="0.8" fill="#00ff88" />
      <rect x="7" y="17" width="10" height="4" rx="0.5" fill="currentColor" opacity="0.1" />
    </svg>
  );
}
