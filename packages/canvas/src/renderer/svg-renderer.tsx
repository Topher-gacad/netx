import { useCallback, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import type { CanvasAPI, EventBus, Point } from '@netx/sdk';
import type { CanvasState } from '../canvas-engine.js';
import type { StoreApi } from 'zustand';
import { useDrag } from '../interaction/use-drag.js';
import { usePanZoom } from '../interaction/use-pan-zoom.js';
import { useConnect } from '../interaction/use-connect.js';
import { useSelection } from '../interaction/use-selection.js';
import { DefaultDeviceRenderer } from './default-device-renderer.js';
import { DefaultConnectionRenderer } from './default-connection-renderer.js';

interface SVGRendererProps {
  store: StoreApi<CanvasState>;
  canvasAPI: CanvasAPI;
  eventBus: EventBus;
  children?: React.ReactNode;
}

export function SVGRenderer({ store, canvasAPI, eventBus, children }: SVGRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const viewport = useStore(store, (s) => s.viewport);
  const devices = useStore(store, (s) => s.devices);
  const connections = useStore(store, (s) => s.connections);
  const deviceTypes = useStore(store, (s) => s.deviceTypes);
  const connectionTypes = useStore(store, (s) => s.connectionTypes);
  const selection = useStore(store, (s) => s.selection);
  const connecting = useStore(store, (s) => s.connecting);

  const drag = useDrag(store);
  const panZoom = usePanZoom(store);
  const connect = useConnect(store, canvasAPI, eventBus);
  const { select, clearSelection } = useSelection(store, eventBus);

  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.offset.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.offset.y) / viewport.zoom,
    };
  }, [viewport]);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    // Only cancel connection when clicking empty canvas (not on a port/device)
    if (e.button === 0 && connecting.active) {
      // Check if target is the SVG background itself (not a child element)
      const target = e.target as Element;
      if (target.tagName === 'svg' || target.tagName === 'rect' && target.getAttribute('width') === '100%') {
        connect.cancelConnection();
      }
    }
    if (e.button === 0 && !connecting.active) {
      clearSelection();
    }
    panZoom.onPointerDown(e);
  }, [clearSelection, panZoom, connecting.active, connect]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    drag.onPointerMove(e);
    panZoom.onPointerMove(e);
    if (connecting.active) {
      connect.updateCursor(screenToCanvas(e.clientX, e.clientY));
    }
  }, [drag, panZoom, connecting.active, connect, screenToCanvas]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent) => {
    drag.onPointerUp();
    panZoom.onPointerUp();
    // Don't cancel connection here — it gets cancelled on canvas background click instead
  }, [drag, panZoom]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const pos = screenToCanvas(e.clientX, e.clientY);
    eventBus.emit('canvas:click', { position: pos });
  }, [screenToCanvas, eventBus]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pos = screenToCanvas(e.clientX, e.clientY);
    eventBus.emit('canvas:contextmenu', { position: pos });
  }, [screenToCanvas, eventBus]);

  // Delete selected devices with Delete or Backspace key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if user is typing in an input
        const tag = (e.target as Element)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;

        const sel = store.getState().selection;
        if (sel.size === 0) return;

        e.preventDefault();
        let deviceCount = 0;
        let connectionCount = 0;
        for (const id of sel) {
          // Check if it's a connection or a device
          if (canvasAPI.getConnection(id)) {
            canvasAPI.removeConnection(id);
            connectionCount++;
          } else if (canvasAPI.getDevice(id)) {
            canvasAPI.removeDevice(id);
            deviceCount++;
          }
        }
        store.setState({ selection: new Set() });
        const parts = [];
        if (deviceCount > 0) parts.push(`${deviceCount} device${deviceCount > 1 ? 's' : ''}`);
        if (connectionCount > 0) parts.push(`${connectionCount} cable${connectionCount > 1 ? 's' : ''}`);
        if (parts.length > 0) {
          eventBus.emit('ui:notification', {
            message: `Removed ${parts.join(' and ')}`,
            level: 'info',
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, canvasAPI, eventBus]);

  const getPortWorldPosition = useCallback((deviceId: string, portId: string): Point => {
    const device = devices.get(deviceId);
    const typeDef = device ? deviceTypes.get(device.type) : undefined;
    if (!device || !typeDef) return { x: 0, y: 0 };

    const port = typeDef.ports.find((p) => p.id === portId);
    if (!port) return { x: device.position.x, y: device.position.y };

    return {
      x: device.position.x + port.position.x * device.size.width,
      y: device.position.y + port.position.y * device.size.height,
    };
  }, [devices, deviceTypes]);

  const deviceArray = Array.from(devices.values());
  const connectionArray = Array.from(connections.values());

  return (
    <svg
      ref={svgRef}
      tabIndex={0}
      style={{ width: '100%', height: '100%', background: '#0f0f1a', touchAction: 'none', outline: 'none' }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onClick={handleCanvasClick}
      onContextMenu={handleContextMenu}
      onWheel={panZoom.onWheel}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a1a2e" strokeWidth="0.5" />
        </pattern>
        <filter id="device-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid */}
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Transform group for pan/zoom */}
      <g transform={`translate(${viewport.offset.x}, ${viewport.offset.y}) scale(${viewport.zoom})`}>
        {/* Connections layer */}
        <g className="connections-layer">
          {connectionArray.map((conn) => {
            const typeDef = connectionTypes.get(conn.type);
            const Renderer = typeDef?.renderer ?? DefaultConnectionRenderer;
            const sourcePos = getPortWorldPosition(conn.sourceDeviceId, conn.sourcePortId);
            const targetPos = getPortWorldPosition(conn.targetDeviceId, conn.targetPortId);
            const isSelected = selection.has(conn.id);

            return (
              <g
                key={conn.id}
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  // Select this connection
                  store.setState((s) => {
                    const sel = e.shiftKey ? new Set(s.selection) : new Set<string>();
                    if (sel.has(conn.id)) {
                      sel.delete(conn.id);
                    } else {
                      sel.add(conn.id);
                    }
                    return { selection: sel };
                  });
                  svgRef.current?.focus();
                }}
              >
                {/* Invisible thick hitbox for easy clicking */}
                <line
                  x1={sourcePos.x} y1={sourcePos.y}
                  x2={targetPos.x} y2={targetPos.y}
                  stroke="transparent"
                  strokeWidth={12}
                />
                {/* Actual visible cable */}
                <Renderer
                  id={conn.id}
                  type={conn.type}
                  sourcePosition={sourcePos}
                  targetPosition={targetPos}
                  selected={isSelected}
                />
                {/* Port labels on hover when selected */}
                {isSelected && (
                  <>
                    <circle cx={sourcePos.x} cy={sourcePos.y} r={4} fill="#ff6a4a" opacity={0.8} />
                    <circle cx={targetPos.x} cy={targetPos.y} r={4} fill="#ff6a4a" opacity={0.8} />
                  </>
                )}
              </g>
            );
          })}

          {/* Active connection line (while creating) */}
          {connecting.active && connecting.sourceDeviceId && connecting.sourcePortId && connecting.cursorPosition && (
            <line
              x1={getPortWorldPosition(connecting.sourceDeviceId, connecting.sourcePortId).x}
              y1={getPortWorldPosition(connecting.sourceDeviceId, connecting.sourcePortId).y}
              x2={connecting.cursorPosition.x}
              y2={connecting.cursorPosition.y}
              stroke="#00bceb"
              strokeWidth={2}
              strokeDasharray="6 3"
              opacity={0.7}
            />
          )}
        </g>

        {/* Devices layer */}
        <g className="devices-layer">
          {deviceArray.map((device) => {
            const typeDef = deviceTypes.get(device.type);
            const Renderer = typeDef?.renderer ?? DefaultDeviceRenderer;
            const ports = typeDef?.ports ?? [];

            return (
              <g
                key={device.id}
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => {
                  select(device.id, e.shiftKey);
                  drag.onPointerDown(e, device.id);
                  svgRef.current?.focus();
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  eventBus.emit('canvas:device:dblclick', { deviceId: device.id });
                }}
              >
                <Renderer
                  id={device.id}
                  type={device.type}
                  position={device.position}
                  size={device.size}
                  ports={ports}
                  selected={selection.has(device.id)}
                  config={device.config}
                  label={device.label}
                />

                {/* Port hitboxes — always visible */}
                {ports.map((port) => {
                  const px = device.position.x + port.position.x * device.size.width;
                  const py = device.position.y + port.position.y * device.size.height;
                  const isTarget = connecting.active && connecting.sourceDeviceId !== device.id;

                  // Check if port is already occupied
                  const isOccupied = connectionArray.some(
                    (c) =>
                      (c.sourceDeviceId === device.id && c.sourcePortId === port.id) ||
                      (c.targetDeviceId === device.id && c.targetPortId === port.id),
                  );

                  const portColor = isOccupied ? '#00ff88' : '#00bceb';
                  const tooltip = isOccupied
                    ? `${port.label} — connected`
                    : `${port.label} — click to connect`;

                  return (
                    <g
                      key={port.id}
                      style={{ cursor: isOccupied && !connecting.active ? 'default' : 'crosshair' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (connecting.active) {
                          connect.completeConnection(device.id, port.id);
                        } else if (!isOccupied) {
                          connect.startConnection(device.id, port.id);
                        }
                      }}
                    >
                      {/* Outer glow when in connection mode and port is available */}
                      {isTarget && !isOccupied && (
                        <circle cx={px} cy={py} r={10} fill="#00bceb" opacity={0.15} />
                      )}
                      {/* Port circle */}
                      <circle
                        cx={px} cy={py} r={5}
                        fill={portColor}
                        fillOpacity={isOccupied ? 0.3 : (isTarget ? 0.5 : 0.15)}
                        stroke={portColor}
                        strokeWidth={isTarget && !isOccupied ? 1.5 : 0.8}
                        strokeOpacity={isOccupied ? 0.6 : (isTarget ? 1 : 0.4)}
                      />
                      {/* Center dot */}
                      <circle cx={px} cy={py} r={2} fill={portColor} opacity={isOccupied ? 0.8 : 0.6} />
                      <title>{tooltip}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* Plugin overlay layer (packet animations, etc.) */}
        <g className="overlay-layer">
          {children}
        </g>
      </g>
    </svg>
  );
}
