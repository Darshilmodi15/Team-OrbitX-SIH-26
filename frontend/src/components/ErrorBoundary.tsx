import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Anchor } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ORCA Uncaught UI Rendering Exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    localStorage.clear();
    sessionStorage.clear();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-black text-white tracking-tight mb-2">
              ORCA Coastal Console Recovered
            </h1>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              A temporary interface exception occurred during render. You can reload or reset your active session.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-28">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleResetState}
                className="w-full sm:flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Anchor className="w-3.5 h-3.5 text-teal-400" />
                <span>Reset Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
