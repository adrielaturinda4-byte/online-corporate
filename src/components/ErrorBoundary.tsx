import React from 'react';
import { safeStorage } from '../lib/safeStorage';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    try {
      safeStorage.removeItem('oc_routed');
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleFullReset = () => {
    try {
      safeStorage.clear();
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F1923] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#1A2633] border border-[#C9A84C]/30 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-[#C9A84C]/20 text-[#C9A84C] rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
              OC
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-serif font-bold text-[#E8CC7A]">
                Online Corporate
              </h1>
              <p className="text-sm text-gray-300">
                The application encountered an unexpected display issue during startup.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-left overflow-auto max-h-32 text-xs font-mono text-red-300">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 bg-[#C9A84C] hover:bg-[#E8CC7A] text-[#0F1923] font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md"
              >
                Reload Platform
              </button>
              <button
                type="button"
                onClick={this.handleFullReset}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all border border-white/15"
              >
                Clear Cache &amp; Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
