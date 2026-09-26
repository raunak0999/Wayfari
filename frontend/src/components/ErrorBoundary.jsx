import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          fontFamily: 'Outfit, sans-serif',
          padding: '2rem',
        }}>
          <div style={{
            textAlign: 'center',
            background: 'var(--card-bg, #1E293B)',
            border: '1px solid var(--border, #334155)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            maxWidth: '420px',
            width: '100%',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: 'var(--text-primary, #F8FAFC)', marginBottom: '0.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-secondary, #94A3B8)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              This page encountered an error. Try refreshing or going back.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #F97316, #FB923C)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/find-buddies'}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border, #334155)',
                  background: 'transparent',
                  color: 'var(--text-secondary, #94A3B8)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
