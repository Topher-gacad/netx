import { useState, useMemo } from 'react';

/* ── Wire definitions with accurate colors ── */
interface Wire {
  id: string;
  name: string;
  bg: string;
  fg: string;
  stripe?: string;
  pairColor: string; // the solid color of this pair
}

const WIRES: Wire[] = [
  { id: 'ow',  name: 'White-Orange', bg: '#fff3e0', fg: '#bf5600', stripe: '#FF9800', pairColor: '#FF9800' },
  { id: 'o',   name: 'Orange',       bg: '#FF9800', fg: '#fff',    pairColor: '#FF9800' },
  { id: 'gw',  name: 'White-Green',  bg: '#e8f5e8', fg: '#2e6b2e', stripe: '#4CAF50', pairColor: '#4CAF50' },
  { id: 'bl',  name: 'Blue',         bg: '#1565C0', fg: '#fff',    pairColor: '#1565C0' },
  { id: 'blw', name: 'White-Blue',   bg: '#e3f2fd', fg: '#0d47a1', stripe: '#1565C0', pairColor: '#1565C0' },
  { id: 'g',   name: 'Green',        bg: '#4CAF50', fg: '#fff',    pairColor: '#4CAF50' },
  { id: 'bw',  name: 'White-Brown',  bg: '#efebe9', fg: '#4e2c13', stripe: '#795548', pairColor: '#795548' },
  { id: 'b',   name: 'Brown',        bg: '#795548', fg: '#fff',    pairColor: '#795548' },
];

const WIRE_MAP = Object.fromEntries(WIRES.map((w) => [w.id, w]));

/* ── Standards ── */
const STANDARDS: Record<string, { label: string; order: string[] }> = {
  'T-568B': { label: 'T-568B', order: ['ow', 'o', 'gw', 'bl', 'blw', 'g', 'bw', 'b'] },
  'T-568A': { label: 'T-568A', order: ['gw', 'g', 'ow', 'bl', 'blw', 'o', 'bw', 'b'] },
  Crossover: { label: 'Crossover', order: ['gw', 'g', 'ow', 'bl', 'blw', 'o', 'bw', 'b'] },
};

/* ── SVG RJ45 connector — anatomically correct ── */
function RJ45Connector({
  pins, picked, phase, results, onSlotClick, hoverSlot, onHoverSlot, crimped,
}: {
  pins: (string | null)[];
  picked: string | null;
  phase: string;
  results: (boolean | null)[];
  onSlotClick: (i: number) => void;
  hoverSlot: number | null;
  onHoverSlot: (i: number | null) => void;
  crimped: boolean;
}) {
  // ── Dimensions ──
  // Connector viewed front-on: pins at top, cable exits bottom
  const VW = 380;
  const VH = 480;

  // Connector housing
  const bodyW = 180;
  const bodyX = (VW - bodyW) / 2;
  const bodyY = 50;
  const bodyR = 4; // corner radius — real RJ45 is nearly square-cornered

  // Pin area at top of housing
  const pinAreaY = bodyY + 12;
  const pinW = 14;
  const pinH = 22;
  const pinGap = 4;
  const totalPinW = 8 * pinW + 7 * pinGap;
  const pinStartX = bodyX + (bodyW - totalPinW) / 2;

  // Wire channels — fixed height, not tied to bodyH
  const channelY = pinAreaY + pinH + 4;
  const channelH = 130; // fixed channel length
  const channelW = 16;

  // Housing extends below the channels for proportioned bottom
  const bodyBottom = channelY + channelH + 60;
  const bodyH = bodyBottom - bodyY;

  // Locking tab
  const tabW = 60;
  const tabH = 24;
  const tabX = bodyX + (bodyW - tabW) / 2;
  const tabY = bodyY + bodyH - 6;

  // Cable jacket — width matches pin area (touches pin 1 and pin 8)
  const jacketW = totalPinW;
  const jacketX = pinStartX;
  const jacketOverlap = 85; // how far up the jacket covers the connector
  const jacketTopY = bodyY + bodyH - jacketOverlap;
  const jacketBotY = VH;

  // Wire fan area — between jacket opening and connector bottom
  const fanTopY = bodyY + bodyH - 2; // where wires enter connector
  const fanBotY = jacketTopY + jacketOverlap + 8; // where wires exit jacket

  return (
    <svg width="100%" viewBox={`0 0 ${VW} ${VH}`}
      style={{ display: 'block', maxWidth: `${VW}px`, margin: '0 auto' }}>
      <defs>
        {/* Stripe patterns for white-pair wires */}
        {WIRES.filter((w) => w.stripe).map((w) => (
          <pattern key={w.id} id={`stripe-${w.id}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
            <rect width="4" height="4" fill="#fff" />
            <rect width="4" height="2" fill={w.stripe} />
          </pattern>
        ))}
        {/* Gold pin gradients */}
        <linearGradient id="goldPin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c84a" />
          <stop offset="25%" stopColor="#D4AF37" />
          <stop offset="60%" stopColor="#c49b2a" />
          <stop offset="100%" stopColor="#9a7b1e" />
        </linearGradient>
        <linearGradient id="goldPinLit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff59d" />
          <stop offset="30%" stopColor="#ffe082" />
          <stop offset="70%" stopColor="#ffd54f" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
        {/* Translucent plastic housing */}
        <linearGradient id="plasticBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(190,225,255,0.40)" />
          <stop offset="30%" stopColor="rgba(180,220,255,0.32)" />
          <stop offset="70%" stopColor="rgba(160,210,250,0.28)" />
          <stop offset="100%" stopColor="rgba(140,200,245,0.35)" />
        </linearGradient>
        <linearGradient id="plasticHighlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/* Glow filters */}
        <filter id="glowGreen"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00e676" floodOpacity="0.8" /></filter>
        <filter id="glowRed"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff1744" floodOpacity="0.8" /></filter>
        <filter id="glowGold"><feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#ffd54f" floodOpacity="0.7" /></filter>
        <filter id="glowBlue"><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#42a5f5" floodOpacity="0.6" /></filter>
        {/* Cable pop-up shadow */}
        <filter id="cableShadow" x="-10%" y="-10%" width="130%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.55" />
        </filter>
        {/* Clip path for wires visible through housing */}
        <clipPath id="housingClip">
          <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={bodyR} />
        </clipPath>
      </defs>

      {/* ── Dark workbench background ── */}
      <rect x="0" y="0" width={VW} height={VH} rx="12" fill="#12151c" />

      {/* ══════════════════════════════════════════════
          LAYER 1 (back): Connector housing + pins + channels
          Drawn first so it sits BEHIND the cable jacket.
          The housing is wider than the jacket, so its left/right
          edges stick out on both sides of the cable.
          ══════════════════════════════════════════════ */}

      {/* ── Connector housing — translucent plastic body ── */}
      <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={bodyR}
        fill="url(#plasticBody)" stroke="rgba(150,200,255,0.6)" strokeWidth="1.5" />
      {/* Top edge bevel */}
      <rect x={bodyX + 2} y={bodyY + 1} width={bodyW - 4} height={bodyH * 0.12} rx={bodyR}
        fill="url(#plasticHighlight)" />
      {/* Left/right edge highlights for volume */}
      <rect x={bodyX + 1} y={bodyY + 8} width="2" height={bodyH - 16} rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x={bodyX + bodyW - 3} y={bodyY + 8} width="2" height={bodyH - 16} rx="1" fill="rgba(0,0,0,0.1)" />
      {/* Internal wall line separating pin area from wire channels */}
      <line x1={bodyX + 10} y1={channelY - 2} x2={bodyX + bodyW - 10} y2={channelY - 2}
        stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />

      {/* ── Wire channels visible through translucent housing ── */}
      <g clipPath="url(#housingClip)">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const cx = pinStartX + i * (pinW + pinGap) + pinW / 2;
          const wireId = pins[i];
          const wire = wireId ? WIRE_MAP[wireId] : null;
          return (
            <g key={`chan-${i}`}>
              {/* Channel groove background */}
              <rect x={cx - channelW / 2} y={channelY} width={channelW} height={channelH} rx="1.5"
                fill="rgba(0,0,0,0.2)" />
              {/* Wire color running through channel */}
              {wire && (
                <>
                  <rect x={cx - 4} y={channelY + 1} width={8} height={channelH - 2} rx="1"
                    fill={wire.stripe ? `url(#stripe-${wire.id})` : wire.bg} opacity="0.85" />
                  {!wire.stripe && (
                    <rect x={cx - 3} y={channelY + 2} width={2} height={channelH - 4} rx="0.5"
                      fill="rgba(255,255,255,0.2)" />
                  )}
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* ── Gold pin contacts at top of housing ── */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const px = pinStartX + i * (pinW + pinGap);
        const wireId = pins[i];
        const tested = results[i];
        const isCorrect = tested === true;
        const isWrong = tested === false;
        const isHover = hoverSlot === i && !!picked && !wireId;

        return (
          <g key={`pin-${i}`}
            onMouseEnter={() => onHoverSlot(i)}
            onMouseLeave={() => onHoverSlot(null)}
            onClick={() => onSlotClick(i)}
            style={{ cursor: phase === 'build' ? 'pointer' : 'default' }}
          >
            {/* Pin number label above connector */}
            <text x={px + pinW / 2} y={bodyY - 8} textAnchor="middle"
              fontSize="11" fontWeight="700" fill="rgba(255,255,255,0.6)" fontFamily="monospace">
              {i + 1}
            </text>

            {/* Pin groove (recessed dark slot) */}
            <rect x={px} y={pinAreaY} width={pinW} height={pinH} rx="1"
              fill="#0e1118" stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" />

            {/* Gold contact blade inside groove */}
            <rect x={px + 2} y={pinAreaY + 2} width={pinW - 4} height={pinH - 4} rx="1"
              fill={isCorrect ? 'url(#goldPinLit)' : 'url(#goldPin)'}
              filter={isCorrect ? 'url(#glowGold)' : isWrong ? 'url(#glowRed)' : undefined}
              stroke={isCorrect ? '#ffe082' : isWrong ? '#ff1744' : '#8d6e00'} strokeWidth="0.5"
            />
            {/* Metallic reflection on pin */}
            <rect x={px + 3} y={pinAreaY + 3} width={pinW - 7} height="4" rx="0.5"
              fill="rgba(255,255,255,0.35)" />

            {/* Hover glow on the full channel when a wire is selected */}
            {isHover && (
              <rect x={px - 2} y={pinAreaY - 2} width={pinW + 4} height={pinH + channelH + 10} rx="3"
                fill="none" stroke="#42a5f5" strokeWidth="1.5" filter="url(#glowBlue)" />
            )}

            {/* Clickable hit area over the full channel */}
            <rect x={px - 1} y={pinAreaY} width={pinW + 2} height={pinH + channelH + 6}
              fill="transparent" />

            {/* Test result LED — positioned below the cable jacket area */}
            {tested !== null && (
              <g>
                <circle cx={px + pinW / 2} cy={jacketTopY + jacketOverlap + 30} r="5"
                  fill={isCorrect ? '#00e676' : '#ff1744'}
                  filter={isCorrect ? 'url(#glowGreen)' : 'url(#glowRed)'} />
                <circle cx={px + pinW / 2} cy={jacketTopY + jacketOverlap + 30} r="2.5"
                  fill={isCorrect ? '#b9f6ca' : '#ff8a80'} />
              </g>
            )}
          </g>
        );
      })}

      {/* ── Locking tab / clip ── */}
      <g>
        <path d={`M ${tabX + 4},${tabY + tabH} L ${tabX + tabW - 4},${tabY + tabH} L ${tabX + tabW - 8},${tabY} L ${tabX + 8},${tabY} Z`}
          fill="rgba(0,0,0,0.25)" />
        <path d={`M ${tabX + 6},${tabY} L ${tabX + tabW - 6},${tabY} L ${tabX + tabW - 2},${tabY + tabH - 2} Q ${tabX + tabW / 2},${tabY + tabH + 4} ${tabX + 2},${tabY + tabH - 2} Z`}
          fill="rgba(180,220,255,0.30)" stroke="rgba(150,200,255,0.5)" strokeWidth="1" />
        <line x1={tabX + 12} y1={tabY + tabH * 0.4} x2={tabX + tabW - 12} y2={tabY + tabH * 0.4}
          stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
        <line x1={tabX + 14} y1={tabY + tabH * 0.6} x2={tabX + tabW - 14} y2={tabY + tabH * 0.6}
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        <path d={`M ${tabX + 10},${tabY + 2} L ${tabX + tabW - 10},${tabY + 2} L ${tabX + tabW - 8},${tabY + 6} L ${tabX + 8},${tabY + 6} Z`}
          fill="rgba(255,255,255,0.1)" />
      </g>

      {/* ══════════════════════════════════════════════
          LAYER 2 (middle): Wire fan from jacket into connector
          ══════════════════════════════════════════════ */}
      {pins.map((wireId, i) => {
        if (!wireId) return null;
        const wire = WIRE_MAP[wireId];
        const chanCx = pinStartX + i * (pinW + pinGap) + pinW / 2;
        const jacketCx = jacketX + (jacketW / 7) * i + jacketW / 14;
        const strokeColor = wire.stripe || wire.bg;
        return (
          <g key={`fan-${i}`}>
            <path
              d={`M ${jacketCx},${fanBotY} C ${jacketCx},${fanBotY - 20} ${chanCx},${fanTopY + 25} ${chanCx},${fanTopY}`}
              fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" opacity="0.9"
            />
            {wire.stripe && (
              <path
                d={`M ${jacketCx},${fanBotY} C ${jacketCx},${fanBotY - 20} ${chanCx},${fanTopY + 25} ${chanCx},${fanTopY}`}
                fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="1.5 3" strokeLinecap="round" opacity="0.5"
              />
            )}
          </g>
        );
      })}

      {/* ══════════════════════════════════════════════
          LAYER 3 (front): Cable jacket — drawn LAST so it
          renders ON TOP of the connector bottom. The connector
          housing sticks out on both sides behind it.
          ══════════════════════════════════════════════ */}
      <g filter="url(#cableShadow)">
        {/* Flat cable jacket — solid color with weight */}
        <rect x={jacketX} y={jacketTopY} width={jacketW} height={jacketBotY - jacketTopY} rx="3" fill="#1565C0" />
        {/* Bottom edge — darker line to give weight/thickness feel */}
        <rect x={jacketX} y={jacketTopY} width={jacketW} height={jacketBotY - jacketTopY} rx="3"
          fill="none" stroke="#0d47a1" strokeWidth="2" />
        {/* Subtle top edge lighter line for flat depth */}
        <line x1={jacketX + 3} y1={jacketTopY + 1} x2={jacketX + jacketW - 3} y2={jacketTopY + 1}
          stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      </g>

      {/* ── Crimp collar — thin bar at cable tip, inherits RJ45 plastic style ── */}
      <rect x={jacketX - 6} y={jacketTopY + 14} width={jacketW + 12} height={16} rx="3"
        fill="url(#plasticBody)" stroke="rgba(150,200,255,0.6)" strokeWidth="1" />

      {/* ── Crimped state overlay ── */}
      {crimped && (
        <g>
          <rect x={bodyX - 1} y={bodyY - 1} width={bodyW + 2} height={bodyH + 2} rx={bodyR + 1}
            fill="none" stroke="rgba(150,200,255,0.4)" strokeWidth="2" />
          <text x={VW / 2} y={jacketTopY + jacketOverlap + 50} textAnchor="middle"
            fontSize="12" fontWeight="600" fill="rgba(255,255,255,0.45)" fontFamily="sans-serif">
            {phase === 'crimped' ? 'Crimped — Ready to test' : ''}
          </text>
        </g>
      )}
    </svg>
  );
}

/* ── Realistic wire chip for side panels ── */
function WireChip({ wire, width, height, selected, dimmed }: {
  wire: Wire; width?: number; height?: number; selected?: boolean; dimmed?: boolean;
}) {
  const w = width ?? 200;
  const h = height ?? 30;
  return (
    <svg width={w} height={h} style={{ display: 'block', opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.2s' }}>
      <defs>
        {wire.stripe && (
          <pattern id={`chip-${wire.id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
            <rect width="6" height="6" fill="#fff" />
            <rect width="3" height="6" fill={wire.stripe} />
          </pattern>
        )}
      </defs>
      {/* Wire body */}
      <rect x="2" y="2" width={w - 4} height={h - 4} rx={h / 2 - 2}
        fill={wire.stripe ? `url(#chip-${wire.id})` : wire.bg}
        stroke={selected ? '#42a5f5' : 'rgba(255,255,255,0.15)'}
        strokeWidth={selected ? 2 : 1}
      />
      {/* Sheen */}
      {!wire.stripe && (
        <rect x="4" y="3" width={w - 8} height={(h - 4) * 0.35} rx={(h - 4) * 0.15}
          fill="rgba(255,255,255,0.15)" />
      )}
      {/* Label */}
      <text x={w / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="11" fontWeight="700" fontFamily="'Segoe UI', system-ui, sans-serif"
        fill={wire.fg} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' } as any}>
        {wire.name}
      </text>
    </svg>
  );
}

/* ── Live wiring diagram ── */
function WiringDiagram({ pins, correctOrder, results }: {
  pins: (string | null)[]; correctOrder: string[]; results: (boolean | null)[];
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px',
      padding: '10px', background: '#0d1117', borderRadius: '8px', border: '1px solid #21262d',
    }}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const wireId = pins[i];
        const wire = wireId ? WIRE_MAP[wireId] : null;
        const correct = wireId === correctOrder[i];
        const tested = results[i];
        return (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
              marginBottom: '3px', fontFamily: 'monospace',
            }}>
              {i + 1}
            </div>
            <div style={{
              height: '36px', borderRadius: '3px',
              background: wire
                ? (wire.stripe ? undefined : wire.bg)
                : '#161b22',
              backgroundImage: wire?.stripe
                ? `repeating-linear-gradient(135deg, #fff 0px, #fff 2px, ${wire.stripe} 2px, ${wire.stripe} 4px)`
                : undefined,
              border: `1.5px solid ${
                tested === true ? '#00e676' : tested === false ? '#ff1744' :
                wire ? 'rgba(255,255,255,0.15)' : '#21262d'
              }`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>
              {wire && (
                <span style={{
                  fontSize: '7px', fontWeight: 700, color: wire.fg,
                  textShadow: '0 0 3px rgba(0,0,0,0.6)', lineHeight: 1.1,
                  textAlign: 'center', padding: '0 1px',
                }}>
                  {wire.name.split('-').map((p, j) => <div key={j}>{p}</div>)}
                </span>
              )}
            </div>
            {/* Expected wire label */}
            <div style={{
              fontSize: '7px', marginTop: '2px',
              color: correct && wire ? '#00e676' : 'rgba(255,255,255,0.25)',
              fontFamily: 'monospace',
            }}>
              {WIRE_MAP[correctOrder[i]].name.replace('White-', 'W-')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main component ── */
export function CrimpingSimulator() {
  const [standard, setStandard] = useState('T-568B');
  const [cableType, setCableType] = useState('Cat6');
  const [pins, setPins] = useState<(string | null)[]>([null, null, null, null, null, null, null, null]);
  const [picked, setPicked] = useState<string | null>(null);
  const [phase, setPhase] = useState<'build' | 'crimped' | 'testing' | 'done'>('build');
  const [results, setResults] = useState<(boolean | null)[]>([null, null, null, null, null, null, null, null]);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

  const correctOrder = STANDARDS[standard].order;
  const placed = useMemo(() => new Set(pins.filter(Boolean)), [pins]);
  const allFilled = pins.every((p) => p !== null);
  const passCount = results.filter((r) => r === true).length;
  const allPass = passCount === 8;

  function placeWire(pinIndex: number) {
    if (phase !== 'build' || !picked) return;
    const next = [...pins];
    const existing = next.indexOf(picked);
    if (existing >= 0) next[existing] = null;
    next[pinIndex] = picked;
    setPins(next);
    setPicked(null);
  }

  function removeWire(pinIndex: number) {
    if (phase !== 'build') return;
    const next = [...pins];
    next[pinIndex] = null;
    setPins(next);
  }

  function handleSlotClick(i: number) {
    if (phase !== 'build') return;
    if (picked) placeWire(i);
    else if (pins[i]) removeWire(i);
  }

  function crimp() {
    if (!allFilled) return;
    setPhase('crimped');
  }

  function test() {
    setPhase('testing');
    const snapshot = [...pins];
    const testResults: (boolean | null)[] = [null, null, null, null, null, null, null, null];
    let i = 0;
    const iv = setInterval(() => {
      testResults[i] = snapshot[i] === correctOrder[i];
      setResults([...testResults]);
      i++;
      if (i >= 8) {
        clearInterval(iv);
        setTimeout(() => setPhase('done'), 400);
      }
    }, 250);
  }

  function reset() {
    setPins([null, null, null, null, null, null, null, null]);
    setPicked(null);
    setPhase('build');
    setResults([null, null, null, null, null, null, null, null]);
    setHoverSlot(null);
  }

  const cardStyle: React.CSSProperties = {
    padding: '14px', background: '#161b22', borderRadius: '10px',
    border: '1px solid #21262d', marginBottom: '12px',
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0d1117', color: '#e6edf3',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '10px 20px', background: '#161b22',
        borderBottom: '1px solid #21262d',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Crimping tool icon */}
          <svg width="28" height="28" viewBox="0 0 28 28">
            <rect x="4" y="8" width="20" height="12" rx="3" fill="#21262d" stroke="#30363d" strokeWidth="1" />
            <rect x="8" y="11" width="12" height="6" rx="1" fill="#ffb300" opacity="0.8" />
            <rect x="10" y="2" width="2" height="8" rx="1" fill="#30363d" />
            <rect x="16" y="2" width="2" height="8" rx="1" fill="#30363d" />
          </svg>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#58a6ff' }}>
              Cable Crimping Simulator
            </h1>
            <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '1px' }}>
              Select a wire, then click a pin slot to insert it
            </div>
          </div>
        </div>
        <button onClick={() => (window.location.hash = '#/canvas')} style={{
          padding: '6px 14px', background: '#21262d', border: '1px solid #30363d',
          borderRadius: '6px', color: '#c9d1d9', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
        }}>
          Back to Canvas
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '16px',
        display: 'flex', gap: '16px', justifyContent: 'center',
        flexWrap: 'wrap', alignItems: 'flex-start',
      }}>

        {/* ── LEFT: Config + Wires ── */}
        <div style={{ width: '240px', flexShrink: 0 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#58a6ff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Configuration
            </div>
            <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '3px' }}>Cable</label>
            <select value={cableType} onChange={(e) => setCableType(e.target.value)} disabled={phase !== 'build'}
              style={{ width: '100%', padding: '6px 8px', marginBottom: '8px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', fontSize: '12px' }}>
              <option value="Cat5e">Cat5e — 100MHz</option>
              <option value="Cat6">Cat6 — 250MHz</option>
              <option value="Cat6a">Cat6a — 500MHz</option>
            </select>
            <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '3px' }}>Standard</label>
            <select value={standard} onChange={(e) => { setStandard(e.target.value); reset(); }} disabled={phase !== 'build'}
              style={{ width: '100%', padding: '6px 8px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', fontSize: '12px' }}>
              {Object.entries(STANDARDS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Wire picker */}
          <div style={cardStyle}>
            <div style={{
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
              color: picked ? '#f0883e' : '#58a6ff',
            }}>
              {phase !== 'build' ? 'Wires Locked' : picked ? `Place ${WIRE_MAP[picked].name}` : 'Select a Wire'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {WIRES.map((w) => {
                const isPlaced = placed.has(w.id);
                const isSelected = picked === w.id;
                return (
                  <div key={w.id}
                    onClick={() => {
                      if (phase !== 'build' || isPlaced) return;
                      setPicked(isSelected ? null : w.id);
                    }}
                    style={{
                      cursor: isPlaced || phase !== 'build' ? 'default' : 'pointer',
                      borderRadius: '8px', padding: '2px',
                      border: `2px solid ${isSelected ? '#58a6ff' : 'transparent'}`,
                      transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                      boxShadow: isSelected ? '0 4px 12px rgba(88,166,255,0.3)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <WireChip wire={w} width={220} height={28} selected={isSelected} dimmed={isPlaced} />
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── CENTER: Connector + Diagram ── */}
        <div style={{ width: '400px', flexShrink: 0 }}>
          <div style={{
            ...cardStyle, padding: '16px',
            background: 'linear-gradient(180deg, #161b22 0%, #0d1117 100%)',
            border: '1px solid #21262d',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '8px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#c9d1d9' }}>
                RJ45 — {cableType}
              </span>
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                background: '#21262d', color: '#8b949e', border: '1px solid #30363d',
              }}>
                {STANDARDS[standard].label}
              </span>
            </div>

            <RJ45Connector
              pins={pins} picked={picked} phase={phase} results={results}
              onSlotClick={handleSlotClick}
              hoverSlot={hoverSlot} onHoverSlot={setHoverSlot}
              crimped={phase === 'crimped' || phase === 'testing' || phase === 'done'}
            />

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
              {phase === 'build' && (
                <>
                  <button onClick={crimp} disabled={!allFilled} style={{
                    padding: '10px 28px', borderRadius: '8px', border: 'none',
                    background: allFilled
                      ? 'linear-gradient(135deg, #ff8c00, #ff6d00)'
                      : '#21262d',
                    color: allFilled ? '#fff' : '#484f58',
                    fontSize: '14px', fontWeight: 700,
                    cursor: allFilled ? 'pointer' : 'not-allowed',
                    boxShadow: allFilled ? '0 4px 14px rgba(255,140,0,0.4)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    Crimp Cable
                  </button>
                  <button onClick={reset} style={{
                    padding: '10px 16px', borderRadius: '8px',
                    background: '#21262d', border: '1px solid #30363d',
                    color: '#8b949e', fontSize: '12px', cursor: 'pointer',
                  }}>
                    Reset
                  </button>
                </>
              )}
              {phase === 'crimped' && (
                <button onClick={test} style={{
                  padding: '10px 28px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #238636, #2ea043)',
                  color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(35,134,54,0.4)',
                }}>
                  Test Cable
                </button>
              )}
              {phase === 'done' && (
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{
                    padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '16px',
                    marginBottom: '8px',
                    background: allPass
                      ? 'linear-gradient(135deg, rgba(0,230,118,0.12), rgba(0,230,118,0.05))'
                      : 'linear-gradient(135deg, rgba(255,23,68,0.12), rgba(255,23,68,0.05))',
                    border: `1.5px solid ${allPass ? '#00e676' : '#ff1744'}`,
                    color: allPass ? '#00e676' : '#ff1744',
                  }}>
                    {allPass ? 'PASS — Cable Crimped Successfully!' : `FAIL — ${passCount}/8 correct`}
                  </div>
                  {!allPass && (
                    <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '8px', lineHeight: '1.6' }}>
                      {pins.map((w, i) => {
                        if (w === correctOrder[i]) return null;
                        return (
                          <div key={i}>
                            Pin {i + 1}: <span style={{ color: '#ff1744' }}>{w ? WIRE_MAP[w].name : '?'}</span>
                            {' → '}
                            <span style={{ color: '#00e676' }}>{WIRE_MAP[correctOrder[i]].name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button onClick={reset} style={{
                    padding: '8px 20px', borderRadius: '8px',
                    background: '#21262d', color: '#c9d1d9',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    border: '1px solid #30363d',
                  }}>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Live wiring diagram */}
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#58a6ff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Live Wiring Diagram
            </div>
            <WiringDiagram pins={pins} correctOrder={correctOrder} results={results} />
          </div>
        </div>

      </div>
    </div>
  );
}
