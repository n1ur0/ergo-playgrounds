import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ComponentPropertySystem,
  propertySystem,
  validateAllComponents,
  getComponentDefaults,
  isPropertyRequired,
  getPropertyType
} from '../propertySystem'
import type { ContractComponent, ComponentType } from '../../types/contractDesigner'

// Mock the component templates  
vi.mock('../../data/componentTemplates', () => ({
  getComponentTemplate: vi.fn()
}))

describe('ComponentPropertySystem', () => {
  let system: ComponentPropertySystem

  beforeEach(() => {
    system = new ComponentPropertySystem()
  })

  describe('getPropertySchema', () => {
    it('should return schema for input-box component', () => {
      const schema = system.getPropertySchema('input-box')
      expect(schema).toBeDefined()
      expect(schema.length).toBeGreaterThan(0)
      expect(schema.some(prop => prop.key === 'value')).toBe(true)
    })

    it('should return schema for guard-condition component', () => {
      const schema = system.getPropertySchema('guard-condition')
      expect(schema).toBeDefined()
      expect(schema.some(prop => prop.key === 'operator')).toBe(true)
      expect(schema.some(prop => prop.key === 'leftOperand')).toBe(true)
      expect(schema.some(prop => prop.key === 'rightOperand')).toBe(true)
    })

    it('should return schema for signature-check component', () => {
      const schema = system.getPropertySchema('signature-check')
      expect(schema).toBeDefined()
      expect(schema.some(prop => prop.key === 'publicKey')).toBe(true)
    })

    it('should return empty array for unknown component type', () => {
      const schema = system.getPropertySchema('unknown-type' as ComponentType)
      expect(schema).toEqual([])
    })
  })

  describe('getPropertyDefinition', () => {
    it('should return correct property definition', () => {
      const definition = system.getPropertyDefinition('input-box', 'value')
      expect(definition).toBeDefined()
      expect(definition?.key).toBe('value')
      expect(definition?.type).toBe('number')
      expect(definition?.required).toBe(true)
    })

    it('should return undefined for non-existent property', () => {
      const definition = system.getPropertyDefinition('input-box', 'nonexistent')
      expect(definition).toBeUndefined()
    })
  })

  describe('validateProperty', () => {
    const mockComponent: ContractComponent = {
      id: 'test-comp',
      type: 'input-box',
      label: 'Test Component',
      description: 'Test description',
      position: { x: 0, y: 0 },
      properties: {}
    }

    it('should validate required property successfully', () => {
      const result = system.validateProperty('input-box', 'value', 1000000, mockComponent)
      expect(result.isValid).toBe(true)
    })

    it('should fail validation for missing required property', () => {
      const result = system.validateProperty('input-box', 'value', '', mockComponent)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should validate number type correctly', () => {
      const result = system.validateProperty('input-box', 'value', 'not-a-number', mockComponent)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('must be a number')
    })

    it('should validate string type correctly', () => {
      const result = system.validateProperty('signature-check', 'publicKey', 'ownerPk', mockComponent)
      expect(result.isValid).toBe(true)
    })

    it('should validate boolean type correctly', () => {
      const result = system.validateProperty('height-check', 'relative', true, mockComponent)
      expect(result.isValid).toBe(true)
    })

    it('should validate array type correctly', () => {
      const result = system.validateProperty('input-box', 'tokens', [], mockComponent)
      expect(result.isValid).toBe(true)
    })

    it('should fail array validation for non-array', () => {
      const result = system.validateProperty('input-box', 'tokens', 'not-array', mockComponent)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('must be an array')
    })

    it('should validate select options correctly', () => {
      const result = system.validateProperty('guard-condition', 'operator', '==', mockComponent)
      expect(result.isValid).toBe(true)
    })

    it('should fail select validation for invalid option', () => {
      const result = system.validateProperty('guard-condition', 'operator', 'invalid-op', mockComponent)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('must be one of')
    })

    it('should validate number ranges correctly', () => {
      // Test minimum value validation
      const minResult = system.validateProperty('input-box', 'value', -1, mockComponent)
      expect(minResult.isValid).toBe(false)
      expect(minResult.error).toContain('at least')
    })

    it('should handle custom validation functions', () => {
      // Test signature check custom validation
      const validHexResult = system.validateProperty('signature-check', 'publicKey', '0'.repeat(66), mockComponent)
      expect(validHexResult.isValid).toBe(true)

      const invalidHexResult = system.validateProperty('signature-check', 'publicKey', 'invalid-key', mockComponent)
      expect(invalidHexResult.isValid).toBe(false)
    })

    it('should validate token ID format', () => {
      const validTokenId = 'a'.repeat(64)
      const result = system.validateProperty('token-operation', 'tokenId', validTokenId, mockComponent)
      expect(result.isValid).toBe(true)

      const invalidResult = system.validateProperty('token-operation', 'tokenId', 'short', mockComponent)
      expect(invalidResult.isValid).toBe(false)
    })

    it('should skip validation for non-required empty values', () => {
      const result = system.validateProperty('signature-check', 'message', '', mockComponent)
      expect(result.isValid).toBe(true)
    })
  })

  describe('validateComponent', () => {
    it('should validate complete component successfully', () => {
      const validComponent: ContractComponent = {
        id: 'test-comp',
        type: 'input-box',
        label: 'Test Component',
        description: 'Test description',
        position: { x: 0, y: 0 },
        properties: {
          value: 1000000,
          tokens: [],
          registers: []
        }
      }

      const errors = system.validateComponent(validComponent)
      expect(errors).toHaveLength(0)
    })

    it('should detect missing required properties', () => {
      const invalidComponent: ContractComponent = {
        id: 'test-comp',
        type: 'signature-check',
        label: 'Test Component',
        description: 'Test description',
        position: { x: 0, y: 0 },
        properties: {} // Missing required publicKey
      }

      const errors = system.validateComponent(invalidComponent)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(error => error.message.includes('public key'))).toBe(true)
    })

    it('should handle conditional properties correctly', () => {
      const componentWithConditional: ContractComponent = {
        id: 'test-comp',
        type: 'output-box',
        label: 'Test Component',
        description: 'Test description',
        position: { x: 0, y: 0 },
        properties: {
          value: 1000000,
          script: 'custom' // This should make customScript visible
          // Missing customScript should cause validation error
        }
      }

      const errors = system.validateComponent(componentWithConditional)
      // Should have validation error for missing customScript since script is 'custom'
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should skip validation for hidden conditional properties', () => {
      const componentWithHiddenConditional: ContractComponent = {
        id: 'test-comp',
        type: 'output-box',
        label: 'Test Component',
        description: 'Test description',
        position: { x: 0, y: 0 },
        properties: {
          value: 1000000,
          script: 'sigmaProp(true)' // This should hide customScript
          // customScript is not provided but should not cause error
        }
      }

      const errors = system.validateComponent(componentWithHiddenConditional)
      // Should not have validation error for customScript since it's hidden
      expect(errors.every(error => !error.message.includes('Custom Script'))).toBe(true)
    })
  })

  describe('getDefaultProperties', () => {
    it('should return default properties for input-box', () => {
      const defaults = system.getDefaultProperties('input-box')
      expect(defaults.value).toBe(1000000)
      expect(defaults.tokens).toEqual([])
      expect(defaults.registers).toEqual([])
    })

    it('should return default properties for guard-condition', () => {
      const defaults = system.getDefaultProperties('guard-condition')
      expect(defaults.operator).toBe('==')
      expect(defaults.leftOperand).toBe('true')
      expect(defaults.rightOperand).toBe('true')
    })

    it('should return default properties for signature-check', () => {
      const defaults = system.getDefaultProperties('signature-check')
      expect(defaults.publicKey).toBe('ownerPk')
      expect(defaults.message).toBe('default')
      expect(defaults.signatureType).toBe('standard')
    })
  })

  describe('isPropertyVisible', () => {
    it('should return true for properties without conditionals', () => {
      const visible = system.isPropertyVisible('input-box', 'value', {})
      expect(visible).toBe(true)
    })

    it('should return true when conditional is satisfied', () => {
      const visible = system.isPropertyVisible('output-box', 'customScript', { script: 'custom' })
      expect(visible).toBe(true)
    })

    it('should return false when conditional is not satisfied', () => {
      const visible = system.isPropertyVisible('output-box', 'customScript', { script: 'sigmaProp(true)' })
      expect(visible).toBe(false)
    })

    it('should handle threshold property conditional', () => {
      const visible = system.isPropertyVisible('signature-check', 'threshold', { signatureType: 'threshold' })
      expect(visible).toBe(true)

      const hidden = system.isPropertyVisible('signature-check', 'threshold', { signatureType: 'standard' })
      expect(hidden).toBe(false)
    })
  })

  describe('getPropertyOptions', () => {
    it('should return options for select properties', () => {
      const options = system.getPropertyOptions('guard-condition', 'operator')
      expect(options.length).toBeGreaterThan(0)
      expect(options.some(opt => opt.value === '==')).toBe(true)
      expect(options.some(opt => opt.value === '>')).toBe(true)
    })

    it('should return empty array for properties without options', () => {
      const options = system.getPropertyOptions('input-box', 'value')
      expect(options).toEqual([])
    })
  })
})

describe('Helper functions', () => {
  describe('validateAllComponents', () => {
    it('should validate multiple components', () => {
      const components: ContractComponent[] = [
        {
          id: 'comp1',
          type: 'input-box',
          label: 'Input',
          description: 'Input box',
          position: { x: 0, y: 0 },
          properties: { value: 1000000 }
        },
        {
          id: 'comp2',
          type: 'signature-check',
          label: 'Signature',
          description: 'Signature check',
          position: { x: 100, y: 0 },
          properties: {} // Missing required publicKey
        }
      ]

      const errors = validateAllComponents(components)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(error => error.componentId === 'comp2')).toBe(true)
    })

    it('should return empty array for valid components', () => {
      const components: ContractComponent[] = [
        {
          id: 'comp1',
          type: 'input-box',
          label: 'Input',
          description: 'Input box',
          position: { x: 0, y: 0 },
          properties: { value: 1000000 }
        }
      ]

      const errors = validateAllComponents(components)
      expect(errors).toHaveLength(0)
    })
  })

  describe('getComponentDefaults', () => {
    it('should return defaults for component type', () => {
      const defaults = getComponentDefaults('input-box')
      expect(defaults.value).toBe(1000000)
    })
  })

  describe('isPropertyRequired', () => {
    it('should return true for required properties', () => {
      const required = isPropertyRequired('input-box', 'value')
      expect(required).toBe(true)
    })

    it('should return false for non-required properties', () => {
      const required = isPropertyRequired('signature-check', 'message')
      expect(required).toBe(false)
    })

    it('should return false for non-existent properties', () => {
      const required = isPropertyRequired('input-box', 'nonexistent')
      expect(required).toBe(false)
    })
  })

  describe('getPropertyType', () => {
    it('should return correct property type', () => {
      const type = getPropertyType('input-box', 'value')
      expect(type).toBe('number')
    })

    it('should return string as default type', () => {
      const type = getPropertyType('input-box', 'nonexistent')
      expect(type).toBe('string')
    })
  })
})

describe('Property schema edge cases', () => {
  const system = new ComponentPropertySystem()

  it('should handle custom-logic component validation', () => {
    const component: ContractComponent = {
      id: 'custom1',
      type: 'custom-logic',
      label: 'Custom Logic',
      description: 'Custom logic component',
      position: { x: 0, y: 0 },
      properties: {
        code: '', // Empty code should fail validation
        returnType: 'SigmaProp'
      }
    }

    const errors = system.validateComponent(component)
    expect(errors.some(error => error.message.includes('cannot be empty'))).toBe(true)
  })

  it('should handle token-operation validation with decimals', () => {
    const component: ContractComponent = {
      id: 'token1',
      type: 'token-operation',
      label: 'Token Operation',
      description: 'Token operation component',
      position: { x: 0, y: 0 },
      properties: {
        tokenId: 'a'.repeat(64),
        amount: 100,
        operation: 'mint' // This makes decimals visible
        // decimals property will be validated if visible
      }
    }

    const errors = system.validateComponent(component)
    // Should validate successfully with proper token ID and mint operation
    expect(errors.filter(e => e.severity === 'error')).toHaveLength(0)
  })

  it('should handle register-access with encoding conditional', () => {
    const component: ContractComponent = {
      id: 'register1',
      type: 'register-access',
      label: 'Register Access',
      description: 'Register access component',
      position: { x: 0, y: 0 },
      properties: {
        register: 'R4',
        dataType: 'Coll[Byte]', // This makes encoding visible
        encoding: 'utf8'
      }
    }

    const errors = system.validateComponent(component)
    expect(errors.filter(e => e.severity === 'error')).toHaveLength(0)
  })
})