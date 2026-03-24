import { useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

interface FloatingWindowProps {
  title: string;
  children: ReactNode;
  defaultX?: number;
  defaultY?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  onClose?: () => void;
  visible: boolean;
}

export function FloatingWindow({
  title,
  children,
  defaultX = 100,
  defaultY = 100,
  defaultWidth = 520,
  defaultHeight = 320,
  minWidth = 300,
  minHeight = 200,
  onClose,
  visible,
}: FloatingWindowProps) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const dragging = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizing = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [pos]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current) {
      const dx = e.clientX - dragging.current.startX;
      const dy = e.clientY - dragging.current.startY;
      setPos({
        x: Math.max(0, dragging.current.startPosX + dx),
        y: Math.max(0, dragging.current.startPosY + dy),
      });
    }
    if (resizing.current) {
      const dx = e.clientX - resizing.current.startX;
      const dy = e.clientY - resizing.current.startY;
      setSize({
        w: Math.max(minWidth, resizing.current.startW + dx),
        h: Math.max(minHeight, resizing.current.startH + dy),
      });
    }
  }, [minWidth, minHeight]);

  const onDragEnd = useCallback(() => {
    dragging.current = null;
    resizing.current = null;
  }, []);

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.w,
      startH: size.h,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [size]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0d18',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Title bar — draggable */}
      <div
        onPointerDown={onDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '32px',
          minHeight: '32px',
          padding: '0 10px',
          background: '#1a1a2e',
          borderBottom: '1px solid var(--border-color)',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }} onPointerDown={(e) => e.stopPropagation()}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff4444', cursor: 'pointer' }} onClick={onClose} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffaa00' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00ff88' }} />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{title}</span>
        </div>
        <button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '18px', padding: '2px 6px', lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={onResizeStart}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" style={{ position: 'absolute', right: 2, bottom: 2 }}>
          <line x1="12" y1="4" x2="4" y2="12" stroke="#555" strokeWidth="1" />
          <line x1="12" y1="8" x2="8" y2="12" stroke="#555" strokeWidth="1" />
          <line x1="12" y1="12" x2="12" y2="12" stroke="#555" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
