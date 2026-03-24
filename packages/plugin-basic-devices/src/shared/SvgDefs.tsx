export function SvgDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`chassis-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4a4a5a" />
        <stop offset="15%" stopColor="#3a3a48" />
        <stop offset="50%" stopColor="#2d2d3a" />
        <stop offset="85%" stopColor="#3a3a48" />
        <stop offset="100%" stopColor="#252532" />
      </linearGradient>
      <linearGradient id={`port-inner-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a1a1a" />
        <stop offset="100%" stopColor="#0a0a0a" />
      </linearGradient>
      <filter id={`glow-${id}`}>
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={`shadow-${id}`}>
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
      </filter>
    </defs>
  );
}
