import { Component } from 'react';

/**
 * Catches a render crash anywhere below it. Without one, a single thrown error
 * unmounts the whole app and leaves a blank white page with nothing to report.
 * This shows what broke and a way out, and keeps the message on screen so it
 * can be screenshotted for a bug report.
 *
 * `resetKey` (the route) clears the error on navigation, so moving away from a
 * broken screen recovers without a reload.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Screen crashed:', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="min-h-[60vh] grid place-items-center px-4 py-10">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center space-y-3">
          <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-500" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-slate-900">This screen hit a problem</h1>
          <p className="text-xs text-slate-500">
            Your saved work on this device is kept. Reload to try again; if it keeps happening, send a screenshot of this message.
          </p>
          <pre className="text-left text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3 whitespace-pre-wrap break-words">
            {String(error?.message || error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-10 px-4 rounded-lg bg-mg-teal hover:bg-mg-tealDark text-white text-sm font-semibold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
