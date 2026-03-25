export function PfSenseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10h2v4H6z" fill="#00bceb" opacity="0.5" />
      <path d="M10 10h2v4h-2z" fill="#00cc66" opacity="0.5" />
      <path d="M14 10h2v4h-2z" fill="#ffaa00" opacity="0.5" />
      <text x="12" y="8" textAnchor="middle" fill="currentColor" fontSize="4" fontWeight="bold">pf</text>
    </svg>
  );
}
