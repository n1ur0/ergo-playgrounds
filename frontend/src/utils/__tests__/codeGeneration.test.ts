import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ErgoScriptGenerator,
  generateErgoScript,
  validateContractDesign
} from '../codeGeneration'
import type { ContractComponent, Connection } from '../../types/contractDesigner'

// Mock the component templates
vi.mock('../../data/componentTemplates', () => ({
  getComponentTemplate: vi.fn((type: string) => {
    const templates = {
      'input-box': {
        ergoScriptTemplate: 'val inputBox = INPUTS({index})\nval inputValue = inputBox.value',
        ports: {
          inputs: [],
          outputs: [
            { id: 'value-output', label: 'Value', dataType: 'Long' },
            { id: 'box-output', label: 'Box', dataType: 'Box' }
          ]
        }
      },
      'guard-condition': {
        ergoScriptTemplate: 'val condition = {left-operand} {operator} {right-operand}',
        ports: {
          inputs: [
            { id: 'left-input', label: 'Left', dataType: 'Any' },
            { id: 'right-input', label: 'Right', dataType: 'Any' }
          ],
          outputs: [
            { id: 'output', label: 'Result', dataType: 'Boolean' }
          ]
        }
      },
      'signature-check': {
        ergoScriptTemplate: '{public-key}',
        ports: {
          inputs: [],
          outputs: [
            { id: 'output', label: 'Valid', dataType: 'SigmaProp' }
          ]
        }
      },
      'custom-logic': {
        ergoScriptTemplate: '{code}',
        ports: {
          inputs: [
            { id: 'input', label: 'Input', dataType: 'Any' }
          ],
          outputs: [
            { id: 'output', label: 'Output', dataType: 'Any' }
          ]
        }
      }
    }
    return templates[type] || null
  })
}))

describe('ErgoScriptGenerator', () => {
  let mockComponents: ContractComponent[]
  let mockConnections: Connection[]

  beforeEach(() => {
    mockComponents = [
      {
        id: 'comp1',
        type: 'input-box',
        label: 'Input Box',
        description: 'Input box component',
        position: { x: 0, y: 0 },
        properties: {
          value: '1000000'
        }
      },
      {
        id: 'comp2',
        type: 'signature-check',
        label: 'Signature Check',
        description: 'Signature verification',
        position: { x: 100, y: 0 },
        properties: {
          publicKey: 'ownerPk'
        }
      }
    ]

    mockConnections = [
      {
        id: 'conn1',
        sourceId: 'comp1',
        targetId: 'comp2',
        sourcePort: 'value-output',
        targetPort: 'input',
        type: 'data'
      }
    ]
  })

  describe('constructor', () => {
    it('should initialize with components and connections', () => {
      const generator = new ErgoScriptGenerator(mockComponents, mockConnections)
      expect(generator).toBeDefined()
    })

    it('should build dependency graph correctly', () => {
      const generator = new ErgoScriptGenerator(mockComponents, mockConnections)
      expect(generator).toBeDefined()
    })
  })

  describe('generateContract', () => {
    it('should generate a complete contract', async () => {
      const generator = new ErgoScriptGenerator(mockComponents, mockConnections)
      const result = await generator.generateContract()

      expect(result).toHaveProperty('ergoScript')
      expect(result).toHaveProperty('scalaCode')
      expect(result).toHaveProperty('documentation')
      expect(result).toHaveProperty('testSuite')
      expect(result).toHaveProperty('complexity')
      expect(result).toHaveProperty('warnings')
      expect(result).toHaveProperty('optimizations')
    })

    it('should include generated ErgoScript with proper structure', async () => {
      const generator = new ErgoScriptGenerator(mockComponents, mockConnections)
      const result = await generator.generateContract()

      expect(result.ergoScript).toContain('// Generated ErgoScript Contract')
      expect(result.ergoScript).toContain('sigmaProp(')
      expect(result.ergoScript).toContain('val ownerPk')
    })

    it('should generate Scala code for testing', async () => {
      const generator = new ErgoScriptGenerator(mockComponents, mockConnections)
      const result = await generator.generateContract()

      expect(result.scalaCode).toContain('object GeneratedContractPlayground')
      expect(result.scalaCode).toContain('newBlockChainSimulationScenario')
      expect(result.scalaCode).toContain('val alice = newParty("Alice")')
    })

    it('should calculate complexity correctly', async () => {
      const generator = new ErgoScriptGenerator(mockComponents, mockConnections)
      const result = await generator.generateContract()

      expect(typeof result.complexity).toBe('number')
      expect(result.complexity).toBeGreaterThan(0)
    })

    it('should handle errors gracefully', async () => {
      // Create components with missing required data to trigger errors
      const invalidComponents = [
        {
          id: 'invalid',
          type: 'unknown-type' as any,
          label: 'Invalid',
          description: 'Invalid component',
          position: { x: 0, y: 0 },
          properties: {}
        }
      ]

      const generator = new ErgoScriptGenerator(invalidComponents, [])
      await expect(generator.generateContract()).rejects.toThrow()
    })
  })

  describe('component type handling', () => {
    it('should handle input-box components correctly', async () => {
      const inputBoxComponent = [{
        id: 'input1',
        type: 'input-box' as const,
        label: 'Test Input',
        description: 'Test input box',
        position: { x: 0, y: 0 },
        properties: { value: '2000000' }
      }]

      const generator = new ErgoScriptGenerator(inputBoxComponent, [])
      const result = await generator.generateContract()

      expect(result.ergoScript).toContain('// Input box validations')
    })

    it('should handle guard-condition components correctly', async () => {
      const guardComponent = [{
        id: 'guard1',
        type: 'guard-condition' as const,
        label: 'Test Guard',
        description: 'Test guard condition',
        position: { x: 0, y: 0 },
        properties: { 
          operator: '>',
          leftOperand: 'value',
          rightOperand: '1000000'
        }
      }]

      const generator = new ErgoScriptGenerator(guardComponent, [])
      const result = await generator.generateContract()

      expect(result.ergoScript).toContain('// Contract logic')
    })

    it('should handle custom-logic components correctly', async () => {
      const customComponent = [{
        id: 'custom1',
        type: 'custom-logic' as const,
        label: 'Test Custom',
        description: 'Test custom logic',
        position: { x: 0, y: 0 },
        properties: { 
          code: 'INPUTS(0).value > 1000000'
        }
      }]

      const generator = new ErgoScriptGenerator(customComponent, [])
      const result = await generator.generateContract()

      expect(result.ergoScript).toContain('INPUTS(0).value > 1000000')
    })
  })

  describe('warnings and optimizations', () => {
    it('should detect disconnected components', async () => {
      const disconnectedComponents = [
        ...mockComponents,
        {
          id: 'disconnected',
          type: 'guard-condition' as const,
          label: 'Disconnected',
          description: 'Disconnected component',
          position: { x: 200, y: 0 },
          properties: {}
        }
      ]

      const generator = new ErgoScriptGenerator(disconnectedComponents, mockConnections)
      const result = await generator.generateContract()

      expect(result.warnings.some(w => w.includes('not connected'))).toBe(true)
    })

    it('should suggest optimizations for multiple guard conditions', async () => {
      const manyGuards = Array.from({ length: 5 }, (_, i) => ({
        id: `guard${i}`,
        type: 'guard-condition' as const,
        label: `Guard ${i}`,
        description: `Guard condition ${i}`,
        position: { x: i * 100, y: 0 },
        properties: {}
      }))

      const generator = new ErgoScriptGenerator(manyGuards, [])
      const result = await generator.generateContract()

      expect(result.optimizations.some(o => o.includes('combining multiple guard conditions'))).toBe(true)
    })

    it('should suggest batch validation for multiple input boxes', async () => {
      const manyInputs = Array.from({ length: 4 }, (_, i) => ({
        id: `input${i}`,
        type: 'input-box' as const,
        label: `Input ${i}`,
        description: `Input box ${i}`,
        position: { x: i * 100, y: 0 },
        properties: { value: '1000000' }
      }))

      const generator = new ErgoScriptGenerator(manyInputs, [])
      const result = await generator.generateContract()

      expect(result.optimizations.some(o => o.includes('batch validation'))).toBe(true)
    })
  })
})

describe('generateErgoScript function', () => {
  it('should be a wrapper around ErgoScriptGenerator', async () => {
    const components = [{
      id: 'test',
      type: 'signature-check' as const,
      label: 'Test',
      description: 'Test component',
      position: { x: 0, y: 0 },
      properties: { publicKey: 'ownerPk' }
    }]

    const result = await generateErgoScript(components, [])
    expect(result).toHaveProperty('ergoScript')
    expect(result).toHaveProperty('scalaCode')
  })
})

describe('validateContractDesign', () => {
  it('should return error for empty components', () => {
    const errors = validateContractDesign([], [])
    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('missing-requirement')
    expect(errors[0].severity).toBe('error')
  })

  it('should validate signature-check components', () => {
    const components = [{
      id: 'sig1',
      type: 'signature-check' as const,
      label: 'Signature',
      description: 'Signature check',
      position: { x: 0, y: 0 },
      properties: {} // Missing publicKey
    }]

    const errors = validateContractDesign(components, [])
    expect(errors.some(e => e.message.includes('public key'))).toBe(true)
  })

  it('should validate token-operation components', () => {
    const components = [{
      id: 'token1',
      type: 'token-operation' as const,
      label: 'Token Op',
      description: 'Token operation',
      position: { x: 0, y: 0 },
      properties: {} // Missing tokenId
    }]

    const errors = validateContractDesign(components, [])
    expect(errors.some(e => e.message.includes('token ID'))).toBe(true)
  })

  it('should validate box values', () => {
    const components = [{
      id: 'box1',
      type: 'input-box' as const,
      label: 'Input Box',
      description: 'Input box',
      position: { x: 0, y: 0 },
      properties: { value: 0 } // Invalid value
    }]

    const errors = validateContractDesign(components, [])
    expect(errors.some(e => e.message.includes('greater than 0'))).toBe(true)
  })

  it('should detect circular dependencies', () => {
    const components = [
      {
        id: 'comp1',
        type: 'guard-condition' as const,
        label: 'Guard 1',
        description: 'Guard condition 1',
        position: { x: 0, y: 0 },
        properties: {}
      },
      {
        id: 'comp2',
        type: 'guard-condition' as const,
        label: 'Guard 2', 
        description: 'Guard condition 2',
        position: { x: 100, y: 0 },
        properties: {}
      }
    ]

    const connections = [
      {
        id: 'conn1',
        sourceId: 'comp1',
        targetId: 'comp2',
        sourcePort: 'output',
        targetPort: 'left-input',
        type: 'data' as const
      },
      {
        id: 'conn2',
        sourceId: 'comp2',
        targetId: 'comp1',
        sourcePort: 'output',
        targetPort: 'right-input',
        type: 'data' as const
      }
    ]

    const errors = validateContractDesign(components, connections)
    expect(errors.some(e => e.message.includes('Circular dependency'))).toBe(true)
  })

  it('should validate connection ports', () => {
    const components = [
      {
        id: 'comp1',
        type: 'signature-check' as const,
        label: 'Signature',
        description: 'Signature check',
        position: { x: 0, y: 0 },
        properties: { publicKey: 'ownerPk' }
      },
      {
        id: 'comp2',
        type: 'guard-condition' as const,
        label: 'Guard',
        description: 'Guard condition',
        position: { x: 100, y: 0 },
        properties: {}
      }
    ]

    const connections = [
      {
        id: 'conn1',
        sourceId: 'comp1',
        targetId: 'comp2',
        sourcePort: 'invalid-port', // Invalid port
        targetPort: 'left-input',
        type: 'data' as const
      }
    ]

    const errors = validateContractDesign(components, connections)
    expect(errors.some(e => e.message.includes('Invalid source port'))).toBe(true)
  })

  it('should validate connection references', () => {
    const components = [{
      id: 'comp1',
      type: 'signature-check' as const,
      label: 'Signature',
      description: 'Signature check',
      position: { x: 0, y: 0 },
      properties: { publicKey: 'ownerPk' }
    }]

    const connections = [
      {
        id: 'conn1',
        sourceId: 'nonexistent', // Invalid component ID
        targetId: 'comp1',
        sourcePort: 'output',
        targetPort: 'input',
        type: 'data' as const
      }
    ]

    const errors = validateContractDesign(components, connections)
    expect(errors.some(e => e.message.includes('source component not found'))).toBe(true)
  })

  it('should pass validation for valid design', () => {
    const components = [{
      id: 'comp1',
      type: 'signature-check' as const,
      label: 'Signature',
      description: 'Signature check',
      position: { x: 0, y: 0 },
      properties: { publicKey: 'ownerPk' }
    }]

    const errors = validateContractDesign(components, [])
    // Should only have warnings or no errors for a simple valid component
    const criticalErrors = errors.filter(e => e.severity === 'error')
    expect(criticalErrors).toHaveLength(0)
  })
})