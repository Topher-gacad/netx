export function TpLinkIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="6" width="20" height="2" rx="1" fill="#00b4a0" opacity="0.5" />
      <path d="M8 14a4 4 0 018 0" stroke="#00b4a0" strokeWidth="1" strokeLinecap="round" />
      <path d="M10 14a2 2 0 014 0" stroke="#00b4a0" strokeWidth="1" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1" fill="#00b4a0" />
    </svg>
  );
}
