// Explicit ambient types to satisfy TypeScript without physical module imports
declare var React: any;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface WalletModalErrorBoundaryProps {
  children: any;
  onRetry?: () => void;
}

export function WalletModalErrorBoundary({ children, onRetry }: WalletModalErrorBoundaryProps) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const errorHandler = (event: any) => {
      setHasError(true);
      console.error("WalletModalErrorBoundary caught an error:", event.error);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  const handleRetry = (): void => {
    setHasError(false);
    if (onRetry) {
      onRetry();
    }
  };

  if (hasError) {
    return (
      <div className="wallet-error-fallback p-4 text-center border border-red-200 rounded-lg bg-red-50">
        <p className="text-sm text-red-600 mb-3 font-medium">
          Failed to connect wallet or load session.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return children;
}
