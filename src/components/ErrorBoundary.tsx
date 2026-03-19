/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays a fallback UI
 * instead of crashing the entire extension.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FrontendDevHelper Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '380px',
            minHeight: '200px',
            background: '#0f172a',
            color: '#e2e8f0',
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}
          >
            ⚠️
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#f87171',
            }}
          >
            Something went wrong
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#94a3b8',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            The extension encountered an unexpected error. Try reloading or resetting the extension.
          </p>

          {this.state.error && (
            <details
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#64748b',
              }}
            >
              <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>Error details</summary>
              <pre
                style={{
                  margin: '8px 0 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '100px',
                  overflow: 'auto',
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div
            style={{
              display: 'flex',
              gap: '8px',
              width: '100%',
            }}
          >
            <button
              onClick={this.handleReset}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#818cf8',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Reload Extension
            </button>
          </div>

          <a
            href="https://github.com/rejisterjack/frontend-dev-helper/issues"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '12px',
              color: '#64748b',
              textDecoration: 'none',
            }}
          >
            Report issue on GitHub →
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
