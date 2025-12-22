import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console for now; could send to monitoring service
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fff', color: '#333', border: '1px solid #eee' }}>
          <h3>Something went wrong.</h3>
          <p>Please refresh the page or contact support. See console for details.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
