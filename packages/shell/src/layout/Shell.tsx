import { useKernel } from '../context/KernelContext.js';
import { SVGRenderer } from '@netx/canvas';
import { Toolbar } from './Toolbar.js';
import { Panel } from './Panel.js';
import { StatusBar } from './StatusBar.js';
import { NotificationToast } from '../components/NotificationToast.js';
import { ErrorBoundary } from '../components/ErrorBoundary.js';

export function Shell() {
  const { eventBus, canvasAPI, canvasStore } = useKernel();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto auto',
        gridTemplateColumns: 'auto 1fr auto',
        gridTemplateAreas: `
          "toolbar toolbar toolbar"
          "left canvas right"
          "bottom bottom bottom"
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

      <div style={{ gridArea: 'left' }}>
        <ErrorBoundary name="LeftPanel">
          <Panel slot="left" />
        </ErrorBoundary>
      </div>

      <div style={{ gridArea: 'canvas', overflow: 'hidden', position: 'relative' }}>
        <ErrorBoundary name="Canvas">
          <SVGRenderer store={canvasStore} canvasAPI={canvasAPI} eventBus={eventBus} />
        </ErrorBoundary>
      </div>

      <div style={{ gridArea: 'right' }}>
        <ErrorBoundary name="RightPanel">
          <Panel slot="right" defaultOpen={false} />
        </ErrorBoundary>
      </div>

      <div style={{ gridArea: 'bottom' }}>
        <ErrorBoundary name="BottomPanel">
          <Panel slot="bottom" defaultOpen={false} />
        </ErrorBoundary>
      </div>

      <div style={{ gridArea: 'statusbar' }}>
        <ErrorBoundary name="StatusBar">
          <StatusBar />
        </ErrorBoundary>
      </div>

      <NotificationToast eventBus={eventBus} />
    </div>
  );
}
