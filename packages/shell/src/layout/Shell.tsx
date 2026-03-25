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
import { LessonsPage, bootcampStore } from '@netx/plugin-bootcamp';
import { AdminPanel } from '../auth/AdminPanel.js';
import { CrimpingSimulator } from '../crimping/CrimpingSimulator.js';
import { useAuth } from '../auth/AuthContext.js';
import { useState, useEffect } from 'react';

export function Shell() {
  const { eventBus, canvasAPI, canvasStore } = useKernel();
  const { user } = useAuth();
  const screen = useResponsive();
  const [adminOpen, setAdminOpen] = useState(window.location.hash === '#/admin');
  const [crimpingOpen, setCrimpingOpen] = useState(window.location.hash.startsWith('#/crimping'));

  const canvasOverlays = useStore(uiStore, (s) => s.canvasOverlays);
  const modals = useStore(uiStore, (s) => s.modals);
  const lessonsActive = useStore(bootcampStore, (s) => s.active);

  // Listen for admin panel toggle
  useEffect(() => {
    const handler = () => {
      const newState = !adminOpen;
      setAdminOpen(newState);
      window.location.hash = newState ? '#/admin' : '#/canvas';
    };
    window.addEventListener('netx:toggle-admin', handler);
    return () => window.removeEventListener('netx:toggle-admin', handler);
  }, [adminOpen]);

  // Sync admin state with hash
  useEffect(() => {
    const handler = () => {
      setAdminOpen(window.location.hash === '#/admin');
      setCrimpingOpen(window.location.hash.startsWith('#/crimping'));
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

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
        gridTemplateColumns: lessonsActive ? '1fr'
          : crimpingOpen ? '1fr auto'
          : (isMobile ? '1fr' : 'auto 1fr auto'),
        gridTemplateAreas: lessonsActive
          ? `"toolbar" "main" "statusbar"`
          : crimpingOpen
            ? `"toolbar toolbar" "main right" "statusbar statusbar"`
            : (isMobile
              ? `"toolbar" "main" "statusbar"`
              : `"toolbar toolbar toolbar" "left main right" "statusbar statusbar statusbar"`),
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

      {/* Left panel — hidden in lessons mode and mobile */}
      {!lessonsActive && !crimpingOpen && !isMobile && (
        <div style={{ gridArea: 'left', overflow: 'hidden', minHeight: 0 }}>
          <ErrorBoundary name="LeftPanel">
            <Panel slot="left" defaultOpen={!isTablet} />
          </ErrorBoundary>
        </div>
      )}

      {/* Main area — switches between Canvas and Lessons */}
      <div style={{ gridArea: 'main', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {crimpingOpen ? (
          <ErrorBoundary name="CrimpingSimulator">
            <CrimpingSimulator />
          </ErrorBoundary>
        ) : lessonsActive ? (
          <ErrorBoundary name="LessonsPage">
            <LessonsPage />
          </ErrorBoundary>
        ) : (
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
        )}
      </div>

      {/* Right panel — hidden in lessons mode and mobile */}
      {!lessonsActive && !isMobile && (
        <div style={{ gridArea: 'right', overflow: 'hidden', minHeight: 0 }}>
          <ErrorBoundary name="RightPanel">
            <Panel slot="right" defaultOpen={crimpingOpen || !isTablet} />
          </ErrorBoundary>
        </div>
      )}

      <div style={{ gridArea: 'statusbar' }}>
        <ErrorBoundary name="StatusBar">
          <StatusBar />
        </ErrorBoundary>
      </div>

      {/* Floating modals — only in canvas mode */}
      {!lessonsActive && modals.map((modal) => (
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

      {/* Admin panel */}
      {user?.role === 'admin' && (
        <FloatingWindow
          title="Admin — User Management"
          visible={adminOpen}
          onClose={() => setAdminOpen(false)}
          defaultX={Math.max(20, (window.innerWidth - 750) / 2)}
          defaultY={80}
          defaultWidth={750}
          defaultHeight={450}
          minWidth={500}
          minHeight={300}
        >
          <AdminPanel />
        </FloatingWindow>
      )}

      <NotificationToast eventBus={eventBus} />
    </div>
  );
}
