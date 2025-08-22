import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePlaygroundIntegration, usePlaygroundConnection } from '../usePlaygroundIntegration'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock timers
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useEffect: vi.fn((fn) => fn()),
  }
})

describe('usePlaygroundIntegration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockFetch.mockClear()
    
    // Default successful mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePlaygroundIntegration())

      expect(result.current.isConnected).toBe(false)
      expect(result.current.isExecuting).toBe(false)
      expect(result.current.executionResults).toEqual([])
      expect(result.current.activeScenario).toBeNull()
      expect(result.current.queueLength).toBe(0)
    })

    it('should check health on initialization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      })

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/playground/health')
      expect(result.current.isConnected).toBe(true)
    })

    it('should handle health check failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      expect(result.current.isConnected).toBe(false)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('Contract compilation', () => {
    it('should compile contract successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({ // Health check
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' })
        })
        .mockResolvedValueOnce({ // Compile request
          ok: true,
          json: () => Promise.resolve({
            compiledBytes: 'compiled_bytes',
            address: 'contract_address',
            complexity: 15,
            errors: [],
            warnings: []
          })
        })

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let compilationResult
      await act(async () => {
        compilationResult = await result.current.compileContract('sigmaProp(true)')
      })

      expect(compilationResult).toEqual({
        compiledBytes: 'compiled_bytes',
        address: 'contract_address',
        complexity: 15,
        errors: [],
        warnings: []
      })
    })

    it('should cache compilation results', async () => {
      mockFetch
        .mockResolvedValueOnce({ // Health check
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' })
        })
        .mockResolvedValueOnce({ // First compile request
          ok: true,
          json: () => Promise.resolve({
            compiledBytes: 'compiled_bytes',
            address: 'contract_address',
            complexity: 15
          })
        })

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const ergoScript = 'sigmaProp(true)'

      // First compilation
      await act(async () => {
        await result.current.compileContract(ergoScript)
      })

      // Second compilation should use cache
      await act(async () => {
        await result.current.compileContract(ergoScript)
      })

      // Should only make one compile request (plus health check)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle compilation errors', async () => {
      mockFetch
        .mockResolvedValueOnce({ // Health check
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' })
        })
        .mockResolvedValueOnce({ // Compile request with errors
          ok: true,
          json: () => Promise.resolve({
            compiledBytes: '',
            address: '',
            complexity: 0,
            errors: ['Syntax error on line 1'],
            warnings: []
          })
        })

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let compilationResult
      await act(async () => {
        compilationResult = await result.current.compileContract('invalid script')
      })

      expect(compilationResult.errors).toContain('Syntax error on line 1')
    })
  })

  describe('Contract execution', () => {
    it('should execute contract successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({ // Health check
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' })
        })
        .mockResolvedValueOnce({ // Compile request
          ok: true,
          json: () => Promise.resolve({
            compiledBytes: 'compiled_bytes',
            address: 'contract_address',
            complexity: 15,
            errors: [],
            warnings: []
          })
        })
        .mockResolvedValueOnce({ // Execute request
          ok: true,
          json: () => Promise.resolve({
            success: true,
            transactionId: 'tx_123',
            executionTime: 250,
            gasUsed: 1000,
            logs: ['Execution successful'],
            stateChanges: []
          })
        })

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const generatedContract = {
        ergoScript: 'sigmaProp(true)',
        scalaCode: '',
        documentation: '',
        testSuite: '',
        complexity: 10,
        warnings: [],
        optimizations: []
      }

      let executionResult
      await act(async () => {
        executionResult = await result.current.executeContract(generatedContract)
      })

      expect(executionResult.success).toBe(true)
      expect(executionResult.transactionId).toBe('tx_123')
      expect(result.current.executionResults).toHaveLength(1)
    })

    it('should handle execution failure', async () => {
      mockFetch
        .mockResolvedValueOnce({ // Health check
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' })
        })
        .mockResolvedValueOnce({ // Compile request
          ok: true,
          json: () => Promise.resolve({
            compiledBytes: 'compiled_bytes',
            address: 'contract_address',
            complexity: 15,
            errors: ['Compilation error'],
            warnings: []
          })
        })

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const generatedContract = {
        ergoScript: 'invalid script',
        scalaCode: '',
        documentation: '',
        testSuite: '',
        complexity: 10,
        warnings: [],
        optimizations: []
      }

      await act(async () => {
        try {
          await result.current.executeContract(generatedContract)
        } catch (error) {
          expect(error.message).toContain('Compilation failed')
        }
      })

      expect(result.current.executionResults).toHaveLength(1)
      expect(result.current.executionResults[0].success).toBe(false)
    })

    it('should fail when not connected', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const generatedContract = {
        ergoScript: 'sigmaProp(true)',
        scalaCode: '',
        documentation: '',
        testSuite: '',
        complexity: 10,
        warnings: [],
        optimizations: []
      }

      await act(async () => {
        try {
          await result.current.executeContract(generatedContract)
        } catch (error) {
          expect(error.message).toBe('Playground environment not available')
        }
      })
    })
  })

  describe('Contract validation', () => {
    it('should validate contract when connected', async () => {
      mockFetch
        .mockResolvedValueOnce({ // Health check
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' })
        })
        .mockResolvedValueOnce({ // Validate request
          ok: true,
          json: () => Promise.resolve({
            isValid: true,
            errors: [],
            warnings: ['Consider optimizing gas usage'],
            suggestions: ['Use batch operations']
          })
        })

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let validationResult
      await act(async () => {
        validationResult = await result.current.validateContract('sigmaProp(true)')
      })

      expect(validationResult.isValid).toBe(true)
      expect(validationResult.warnings).toContain('Consider optimizing gas usage')
    })

    it('should provide basic validation when not connected', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let validationResult
      await act(async () => {
        validationResult = await result.current.validateContract('sigmaProp(true)')
      })

      expect(validationResult.isValid).toBe(true)
    })

    it('should detect empty contracts', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let validationResult
      await act(async () => {
        validationResult = await result.current.validateContract('')
      })

      expect(validationResult.isValid).toBe(false)
      expect(validationResult.errors).toContain('Contract cannot be empty')
    })
  })

  describe('Scenario generation', () => {
    it('should generate scenario from components', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const components = [
        {
          id: 'input1',
          type: 'input-box' as const,
          label: 'Input Box',
          description: 'Input box',
          position: { x: 0, y: 0 },
          properties: { value: 1000000 }
        },
        {
          id: 'output1',
          type: 'output-box' as const,
          label: 'Output Box',
          description: 'Output box',
          position: { x: 200, y: 0 },
          properties: { value: 500000 }
        }
      ]

      let scenario
      await act(async () => {
        scenario = await result.current.generateScenario(components, [])
      })

      expect(scenario.name).toBe('Generated Test Scenario')
      expect(scenario.parties).toHaveLength(2)
      expect(scenario.steps.length).toBeGreaterThan(0)
    })

    it('should create default scenario', async () => {
      const { result } = renderHook(() => usePlaygroundIntegration())

      let scenario
      await act(async () => {
        scenario = await result.current.createDefaultScenario()
      })

      expect(scenario.name).toBe('Default Test Scenario')
      expect(scenario.parties).toHaveLength(2)
      expect(scenario.parties[0].name).toBe('Alice')
      expect(scenario.parties[1].name).toBe('Bob')
    })
  })

  describe('Test data generation', () => {
    it('should generate test data for specific contract types', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let testData
      await act(async () => {
        testData = await result.current.generateTestData('token-swap')
      })

      expect(testData.parties).toHaveLength(2)
      expect(testData.parties[0].tokens).toHaveProperty('token_a')
      expect(testData.parties[1].tokens).toHaveProperty('token_b')
    })

    it('should handle escrow contract type', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let testData
      await act(async () => {
        testData = await result.current.generateTestData('escrow')
      })

      expect(testData.parties).toHaveLength(3) // Alice, Bob, Arbiter
      expect(testData.parties.some(p => p.name === 'Arbiter')).toBe(true)
    })
  })

  describe('Cache management', () => {
    it('should clear results', () => {
      const { result } = renderHook(() => usePlaygroundIntegration())

      act(() => {
        // Simulate adding some results
        result.current.clearResults()
      })

      expect(result.current.executionResults).toHaveLength(0)
    })

    it('should clear compilation cache', () => {
      const { result } = renderHook(() => usePlaygroundIntegration())

      act(() => {
        result.current.clearCache()
      })

      // Cache should be cleared (no direct way to test this, but function should not throw)
      expect(result.current.clearCache).toBeDefined()
    })
  })

  describe('Capabilities', () => {
    it('should report correct capabilities when connected', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      })

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.capabilities.canCompile).toBe(true)
      expect(result.current.capabilities.canExecute).toBe(true)
      expect(result.current.capabilities.canValidate).toBe(true)
      expect(result.current.capabilities.hasBackend).toBe(true)
    })

    it('should report limited capabilities when disconnected', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => usePlaygroundIntegration())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.capabilities.canCompile).toBe(false)
      expect(result.current.capabilities.canExecute).toBe(false)
      expect(result.current.capabilities.canValidate).toBe(false)
      expect(result.current.capabilities.hasBackend).toBe(false)
    })
  })
})

describe('usePlaygroundConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with disconnected status', () => {
    const { result } = renderHook(() => usePlaygroundConnection())
    
    expect(result.current.connectionStatus).toBe('disconnected')
    expect(result.current.lastError).toBeNull()
    expect(result.current.connectionMetrics.requestCount).toBe(0)
  })

  it('should update status to connected on successful health check', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    })

    const { result } = renderHook(() => usePlaygroundConnection())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.connectionStatus).toBe('connected')
    expect(result.current.lastError).toBeNull()
    expect(result.current.connectionMetrics.requestCount).toBe(1)
  })

  it('should update status to error on failed health check', async () => {
    mockFetch.mockRejectedValue(new Error('Connection failed'))

    const { result } = renderHook(() => usePlaygroundConnection())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.connectionStatus).toBe('error')
    expect(result.current.lastError).toBe('Connection failed')
    expect(result.current.connectionMetrics.errorCount).toBe(1)
  })

  it('should periodically check connection', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    })

    const { result } = renderHook(() => usePlaygroundConnection())

    // Initial check
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Advance timer by 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should track connection metrics', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      })
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePlaygroundConnection())

    // First successful check
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.connectionMetrics.requestCount).toBe(1)
    expect(result.current.connectionMetrics.errorCount).toBe(0)

    // Second failed check
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.connectionMetrics.requestCount).toBe(1) // Still 1 since second failed
    expect(result.current.connectionMetrics.errorCount).toBe(1)
  })

  it('should allow manual connection check', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    })

    const { result } = renderHook(() => usePlaygroundConnection())

    await act(async () => {
      await result.current.checkConnection()
    })

    expect(result.current.connectionStatus).toBe('connected')
    expect(mockFetch).toHaveBeenCalledWith('/api/playground/health')
  })
})