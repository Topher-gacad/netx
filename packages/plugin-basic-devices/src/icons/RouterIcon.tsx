export function RouterIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1" />
      <circle cx="8" cy="12" r="1.5" fill="#00bceb" />
      <circle cx="16" cy="12" r="1.5" fill="#00bceb" />
      <circle cx="12" cy="8" r="1.5" fill="#00bceb" />
      <circle cx="12" cy="16" r="1.5" fill="#00bceb" />
    </svg>
  );
}
