import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name ?? 'unknown'}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: '16px', color: '#ff4444', fontSize: '12px', fontFamily: 'monospace' }}>
            <strong>[{this.props.name ?? 'Component'}] Error:</strong>
            <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
            <pre style={{ marginTop: '4px', whiteSpace: 'pre-wrap', color: '#888', fontSize: '10px' }}>{this.state.error.stack}</pre>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
