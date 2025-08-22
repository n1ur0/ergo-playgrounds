import React, { Suspense, lazy, useMemo } from 'react';
import type { ContractDesignerProps } from '../../types/contractDesigner';
import { useAccessibilityPreferences } from '../../utils/accessibility';
import { ErrorBoundary, type ErrorDetails } from '../common/ErrorBoundary';

// Lazy load heavy components for better initial load performance
const OptimizedContractDesigner = lazy(() => 
  import('./OptimizedContractDesigner').then(module => ({
    default: module.default
  }))
);

const EnhancedCodePreview = lazy(() =>
  import('./EnhancedCodePreview').then(module => ({
    default: module.default
  }))
);

const TestScenarioPanel = lazy(() =>
  import('./TestScenarioPanel').then(module => ({
    default: module.default
  }))
);

const ContractValidation = lazy(() =>
  import('./ContractValidation').then(module => ({
    default: module.default
  }))
);

// Loading components optimized for different states
const LoadingSpinner: React.FC<{ message?: string }> = React.memo(({ message = 'Loading...' }) => (
  <div className="loading-container">
    <div className="loading-spinner" role="status" aria-label={message}>
      <div className="spinner-ring"></div>
      <span className="loading-text">{message}</span>
    </div>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

const ErrorFallback: React.FC<{ error: Error; retry: () => void }> = React.memo(({ error, retry }) => (
  <div className="error-fallback" role="alert">
    <h3>🚨 Component Failed to Load</h3>
    <details>
      <summary>Error Details</summary>
      <pre>{error.message}</pre>
    </details>
    <button onClick={retry} className="retry-button">
      🔄 Try Again
    </button>
  </div>
));

ErrorFallback.displayName = 'ErrorFallback';

// Progressive enhancement based on device capabilities
function useDeviceCapabilities() {
  return useMemo(() => {
    const isLowEnd = navigator.hardwareConcurrency <= 2;
    const hasLimitedMemory = (navigator as any).deviceMemory <= 2;
    const isSlowConnection = (navigator as any).connection?.effectiveType === '2g' || 
                            (navigator as any).connection?.effectiveType === 'slow-2g';
    
    return {
      isLowEnd: isLowEnd || hasLimitedMemory || isSlowConnection,
      shouldReduceAnimations: isLowEnd || hasLimitedMemory,
      shouldLazyLoadImages: isSlowConnection,
      shouldUseSimpleRendering: isLowEnd,
    };
  }, []);
}

// Main component with progressive loading
interface LazyContractDesignerProps extends ContractDesignerProps {
  loadingMode?: 'progressive' | 'immediate';
  enableDeviceOptimization?: boolean;
}

export const LazyContractDesigner: React.FC<LazyContractDesignerProps> = React.memo(({
  loadingMode = 'progressive',
  enableDeviceOptimization = true,
  ...props
}) => {
  const [loadedComponents, setLoadedComponents] = React.useState(new Set<string>());
  const [retryCount, setRetryCount] = React.useState(0);
  const deviceCapabilities = useDeviceCapabilities();
  const accessibilityPrefs = useAccessibilityPreferences();

  // Progressive loading strategy
  const loadingStrategy = useMemo(() => {
    if (!enableDeviceOptimization) {
      return { immediate: true, timeout: 5000 };
    }

    if (deviceCapabilities.isLowEnd) {
      return { immediate: false, timeout: 10000, priority: 'low' };
    }

    return { immediate: loadingMode === 'immediate', timeout: 5000, priority: 'normal' };
  }, [enableDeviceOptimization, deviceCapabilities.isLowEnd, loadingMode]);

  // Handle component load success
  const handleComponentLoad = React.useCallback((componentName: string) => {
    setLoadedComponents(prev => new Set(prev).add(componentName));
  }, []);

  // Error boundary with retry logic
  const handleError = React.useCallback((error: ErrorDetails, errorId: string) => {
    console.error('Component loading failed:', error);
    if (retryCount < 3) {
      setTimeout(() => setRetryCount(prev => prev + 1), 1000 * Math.pow(2, retryCount));
    }
  }, [retryCount]);

  // Optimized loading messages
  const getLoadingMessage = (component: string): string => {
    const messages = {
      designer: 'Loading Contract Designer...',
      codePreview: 'Loading Code Preview...',
      testPanel: 'Loading Test Panel...',
      validation: 'Loading Validation...'
    };
    return messages[component as keyof typeof messages] || 'Loading Component...';
  };

  // Create optimized Suspense wrapper
  const createSuspenseWrapper = React.useCallback((
    component: React.ReactNode,
    componentName: string,
    fallback?: React.ReactNode
  ) => (
    <Suspense
      fallback={
        fallback || (
          <LoadingSpinner 
            message={getLoadingMessage(componentName)}
          />
        )
      }
    >
      <React.Fragment
        key={`${componentName}-${retryCount}`}
      >
        {component}
      </React.Fragment>
    </Suspense>
  ), [retryCount, getLoadingMessage]);

  // Render optimized components based on device capabilities
  const renderOptimizedDesigner = React.useCallback(() => {
    const designerProps = {
      ...props,
      // Reduce features for low-end devices
      enableAnimations: !deviceCapabilities.shouldReduceAnimations && !accessibilityPrefs.prefersReducedMotion,
      enableAdvancedRendering: !deviceCapabilities.shouldUseSimpleRendering,
      lazyLoadImages: deviceCapabilities.shouldLazyLoadImages,
      performanceMode: deviceCapabilities.isLowEnd ? 'eco' : 'balanced'
    };

    return (
      <OptimizedContractDesigner 
        {...designerProps}
        onLoad={() => handleComponentLoad('designer')}
      />
    );
  }, [props, deviceCapabilities, accessibilityPrefs, handleComponentLoad]);

  // Progressive enhancement of features
  const features = useMemo(() => ({
    showCodePreview: loadedComponents.has('designer') || loadingStrategy.immediate,
    showTestPanel: loadedComponents.has('designer') && !deviceCapabilities.isLowEnd,
    showValidation: loadedComponents.has('designer'),
    showAdvancedFeatures: !deviceCapabilities.isLowEnd && loadedComponents.size >= 2
  }), [loadedComponents, loadingStrategy.immediate, deviceCapabilities.isLowEnd]);

  // Preload critical resources
  React.useEffect(() => {
    if (loadingStrategy.immediate) {
      // Preload critical components
      import('./OptimizedContractDesigner');
      if (!deviceCapabilities.isLowEnd) {
        import('./EnhancedCodePreview');
        import('./TestScenarioPanel');
      }
    }
  }, [loadingStrategy.immediate, deviceCapabilities.isLowEnd]);

  // Main render with error boundaries
  return (
    <div className={`lazy-contract-designer ${deviceCapabilities.isLowEnd ? 'low-end-mode' : ''}`}>
      {/* Core Designer Component */}
      <ErrorBoundary
        fallback={(error, retry) => (
          <div className="error-fallback" role="alert">
            <h3>🚨 Component Failed to Load</h3>
            <details>
              <summary>Error Details</summary>
              <pre>{error.message}</pre>
            </details>
            <button onClick={retry} className="retry-button">
              🔄 Try Again
            </button>
          </div>
        )}
        onError={handleError}
      >
        {createSuspenseWrapper(
          renderOptimizedDesigner(),
          'designer',
          <div className="designer-loading">
            <LoadingSpinner message="Initializing Contract Designer..." />
            <div className="loading-tips">
              <p>💡 Tip: You can start designing as soon as the canvas loads!</p>
              {deviceCapabilities.isLowEnd && (
                <p>🚀 Optimizing for your device...</p>
              )}
            </div>
          </div>
        )}
      </ErrorBoundary>

      {/* Progressive Feature Loading */}
      {features.showCodePreview && (
        <ErrorBoundary
          fallback={() => <div className="feature-unavailable">Code preview temporarily unavailable</div>}
          onError={handleError}
        >
          {createSuspenseWrapper(
            <EnhancedCodePreview 
              onLoad={() => handleComponentLoad('codePreview')}
              enableSyntaxHighlighting={!deviceCapabilities.isLowEnd}
            />,
            'codePreview'
          )}
        </ErrorBoundary>
      )}

      {features.showTestPanel && (
        <ErrorBoundary
          fallback={() => <div className="feature-unavailable">Test panel temporarily unavailable</div>}
          onError={handleError}
        >
          {createSuspenseWrapper(
            <TestScenarioPanel 
              testScenarios={[]}
              isTestingContract={false}
              contractValid={true}
              onAddScenario={() => {}}
              onRemoveScenario={() => {}}
              onRunScenario={() => {}}
              onLoad={() => handleComponentLoad('testPanel')} 
            />,
            'testPanel'
          )}
        </ErrorBoundary>
      )}

      {features.showValidation && (
        <ErrorBoundary
          fallback={() => <div className="feature-unavailable">Validation temporarily unavailable</div>}
          onError={handleError}
        >
          {createSuspenseWrapper(
            <ContractValidation 
              validationErrors={[]}
              components={[]}
              connections={[]}
              contractComplexity={0}
              hasValidContract={false}
              onLoad={() => handleComponentLoad('validation')} 
            />,
            'validation'
          )}
        </ErrorBoundary>
      )}

      {/* Performance Monitor for Development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-debug">
          <details>
            <summary>🔧 Performance Debug</summary>
            <div className="debug-info">
              <p>Device: {deviceCapabilities.isLowEnd ? 'Low-end' : 'High-end'}</p>
              <p>Loaded: {loadedComponents.size} components</p>
              <p>Strategy: {loadingStrategy.immediate ? 'Immediate' : 'Progressive'}</p>
              <p>Retries: {retryCount}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
});

LazyContractDesigner.displayName = 'LazyContractDesigner';

export default LazyContractDesigner;