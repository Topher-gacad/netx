export function HubIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="18" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="11" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
