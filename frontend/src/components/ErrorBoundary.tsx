import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error.message, info?.componentStack?.slice(0, 200));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 min-h-[200px]">
          <div className="text-center">
            <div className="text-red text-sm font-mono mb-2">Component Error</div>
            <div className="text-text-muted text-xs font-mono max-w-md truncate">
              {this.state.error?.message || 'Unknown error'}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
