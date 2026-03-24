export function L3SwitchIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="12" r="1" fill="#00bceb" />
      <circle cx="10" cy="12" r="1" fill="#00bceb" />
      <circle cx="14" cy="12" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="18" cy="12" r="1" fill="currentColor" opacity="0.3" />
      <text x="12" y="5" textAnchor="middle" fill="currentColor" fontSize="5" fontWeight="bold">L3</text>
    </svg>
  );
}
