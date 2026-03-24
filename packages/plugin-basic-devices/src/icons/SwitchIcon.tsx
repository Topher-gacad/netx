export function SwitchIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="12" r="1" fill="#00ff88" />
      <circle cx="10" cy="12" r="1" fill="#00ff88" />
      <circle cx="14" cy="12" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="18" cy="12" r="1" fill="currentColor" opacity="0.3" />
      <line x1="6" y1="14" x2="6" y2="16" stroke="currentColor" strokeWidth="0.8" />
      <line x1="10" y1="14" x2="10" y2="16" stroke="currentColor" strokeWidth="0.8" />
      <line x1="14" y1="14" x2="14" y2="16" stroke="currentColor" strokeWidth="0.8" />
      <line x1="18" y1="14" x2="18" y2="16" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}
