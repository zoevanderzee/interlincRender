import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
    
    // You could also log to a monitoring service like Sentry here
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 text-white">
          <div className="max-w-md w-full bg-zinc-900 rounded-lg shadow-lg p-8 border border-zinc-800">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-center mb-2">Something Went Wrong</h1>
            
            <p className="text-zinc-400 text-center mb-6">
              We've encountered an unexpected error. Our team has been notified.
            </p>
            
            <div className="mb-6 p-4 bg-zinc-800 rounded overflow-auto max-h-32 text-xs">
              <p className="font-mono text-red-400">
                {this.state.error?.toString() || "Unknown error"}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="w-full sm:w-1/2 border-zinc-700 hover:bg-zinc-800"
                onClick={this.handleGoHome}
              >
                Go to Dashboard
              </Button>
              <Button 
                className="w-full sm:w-1/2 bg-white text-black hover:bg-zinc-200"
                onClick={this.handleReload}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;