import { Component, type ReactNode } from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 max-w-xl mx-auto">
          <h1 className="text-lg font-semibold text-orange-700">Something went wrong</h1>
          <pre className="mt-3 text-xs text-charcoal-light whitespace-pre-wrap">{this.state.error.message}</pre>
          <button
            className="mt-4 text-sm text-navy-800 underline"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
