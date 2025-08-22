import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useContractDesigner } from '../useContractDesigner'

// Mock the code generation utilities
vi.mock('../../utils/codeGeneration', () => ({
  generateErgoScript: vi.fn().mockResolvedValue({
    ergoScript: 'generated contract code',
    scalaCode: 'generated scala code',
    documentation: 'generated docs',
    testSuite: 'generated tests',
    complexity: 10,
    warnings: [],
    optimizations: []
  }),
  validateContractDesign: vi.fn().mockReturnValue([])
}))

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('useContractDesigner', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial state', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useContractDesigner())

      expect(result.current.components).toEqual([])
      expect(result.current.connections).toEqual([])
      expect(result.current.selectedComponent).toBeNull()
      expect(result.current.isDragging).toBe(false)
      expect(result.current.generatedCode).toBe('')
      expect(result.current.validationErrors).toEqual([])
      expect(result.current.isGenerating).toBe(false)
    })

    it('should initialize metadata with defaults', () => {
      const { result } = renderHook(() => useContractDesigner())

      expect(result.current.metadata.contractName).toBe('Untitled Contract')
      expect(result.current.metadata.version).toBe('1.0.0')
      expect(result.current.metadata.description).toBe('')
      expect(result.current.metadata.tags).toEqual([])
    })

    it('should initialize with empty history', () => {
      const { result } = renderHook(() => useContractDesigner())

      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
    })
  })

  describe('Component operations', () => {
    it('should add a component', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
      })

      expect(result.current.components).toHaveLength(1)
      expect(result.current.components[0].type).toBe('input-box')
      expect(result.current.components[0].position).toEqual({ x: 100, y: 200 })
      expect(result.current.components[0].label).toBe('Input Box')
      expect(result.current.selectedComponent).toBe(result.current.components[0].id)
    })

    it('should remove a component', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
      })

      const componentId = result.current.components[0].id

      act(() => {
        result.current.removeComponent(componentId)
      })

      expect(result.current.components).toHaveLength(0)
      expect(result.current.selectedComponent).toBeNull()
    })

    it('should update a component', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
      })

      const componentId = result.current.components[0].id

      act(() => {
        result.current.updateComponent(componentId, {
          label: 'Updated Label',
          properties: { value: 5000000 }
        })
      })

      expect(result.current.components[0].label).toBe('Updated Label')
      expect(result.current.components[0].properties.value).toBe(5000000)
    })

    it('should select a component', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
      })

      const componentId = result.current.components[0].id

      act(() => {
        result.current.selectComponent(null)
      })

      expect(result.current.selectedComponent).toBeNull()

      act(() => {
        result.current.selectComponent(componentId)
      })

      expect(result.current.selectedComponent).toBe(componentId)
    })

    it('should generate unique component IDs', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
        result.current.addComponent('output-box', { x: 300, y: 200 })
      })

      expect(result.current.components[0].id).not.toBe(result.current.components[1].id)
    })
  })

  describe('Connection operations', () => {
    it('should add a connection', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
        result.current.addComponent('output-box', { x: 300, y: 200 })
      })

      const [comp1, comp2] = result.current.components

      act(() => {
        result.current.addConnection({
          sourceId: comp1.id,
          targetId: comp2.id,
          sourcePort: 'value-output',
          targetPort: 'value-input',
          type: 'data'
        })
      })

      expect(result.current.connections).toHaveLength(1)
      expect(result.current.connections[0].sourceId).toBe(comp1.id)
      expect(result.current.connections[0].targetId).toBe(comp2.id)
    })

    it('should remove a connection', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
        result.current.addComponent('output-box', { x: 300, y: 200 })
      })

      const [comp1, comp2] = result.current.components

      act(() => {
        result.current.addConnection({
          sourceId: comp1.id,
          targetId: comp2.id,
          sourcePort: 'value-output',
          targetPort: 'value-input',
          type: 'data'
        })
      })

      const connectionId = result.current.connections[0].id

      act(() => {
        result.current.removeConnection(connectionId)
      })

      expect(result.current.connections).toHaveLength(0)
    })

    it('should prevent duplicate connections', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
        result.current.addComponent('output-box', { x: 300, y: 200 })
      })

      const [comp1, comp2] = result.current.components

      const connectionData = {
        sourceId: comp1.id,
        targetId: comp2.id,
        sourcePort: 'value-output',
        targetPort: 'value-input',
        type: 'data' as const
      }

      act(() => {
        result.current.addConnection(connectionData)
        result.current.addConnection(connectionData) // Try to add duplicate
      })

      expect(result.current.connections).toHaveLength(1)
    })

    it('should remove connections when component is removed', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
        result.current.addComponent('output-box', { x: 300, y: 200 })
      })

      const [comp1, comp2] = result.current.components

      act(() => {
        result.current.addConnection({
          sourceId: comp1.id,
          targetId: comp2.id,
          sourcePort: 'value-output',
          targetPort: 'value-input',
          type: 'data'
        })
      })

      expect(result.current.connections).toHaveLength(1)

      act(() => {
        result.current.removeComponent(comp1.id)
      })

      expect(result.current.connections).toHaveLength(0)
    })
  })

  describe('Canvas operations', () => {
    it('should update canvas offset', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.updateCanvas({ offset: { x: 50, y: 100 } })
      })

      expect(result.current.canvasOffset).toEqual({ x: 50, y: 100 })
    })

    it('should update zoom level', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.updateCanvas({ zoom: 1.5 })
      })

      expect(result.current.zoomLevel).toBe(1.5)
    })

    it('should clear canvas', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
        result.current.addComponent('output-box', { x: 300, y: 200 })
      })

      const [comp1, comp2] = result.current.components

      act(() => {
        result.current.addConnection({
          sourceId: comp1.id,
          targetId: comp2.id,
          sourcePort: 'value-output',
          targetPort: 'value-input',
          type: 'data'
        })
      })

      act(() => {
        result.current.clearCanvas()
      })

      expect(result.current.components).toHaveLength(0)
      expect(result.current.connections).toHaveLength(0)
      expect(result.current.selectedComponent).toBeNull()
      expect(result.current.generatedCode).toBe('')
      expect(result.current.validationErrors).toEqual([])
    })
  })

  describe('History operations', () => {
    it('should track history for component operations', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
      })

      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)
    })

    it('should undo component addition', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
      })

      expect(result.current.components).toHaveLength(1)

      act(() => {
        result.current.undo()
      })

      expect(result.current.components).toHaveLength(0)
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })

    it('should redo component addition', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
        result.current.undo()
      })

      expect(result.current.components).toHaveLength(0)

      act(() => {
        result.current.redo()
      })

      expect(result.current.components).toHaveLength(1)
      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)
    })

    it('should clear future history when new action is performed', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
        result.current.undo()
      })

      expect(result.current.canRedo).toBe(true)

      act(() => {
        result.current.addComponent('output-box', { x: 300, y: 200 })
      })

      expect(result.current.canRedo).toBe(false)
    })

    it('should not undo when no history exists', () => {
      const { result } = renderHook(() => useContractDesigner())

      const initialState = {
        components: result.current.components,
        canUndo: result.current.canUndo
      }

      act(() => {
        result.current.undo()
      })

      expect(result.current.components).toEqual(initialState.components)
      expect(result.current.canUndo).toBe(initialState.canUndo)
    })
  })

  describe('Metadata operations', () => {
    it('should update metadata', () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.updateMetadata({
          contractName: 'My Contract',
          description: 'A test contract',
          tags: ['test', 'example']
        })
      })

      expect(result.current.metadata.contractName).toBe('My Contract')
      expect(result.current.metadata.description).toBe('A test contract')
      expect(result.current.metadata.tags).toEqual(['test', 'example'])
      expect(result.current.hasUnsavedChanges).toBe(true)
    })
  })

  describe('Test scenarios', () => {
    it('should add test scenario', () => {
      const { result } = renderHook(() => useContractDesigner())

      const scenario = {
        name: 'Test Scenario 1',
        description: 'Basic test scenario',
        inputs: [],
        expectedOutputs: [],
        assertions: []
      }

      act(() => {
        result.current.addTestScenario(scenario)
      })

      expect(result.current.testScenarios).toHaveLength(1)
      expect(result.current.testScenarios[0].name).toBe('Test Scenario 1')
      expect(result.current.testScenarios[0].status).toBe('pending')
    })

    it('should remove test scenario', () => {
      const { result } = renderHook(() => useContractDesigner())

      const scenario = {
        name: 'Test Scenario 1',
        description: 'Basic test scenario',
        inputs: [],
        expectedOutputs: [],
        assertions: []
      }

      act(() => {
        result.current.addTestScenario(scenario)
      })

      const scenarioId = result.current.testScenarios[0].id

      act(() => {
        result.current.removeTestScenario(scenarioId)
      })

      expect(result.current.testScenarios).toHaveLength(0)
    })

    it('should run test scenario', async () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useContractDesigner())

      const scenario = {
        name: 'Test Scenario 1',
        description: 'Basic test scenario',
        inputs: [],
        expectedOutputs: [],
        assertions: []
      }

      act(() => {
        result.current.addTestScenario(scenario)
      })

      const scenarioId = result.current.testScenarios[0].id

      act(() => {
        result.current.runTestScenario(scenarioId)
      })

      expect(result.current.isTestingContract).toBe(true)
      expect(result.current.testScenarios[0].status).toBe('running')

      // Fast-forward timers to complete the test
      await act(async () => {
        vi.advanceTimersByTime(3000)
        await Promise.resolve() // Allow promises to resolve
      })

      expect(result.current.isTestingContract).toBe(false)
      expect(['passed', 'failed']).toContain(result.current.testScenarios[0].status)

      vi.useRealTimers()
    })
  })

  describe('Computed values', () => {
    it('should calculate hasValidContract correctly', () => {
      const { result } = renderHook(() => useContractDesigner())

      expect(result.current.hasValidContract).toBe(false)

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
      })

      expect(result.current.hasValidContract).toBe(true)
    })

    it('should calculate contract complexity', () => {
      const { result } = renderHook(() => useContractDesigner())

      const initialComplexity = result.current.contractComplexity

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
        result.current.addComponent('custom-logic', { x: 300, y: 200 })
      })

      expect(result.current.contractComplexity).toBeGreaterThan(initialComplexity)
    })
  })

  describe('Persistence', () => {
    it('should save contract to localStorage', async () => {
      const { result } = renderHook(() => useContractDesigner())

      act(() => {
        result.current.addComponent('input-box', { x: 100, y: 200 })
      })

      await act(async () => {
        const saveResult = await result.current.saveContract()
        expect(saveResult.success).toBe(true)
      })

      expect(result.current.hasUnsavedChanges).toBe(false)
      expect(result.current.lastSaved).toBeInstanceOf(Date)
    })

    it('should load contract from data', async () => {
      const { result } = renderHook(() => useContractDesigner())

      const contractData = {
        components: [{
          id: 'test-component',
          type: 'input-box' as const,
          label: 'Test Input',
          description: 'Test description',
          position: { x: 100, y: 200 },
          properties: { value: 1000000 }
        }],
        connections: [],
        metadata: {
          contractName: 'Loaded Contract',
          version: '2.0.0',
          description: 'Loaded from storage',
          tags: ['loaded']
        }
      }

      await act(async () => {
        const loadResult = await result.current.loadContract(contractData)
        expect(loadResult.success).toBe(true)
      })

      expect(result.current.components).toHaveLength(1)
      expect(result.current.components[0].id).toBe('test-component')
      expect(result.current.metadata.contractName).toBe('Loaded Contract')
      expect(result.current.hasUnsavedChanges).toBe(false)
    })
  })
})

describe('Helper functions', () => {
  it('should generate appropriate default labels', () => {
    const { result } = renderHook(() => useContractDesigner())

    act(() => {
      result.current.addComponent('input-box', { x: 0, y: 0 })
      result.current.addComponent('signature-check', { x: 100, y: 0 })
      result.current.addComponent('custom-logic', { x: 200, y: 0 })
    })

    expect(result.current.components[0].label).toBe('Input Box')
    expect(result.current.components[1].label).toBe('Signature Check')
    expect(result.current.components[2].label).toBe('Custom Logic')
  })

  it('should assign appropriate categories', () => {
    const { result } = renderHook(() => useContractDesigner())

    act(() => {
      result.current.addComponent('input-box', { x: 0, y: 0 })
      result.current.addComponent('token-operation', { x: 100, y: 0 })
      result.current.addComponent('validation-rule', { x: 200, y: 0 })
    })

    expect(result.current.components[0].category).toBe('input')
    expect(result.current.components[1].category).toBe('token')
    expect(result.current.components[2].category).toBe('validation')
  })
})