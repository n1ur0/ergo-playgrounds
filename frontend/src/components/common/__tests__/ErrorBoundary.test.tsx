import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import {
  ErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
  ErrorBoundaryProvider,
  ErrorBoundaryContext
} from '../ErrorBoundary'

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error
const originalConsoleGroup = console.group
const originalConsoleGroupEnd = console.groupEnd

beforeEach(() => {
  console.error = vi.fn()
  console.group = vi.fn()
  console.groupEnd = vi.fn()
})

afterEach(() => {
  console.error = originalConsoleError
  console.group = originalConsoleGroup
  console.groupEnd = originalConsoleGroupEnd
})

// Test components
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = true, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message)
  }
  return <div>No error</div>
}

const WorkingComponent: React.FC = () => <div>Working component</div>

describe('ErrorBoundary', () => {
  describe('Basic functionality', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText('Working component')).toBeInTheDocument()
    })

    it('should catch and display error fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Component failed to load')).toBeInTheDocument()
    })

    it('should show custom fallback when provided', () => {
      const customFallback = () => <div>Custom error message</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="Custom error message" />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error message',
          severity: expect.any(String),
          timestamp: expect.any(Date)
        }),
        expect.any(String)
      )
    })
  })

  describe('Error levels', () => {
    it('should render page-level fallback', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      expect(screen.getByText('Reload Page')).toBeInTheDocument()
    })

    it('should render section-level fallback', () => {
      render(
        <ErrorBoundary level="section">
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Section Unavailable')).toBeInTheDocument()
    })

    it('should render component-level fallback by default', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Component failed to load')).toBeInTheDocument()
    })
  })

  describe('Retry functionality', () => {
    it('should retry when retry button is clicked', async () => {
      let shouldThrow = true
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>Success after retry</div>
      }

      render(
        <ErrorBoundary level="section">
          <TestComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText('Section Unavailable')).toBeInTheDocument()

      // Simulate fixing the error
      shouldThrow = false

      // Click retry button
      fireEvent.click(screen.getByText('Try Again'))

      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument()
      })
    })

    it('should respect maxRetries limit', () => {
      const maxRetries = 2
      let retryCount = 0

      const TestComponent = () => {
        retryCount++
        throw new Error('Persistent error')
      }

      render(
        <ErrorBoundary maxRetries={maxRetries} level="section">
          <TestComponent />
        </ErrorBoundary>
      )

      // Initial render + first retry
      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)
      fireEvent.click(retryButton)

      expect(retryCount).toBe(3) // Initial + 2 retries
    })

    it('should reload page when max retries exceeded', () => {
      const mockReload = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      })

      const AlwaysFailComponent = () => {
        throw new Error('Always fails')
      }

      render(
        <ErrorBoundary maxRetries={1} level="section">
          <AlwaysFailComponent />
        </ErrorBoundary>
      )

      const retryButton = screen.getByText('Try Again')
      
      // First retry should work
      fireEvent.click(retryButton)
      
      // Second retry should trigger page reload
      fireEvent.click(retryButton)
      
      expect(mockReload).toHaveBeenCalled()
    })
  })

  describe('Reset functionality', () => {
    it('should reset on prop changes when resetOnPropsChange is true', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true} resetKeys={['key1']}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Component failed to load')).toBeInTheDocument()

      // Change reset key
      rerender(
        <ErrorBoundary resetOnPropsChange={true} resetKeys={['key2']}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('should not reset when resetOnPropsChange is false', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={false} resetKeys={['key1']}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Component failed to load')).toBeInTheDocument()

      // Change reset key
      rerender(
        <ErrorBoundary resetOnPropsChange={false} resetKeys={['key2']}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      // Should still show error
      expect(screen.getByText('Component failed to load')).toBeInTheDocument()
    })
  })

  describe('Error severity detection', () => {
    it('should detect chunk loading errors as low severity', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="ChunkLoadError: Loading chunk 1 failed" />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'low' }),
        expect.any(String)
      )
    })

    it('should detect permission errors as medium severity', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="Permission denied" />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'medium' }),
        expect.any(String)
      )
    })

    it('should detect type errors as high severity', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="TypeError: Cannot read property" />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'high' }),
        expect.any(String)
      )
    })

    it('should detect memory errors as critical severity', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="Out of memory" />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical' }),
        expect.any(String)
      )
    })
  })

  describe('Error details', () => {
    it('should show error details in page-level fallback', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError message="Detailed error message" />
        </ErrorBoundary>
      )

      const detailsElement = screen.getByText('Error Details')
      fireEvent.click(detailsElement)

      expect(screen.getByText('Detailed error message')).toBeInTheDocument()
    })

    it('should include stack trace and component stack', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      )

      const errorDetails = onError.mock.calls[0][0]
      expect(errorDetails).toHaveProperty('stack')
      expect(errorDetails).toHaveProperty('componentStack')
      expect(errorDetails).toHaveProperty('userAgent')
      expect(errorDetails).toHaveProperty('url')
    })
  })
})

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowError, { level: 'page' })

    render(<WrappedComponent />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should pass props through to wrapped component', () => {
    const TestComponent: React.FC<{ message: string }> = ({ message }) => (
      <div>{message}</div>
    )
    
    const WrappedComponent = withErrorBoundary(TestComponent)

    render(<WrappedComponent message="Hello" />)

    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should set correct display name', () => {
    const TestComponent: React.FC = () => <div>Test</div>
    TestComponent.displayName = 'TestComponent'
    
    const WrappedComponent = withErrorBoundary(TestComponent)

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
  })
})

describe('useErrorHandler hook', () => {
  it('should provide error reporting function', () => {
    const TestComponent = () => {
      const { reportError } = useErrorHandler()
      
      return (
        <button onClick={() => reportError('Manual error')}>
          Report Error
        </button>
      )
    }

    render(<TestComponent />)

    const button = screen.getByText('Report Error')
    fireEvent.click(button)

    // Should not throw - error should be logged internally
    expect(button).toBeInTheDocument()
  })

  it('should handle Error objects and strings', () => {
    const TestComponent = () => {
      const { reportError } = useErrorHandler()
      
      return (
        <div>
          <button onClick={() => reportError(new Error('Error object'))}>
            Report Error Object
          </button>
          <button onClick={() => reportError('Error string')}>
            Report Error String
          </button>
        </div>
      )
    }

    render(<TestComponent />)

    fireEvent.click(screen.getByText('Report Error Object'))
    fireEvent.click(screen.getByText('Report Error String'))

    // Should not throw
    expect(screen.getByText('Report Error Object')).toBeInTheDocument()
  })

  it('should include additional info when provided', () => {
    const TestComponent = () => {
      const { reportError } = useErrorHandler()
      
      return (
        <button 
          onClick={() => reportError('Test error', { userId: '123', action: 'click' })}
        >
          Report Error
        </button>
      )
    }

    render(<TestComponent />)

    fireEvent.click(screen.getByText('Report Error'))

    // Should not throw - additional info should be included
    expect(screen.getByText('Report Error')).toBeInTheDocument()
  })
})

describe('ErrorBoundaryProvider and Context', () => {
  it('should provide error boundary configuration through context', () => {
    const onError = vi.fn()
    const maxRetries = 5

    const TestComponent = () => {
      const context = React.useContext(ErrorBoundaryContext)
      return (
        <div>
          Max retries: {context.maxRetries}
        </div>
      )
    }

    render(
      <ErrorBoundaryProvider onError={onError} maxRetries={maxRetries}>
        <TestComponent />
      </ErrorBoundaryProvider>
    )

    expect(screen.getByText('Max retries: 5')).toBeInTheDocument()
  })

  it('should provide default empty context when no provider', () => {
    const TestComponent = () => {
      const context = React.useContext(ErrorBoundaryContext)
      return (
        <div>
          Has onError: {context.onError ? 'yes' : 'no'}
        </div>
      )
    }

    render(<TestComponent />)

    expect(screen.getByText('Has onError: no')).toBeInTheDocument()
  })
})

describe('Error logging', () => {
  it('should log errors in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(console.group).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
    expect(console.groupEnd).toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('should not log errors to console in production', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    // Mock fetch for error reporting
    global.fetch = vi.fn().mockResolvedValue({ ok: true })

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(console.group).not.toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })
})

describe('Edge cases', () => {
  it('should handle unmounting during error state', () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Component failed to load')).toBeInTheDocument()

    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow()
  })

  it('should handle rapid successive errors', () => {
    let errorCount = 0
    const onError = vi.fn()

    const MultiErrorComponent = () => {
      errorCount++
      throw new Error(`Error ${errorCount}`)
    }

    const { rerender } = render(
      <ErrorBoundary onError={onError}>
        <MultiErrorComponent />
      </ErrorBoundary>
    )

    // Trigger multiple rerenders with errors
    rerender(
      <ErrorBoundary onError={onError}>
        <MultiErrorComponent />
      </ErrorBoundary>
    )

    // Should handle multiple errors gracefully
    expect(screen.getByText('Component failed to load')).toBeInTheDocument()
  })

  it('should handle errors during error boundary rendering', () => {
    const FailingFallback = () => {
      throw new Error('Fallback error')
    }

    // This should be caught by React's built-in error handling
    expect(() => {
      render(
        <ErrorBoundary fallback={FailingFallback}>
          <ThrowError />
        </ErrorBoundary>
      )
    }).toThrow()
  })
})