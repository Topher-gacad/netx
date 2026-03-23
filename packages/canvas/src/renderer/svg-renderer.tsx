import { useCallback, useRef } from 'react';
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
}

export function SVGRenderer({ store, canvasAPI, eventBus }: SVGRendererProps) {
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
  const connect = useConnect(store, canvasAPI);
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
    if (e.button === 0 && !connecting.active) {
      clearSelection();
    }
    panZoom.onPointerDown(e);
  }, [clearSelection, panZoom, connecting.active]);

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
    if (connecting.active) {
      connect.cancelConnection();
    }
  }, [drag, panZoom, connecting, connect]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const pos = screenToCanvas(e.clientX, e.clientY);
    eventBus.emit('canvas:click', { position: pos });
  }, [screenToCanvas, eventBus]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pos = screenToCanvas(e.clientX, e.clientY);
    eventBus.emit('canvas:contextmenu', { position: pos });
  }, [screenToCanvas, eventBus]);

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
      style={{ width: '100%', height: '100%', background: '#0f0f1a', touchAction: 'none' }}
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

            return (
              <Renderer
                key={conn.id}
                id={conn.id}
                type={conn.type}
                sourcePosition={sourcePos}
                targetPosition={targetPos}
                selected={selection.has(conn.id)}
              />
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

                {/* Port hitboxes */}
                {ports.map((port) => {
                  const px = device.position.x + port.position.x * device.size.width;
                  const py = device.position.y + port.position.y * device.size.height;

                  return (
                    <circle
                      key={port.id}
                      cx={px}
                      cy={py}
                      r={6}
                      fill={connecting.active ? '#00bceb' : 'transparent'}
                      fillOpacity={connecting.active ? 0.3 : 0}
                      stroke={connecting.active ? '#00bceb' : 'transparent'}
                      strokeWidth={1}
                      style={{ cursor: 'crosshair' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (connecting.active) {
                          connect.completeConnection(device.id, port.id);
                        } else {
                          connect.startConnection(device.id, port.id);
                        }
                      }}
                    >
                      <title>{port.label}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
