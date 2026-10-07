import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught React ErrorBoundary error:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0B0D10',
            color: '#F87171',
            fontFamily: 'sans-serif',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              backgroundColor: '#161A20',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#E6E8EB' }}>
              Application Render Error
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#A0A6AF' }}>
              A UI component encountered an unexpected error:
            </p>
            <pre
              style={{
                backgroundColor: '#0D0F13',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#F87171',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: '#6C8CFF',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
