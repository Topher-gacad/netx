import { useKernel } from '../context/KernelContext.js';
import { SVGRenderer } from '@netx/canvas';
import { Toolbar } from './Toolbar.js';
import { Panel } from './Panel.js';
import { StatusBar } from './StatusBar.js';
import { NotificationToast } from '../components/NotificationToast.js';
import { ErrorBoundary } from '../components/ErrorBoundary.js';
import { FloatingWindow } from '../components/FloatingWindow.js';
import { PacketOverlay } from '@netx/plugin-packet-engine';
import { CLIModalContent, isModalOpen, getActiveDeviceInfo, closeModal, onModalChange } from '@netx/plugin-cli-simulator';
import { useState, useEffect } from 'react';

export function Shell() {
  const { eventBus, canvasAPI, canvasStore } = useKernel();
  const [, setTick] = useState(0);

  // Re-render when CLI modal opens or closes
  useEffect(() => {
    const unsub = onModalChange(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const cliOpen = isModalOpen();
  const activeDevice = getActiveDeviceInfo();
  const cliTitle = activeDevice ? `CLI — ${activeDevice.hostname} (${activeDevice.type})` : 'CLI Terminal';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gridTemplateColumns: 'auto 1fr auto',
        gridTemplateAreas: `
          "toolbar toolbar toolbar"
          "left canvas right"
          "statusbar statusbar statusbar"
        `,
        height: '100vh',
        width: '100vw',
      }}
    >
      <div style={{ gridArea: 'toolbar' }}>
        <ErrorBoundary name="Toolbar">
          <Toolbar />
        </ErrorBoundary>
      </div>

      <div style={{ gridArea: 'left', overflow: 'hidden', minHeight: 0 }}>
        <ErrorBoundary name="LeftPanel">
          <Panel slot="left" />
        </ErrorBoundary>
      </div>

      <div style={{ gridArea: 'canvas', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        <ErrorBoundary name="Canvas">
          <SVGRenderer store={canvasStore} canvasAPI={canvasAPI} eventBus={eventBus}>
            <ErrorBoundary name="PacketOverlay">
              <PacketOverlay />
            </ErrorBoundary>
          </SVGRenderer>
        </ErrorBoundary>
      </div>

      <div style={{ gridArea: 'right', overflow: 'hidden', minHeight: 0 }}>
        <ErrorBoundary name="RightPanel">
          <Panel slot="right" defaultOpen={true} />
        </ErrorBoundary>
      </div>

      <div style={{ gridArea: 'statusbar' }}>
        <ErrorBoundary name="StatusBar">
          <StatusBar />
        </ErrorBoundary>
      </div>

      {/* Floating CLI Terminal Modal */}
      <ErrorBoundary name="CLIModal">
        <FloatingWindow
          title={cliTitle}
          visible={cliOpen}
          onClose={closeModal}
          defaultX={window.innerWidth / 2 - 280}
          defaultY={window.innerHeight - 380}
          defaultWidth={560}
          defaultHeight={320}
          minWidth={360}
          minHeight={180}
        >
          <CLIModalContent />
        </FloatingWindow>
      </ErrorBoundary>

      <NotificationToast eventBus={eventBus} />
    </div>
  );
}
