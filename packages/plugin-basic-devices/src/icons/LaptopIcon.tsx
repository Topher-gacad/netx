export function LaptopIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="5" width="12" height="7" rx="0.5" fill="currentColor" opacity="0.1" />
      <path d="M2 17h20l-2 3H4l-2-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="15" r="0.7" fill="#00ff88" />
    </svg>
  );
}
