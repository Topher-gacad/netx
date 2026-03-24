import { useEffect, useState, useCallback } from 'react';
import type { CanvasAPI, ID, Point } from '@netx/sdk';
import { getPackets, getPacketPosition, setUpdateCallback } from './packet-animator.js';
import type { AnimatedPacket } from './packet-animator.js';

const PACKET_COLORS: Record<string, string> = {
  icmp: '#00ff88',
  arp: '#ffaa00',
  tcp: '#00bceb',
  udp: '#bb66ff',
};

let overlayCanvasAPI: CanvasAPI | null = null;

export function setOverlayCanvasAPI(api: CanvasAPI) {
  overlayCanvasAPI = api;
  console.log('[PacketOverlay] Canvas API set:', !!api);
}

export function PacketOverlay() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    console.log('[PacketOverlay] Mounted — registering update callback');
    const cb = () => setTick((t) => t + 1);
    setUpdateCallback(cb);
    return () => {
      console.log('[PacketOverlay] Unmounted');
      setUpdateCallback(() => {});
    };
  }, []);

  const getDeviceCenter = useCallback((deviceId: ID): Point => {
    if (!overlayCanvasAPI) {
      console.warn('[PacketOverlay] No canvas API');
      return { x: 0, y: 0 };
    }
    const device = overlayCanvasAPI.getDevice(deviceId);
    if (!device) {
      console.warn('[PacketOverlay] Device not found:', deviceId);
      return { x: 0, y: 0 };
    }
    return {
      x: device.position.x + device.size.width / 2,
      y: device.position.y + device.size.height / 2,
    };
  }, []);

  const packets = getPackets();

  // Debug: always render something so we know the overlay layer works
  if (packets.length === 0) {
    return null;
  }

  console.log(`[PacketOverlay] Rendering ${packets.length} packets, tick=${tick}`);

  return (
    <>
      {packets.map((pkt) => (
        <PacketDot
          key={pkt.id}
          packet={pkt}
          getDeviceCenter={getDeviceCenter}
        />
      ))}
    </>
  );
}

function PacketDot({
  packet,
  getDeviceCenter,
}: {
  packet: AnimatedPacket;
  getDeviceCenter: (id: ID) => Point;
}) {
  const pos = getPacketPosition(packet, getDeviceCenter);
  if (!pos) return null;

  const color = PACKET_COLORS[packet.type] ?? '#fff';
  const isError = packet.done && !packet.success;
  const isSuccess = packet.done && packet.success;

  return (
    <g>
      {/* Packet dot — traveling */}
      {!packet.done && (
        <>
          <circle cx={pos.x} cy={pos.y} r={12} fill={color} opacity={0.1} />
          <circle cx={pos.x} cy={pos.y} r={8} fill={color} opacity={0.2} />
          <circle cx={pos.x} cy={pos.y} r={4} fill={color} opacity={0.9} />
        </>
      )}

      {/* Success — green checkmark */}
      {isSuccess && packet.showResult && (
        <g>
          <circle cx={pos.x} cy={pos.y} r={14} fill="#00ff88" opacity={0.2} />
          <circle cx={pos.x} cy={pos.y} r={10} fill="none" stroke="#00ff88" strokeWidth={2} />
          <polyline
            points={`${pos.x - 5},${pos.y} ${pos.x - 1},${pos.y + 4} ${pos.x + 5},${pos.y - 4}`}
            fill="none" stroke="#00ff88" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          />
        </g>
      )}

      {/* Error — red X */}
      {isError && packet.showResult && (
        <g>
          <circle cx={pos.x} cy={pos.y} r={14} fill="#ff4444" opacity={0.2} />
          <circle cx={pos.x} cy={pos.y} r={10} fill="none" stroke="#ff4444" strokeWidth={2} />
          <line x1={pos.x - 4} y1={pos.y - 4} x2={pos.x + 4} y2={pos.y + 4} stroke="#ff4444" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={pos.x + 4} y1={pos.y - 4} x2={pos.x - 4} y2={pos.y + 4} stroke="#ff4444" strokeWidth={2.5} strokeLinecap="round" />
          {packet.errorMessage && (
            <g>
              <rect
                x={pos.x - 110} y={pos.y - 40}
                width={220} height={24}
                rx={4} fill="#1a1a2e" stroke="#ff4444" strokeWidth={0.5}
                opacity={0.95}
              />
              <text
                x={pos.x} y={pos.y - 24}
                textAnchor="middle" fill="#ff4444"
                fontSize={10} fontFamily="monospace"
              >
                {packet.errorMessage.length > 42
                  ? packet.errorMessage.substring(0, 42) + '...'
                  : packet.errorMessage}
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  );
}
