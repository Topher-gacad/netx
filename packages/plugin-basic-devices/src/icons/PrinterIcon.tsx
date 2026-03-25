export function PrinterIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="3" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="15" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="17" cy="11" r="1" fill="#00ff88" />
    </svg>
  );
}
