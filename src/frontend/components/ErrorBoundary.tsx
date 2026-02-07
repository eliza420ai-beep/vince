import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col gap-3 p-6 rounded-xl border border-destructive/50 bg-destructive/10 min-h-[280px] justify-center">
          <p className="font-medium text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground font-mono break-all">
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
