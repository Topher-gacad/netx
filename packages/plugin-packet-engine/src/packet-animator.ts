import type { ID, Point } from '@netx/sdk';
import type { PacketType, PacketHop } from './network-validator.js';

export interface AnimatedPacket {
  id: string;
  type: PacketType;
  hops: PacketHop[];
  currentHop: number;
  progress: number; // 0-1 within current hop
  success: boolean;
  errorAtHop?: number;
  errorMessage?: string;
  done: boolean;
  showResult: boolean;
  resultTimer: number;
}

let packets: AnimatedPacket[] = [];
let nextId = 0;
let animationFrame: number | null = null;
let lastTime = 0;
let onUpdate: (() => void) | null = null;

const PACKET_SPEED = 0.4; // hops per second (slower = more visible)
const RESULT_DISPLAY_TIME = 4000; // ms

export function setUpdateCallback(cb: () => void) {
  console.log('[PacketAnimator] Update callback registered');
  onUpdate = cb;
}

export function getPackets(): AnimatedPacket[] {
  return packets;
}

export function launchPacket(
  type: PacketType,
  hops: PacketHop[],
  success: boolean,
  errorAtHop?: number,
  errorMessage?: string,
): string {
  const id = `pkt-${nextId++}`;
  console.log(`[PacketAnimator] Launching packet ${id} with ${hops.length} hops, success=${success}`);
  packets.push({
    id,
    type,
    hops,
    currentHop: 0,
    progress: 0,
    success,
    errorAtHop,
    errorMessage,
    done: false,
    showResult: false,
    resultTimer: 0,
  });

  if (!animationFrame) {
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(tick);
  }

  return id;
}

function tick(now: number) {
  const dt = now - lastTime;
  lastTime = now;

  let hasActive = false;

  for (const pkt of packets) {
    if (pkt.done && !pkt.showResult) continue;

    if (pkt.done && pkt.showResult) {
      pkt.resultTimer += dt;
      if (pkt.resultTimer > RESULT_DISPLAY_TIME) {
        pkt.showResult = false;
      }
      hasActive = true;
      continue;
    }

    hasActive = true;
    pkt.progress += (PACKET_SPEED * dt) / 1000;

    if (pkt.progress >= 1) {
      // Check if we hit the error hop
      if (!pkt.success && pkt.errorAtHop !== undefined && pkt.currentHop >= pkt.errorAtHop) {
        pkt.done = true;
        pkt.showResult = true;
        pkt.progress = 1;
        continue;
      }

      pkt.currentHop++;
      pkt.progress = 0;

      if (pkt.currentHop >= pkt.hops.length) {
        pkt.done = true;
        pkt.showResult = true;
        pkt.progress = 1;
        pkt.currentHop = pkt.hops.length - 1;
      }
    }
  }

  // Clean up fully done packets
  packets = packets.filter((p) => !p.done || p.showResult);

  onUpdate?.();

  if (hasActive) {
    animationFrame = requestAnimationFrame(tick);
  } else {
    animationFrame = null;
  }
}

export function getPacketPosition(
  pkt: AnimatedPacket,
  getDeviceCenter: (id: ID) => Point,
): Point | null {
  if (pkt.hops.length === 0) return null;

  const hop = pkt.hops[Math.min(pkt.currentHop, pkt.hops.length - 1)];
  const from = getDeviceCenter(hop.fromDeviceId);
  const to = getDeviceCenter(hop.toDeviceId);
  const t = Math.min(1, pkt.progress);

  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

export function clearPackets() {
  packets = [];
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  onUpdate?.();
}
