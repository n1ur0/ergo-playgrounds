import React, { lazy, Suspense } from 'react';

// Loading fallback component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-red-600 mb-4">
      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load component</h3>
    <p className="text-sm text-gray-600 mb-4">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      Try Again
    </button>
  </div>
);

// Simplified lazy-loaded components
export const LazyContractDesigner = lazy(() => import('../designer/OptimizedContractDesigner'));
export const LazyReactFlow = lazy(() => import('reactflow'));
export const LazyCodeEditor = lazy(() => import('react-syntax-highlighter'));
export const LazyComponentPalette = lazy(() => import('../designer/ComponentPalette'));
export const LazyPropertyPanel = lazy(() => import('../designer/OptimizedPropertyPanel'));
export const LazyTestScenarioPanel = lazy(() => import('../designer/TestScenarioPanel'));
export const LazyCodePreview = lazy(() => import('../designer/EnhancedCodePreview'));

// High-order component for wrapping lazy components with suspense and error boundaries
export function withLazyLoading<T extends Record<string, any>>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<T>>,
  fallback?: React.ReactNode,
  displayName?: string
): React.ComponentType<T> {
  const WrappedComponent = (props: T) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  WrappedComponent.displayName = displayName || `LazyLoaded(Component)`;

  return WrappedComponent;
}

// Pre-wrapped components ready to use
export const SuspenseContractDesigner = withLazyLoading(
  LazyContractDesigner,
  <LoadingSpinner />,
  'SuspenseContractDesigner'
);

export const SuspenseComponentPalette = withLazyLoading(
  LazyComponentPalette,
  <div className="w-64 bg-gray-50 animate-pulse"></div>,
  'SuspenseComponentPalette'
);

export const SuspensePropertyPanel = withLazyLoading(
  LazyPropertyPanel,
  <div className="w-80 bg-gray-50 animate-pulse"></div>,
  'SuspensePropertyPanel'
);

export const SuspenseTestScenarioPanel = withLazyLoading(
  LazyTestScenarioPanel,
  <div className="h-64 bg-gray-50 animate-pulse rounded-md"></div>,
  'SuspenseTestScenarioPanel'
);

export const SuspenseCodePreview = withLazyLoading(
  LazyCodePreview,
  <div className="h-96 bg-gray-900 animate-pulse rounded-md"></div>,
  'SuspenseCodePreview'
);

// Utility for preloading components
export const preloadComponents = {
  contractDesigner: () => import('../designer/OptimizedContractDesigner'),
  componentPalette: () => import('../designer/ComponentPalette'),
  propertyPanel: () => import('../designer/OptimizedPropertyPanel'),
  testScenarioPanel: () => import('../designer/TestScenarioPanel'),
  codePreview: () => import('../designer/EnhancedCodePreview'),
  reactFlow: () => import('reactflow'),
  codeEditor: () => import('react-syntax-highlighter'),
};

// Hook for preloading components on user interaction
export function usePreloadComponents() {
  const preloadAll = React.useCallback(() => {
    Object.values(preloadComponents).forEach(preload => {
      preload().catch(error => {
        console.warn('Failed to preload component:', error);
      });
    });
  }, []);

  const preloadOnHover = React.useCallback((componentName: keyof typeof preloadComponents) => {
    return () => {
      preloadComponents[componentName]().catch(error => {
        console.warn(`Failed to preload ${componentName}:`, error);
      });
    };
  }, []);

  const preloadOnIdle = React.useCallback(() => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        preloadAll();
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(preloadAll, 2000);
    }
  }, [preloadAll]);

  return {
    preloadAll,
    preloadOnHover,
    preloadOnIdle,
  };
}

// Component for handling lazy loading states with better UX
export const LazyLoadingBoundary: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minLoadingTime?: number;
}> = ({ children, fallback = <LoadingSpinner />, minLoadingTime = 500 }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [showContent, setShowContent] = React.useState(false);
  const startTimeRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= minLoadingTime) {
        setShowContent(true);
      } else {
        setTimeout(() => setShowContent(true), minLoadingTime - elapsed);
      }
      setIsLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [minLoadingTime]);

  if (isLoading || !showContent) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default {
  LazyContractDesigner,
  LazyReactFlow,
  LazyCodeEditor,
  LazyComponentPalette,
  LazyPropertyPanel,
  LazyTestScenarioPanel,
  LazyCodePreview,
  withLazyLoading,
  SuspenseContractDesigner,
  SuspenseComponentPalette,
  SuspensePropertyPanel,
  SuspenseTestScenarioPanel,
  SuspenseCodePreview,
  preloadComponents,
  usePreloadComponents,
  LazyLoadingBoundary,
  ErrorFallback,
};