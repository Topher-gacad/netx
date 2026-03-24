export function WirelessAPIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 12a4 4 0 018 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <line x1="12" y1="14" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="19" width="8" height="2" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
