import { useMemo } from 'react';
import { useStore } from 'zustand';
import { useKernel } from '../context/KernelContext.js';
import { SVGRenderer } from '@netx/canvas';
import { uiStore } from '@netx/kernel';
import { Toolbar } from './Toolbar.js';
import { Panel } from './Panel.js';
import { StatusBar } from './StatusBar.js';
import { NotificationToast } from '../components/NotificationToast.js';
import { ErrorBoundary } from '../components/ErrorBoundary.js';
import { FloatingWindow } from '../components/FloatingWindow.js';
import { useResponsive } from '../hooks/useResponsive.js';

export function Shell() {
  const { eventBus, canvasAPI, canvasStore } = useKernel();
  const screen = useResponsive();

  const canvasOverlays = useStore(uiStore, (s) => s.canvasOverlays);
  const modals = useStore(uiStore, (s) => s.modals);

  const sortedOverlays = useMemo(
    () => [...canvasOverlays].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
    [canvasOverlays],
  );

  const isMobile = screen === 'mobile';
  const isTablet = screen === 'tablet';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto',
        gridTemplateAreas: isMobile
          ? `"toolbar" "canvas" "statusbar"`
          : `"toolbar toolbar toolbar" "left canvas right" "statusbar statusbar statusbar"`,
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <div style={{ gridArea: 'toolbar' }}>
        <ErrorBoundary name="Toolbar">
          <Toolbar />
        </ErrorBoundary>
      </div>

      {!isMobile && (
        <div style={{ gridArea: 'left', overflow: 'hidden', minHeight: 0 }}>
          <ErrorBoundary name="LeftPanel">
            <Panel slot="left" defaultOpen={!isTablet} />
          </ErrorBoundary>
        </div>
      )}

      <div style={{ gridArea: 'canvas', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        <ErrorBoundary name="Canvas">
          <SVGRenderer store={canvasStore} canvasAPI={canvasAPI} eventBus={eventBus}>
            {sortedOverlays.map((overlay) => {
              const Comp = overlay.component;
              return (
                <ErrorBoundary key={overlay.id} name={`Overlay:${overlay.id}`}>
                  <Comp />
                </ErrorBoundary>
              );
            })}
          </SVGRenderer>
        </ErrorBoundary>
      </div>

      {!isMobile && (
        <div style={{ gridArea: 'right', overflow: 'hidden', minHeight: 0 }}>
          <ErrorBoundary name="RightPanel">
            <Panel slot="right" defaultOpen={!isTablet} />
          </ErrorBoundary>
        </div>
      )}

      <div style={{ gridArea: 'statusbar' }}>
        <ErrorBoundary name="StatusBar">
          <StatusBar />
        </ErrorBoundary>
      </div>

      {modals.map((modal) => (
        <ErrorBoundary key={modal.id} name={`Modal:${modal.id}`}>
          <FloatingWindow
            title={modal.title}
            visible={modal.visible}
            onClose={modal.onClose}
            defaultX={isMobile ? 10 : (modal.defaultX ?? window.innerWidth / 2 - 280)}
            defaultY={isMobile ? 50 : (modal.defaultY ?? window.innerHeight - 380)}
            defaultWidth={isMobile ? window.innerWidth - 20 : (modal.defaultWidth ?? 560)}
            defaultHeight={isMobile ? 250 : (modal.defaultHeight ?? 320)}
            minWidth={isMobile ? 200 : 300}
            minHeight={150}
          >
            <modal.component />
          </FloatingWindow>
        </ErrorBoundary>
      ))}

      <NotificationToast eventBus={eventBus} />
    </div>
  );
}
