import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f7f7] p-8">
          <div className="bg-white rounded-3xl border-2 border-red-200 border-b-8 p-8 max-w-lg w-full text-center shadow-lg">
            <div className="text-6xl mb-4">🦉</div>
            <h2 className="text-2xl font-black text-red-500 mb-2">¡Algo salió mal!</h2>
            <p className="text-gray-600 text-sm mb-4">
              DuoPOS encontró un error inesperado. No te preocupes, tus datos están seguros.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-left">
              <code className="text-xs text-red-700 break-all font-mono">
                {this.state.error?.message || 'Error desconocido'}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="py-2.5 px-6 bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-2 font-black text-sm rounded-xl transition-all cursor-pointer"
            >
              Recargar DuoPOS 🔄
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
